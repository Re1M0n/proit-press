import { startTelegramSession } from "../../libs/telegram";
import { isSessionReady, removeWbot } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";

// Cuánto esperamos a que una sesión alcance READY antes de considerarla colgada.
const READY_TIMEOUT_MS = 45000;
// Reintentos por sesión durante el arranque.
const MAX_ATTEMPTS = 3;
// Espera entre reintentos.
const RETRY_BACKOFF_MS = 3000;
// Pausa entre una sesión y la siguiente: levantar varias instancias de Chromium
// a la vez provoca contención y algunas sesiones se traban antes del READY.
const STAGGER_MS = 2000;
// Frecuencia de sondeo del estado de la sesión.
const POLL_INTERVAL_MS = 2000;

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

type SessionOutcome = "connected" | "qrcode" | "disconnected" | "timeout";

// Espera hasta que la sesión llegue a READY, o hasta detectar que quedó en un
// estado que requiere intervención manual (QR) o que ya se desconectó.
const waitForSessionOutcome = async (
  whatsappId: number,
  timeoutMs: number
): Promise<SessionOutcome> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (isSessionReady(whatsappId)) {
      return "connected";
    }

    const whatsapp = await Whatsapp.findByPk(whatsappId, {
      attributes: ["id", "status"]
    });

    if (!whatsapp) {
      return "disconnected";
    }

    if (whatsapp.status === "qrcode") {
      return "qrcode";
    }

    if (whatsapp.status === "DISCONNECTED") {
      return "disconnected";
    }

    await delay(POLL_INTERVAL_MS);
  }

  return isSessionReady(whatsappId) ? "connected" : "timeout";
};

// Arranca una sesión y, si no alcanza READY dentro del timeout, destruye el
// cliente colgado (y su browser) y vuelve a intentarlo. Sin esto, una sesión
// que se traba antes del READY queda muerta hasta un reinicio manual.
const startWhatsAppSessionWithRetry = async (
  whatsapp: Whatsapp
): Promise<void> => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    logger.info(
      `[SESSION_START] Iniciando sesión ${whatsapp.name} (intento ${attempt}/${MAX_ATTEMPTS})`
    );

    void StartWhatsAppSession(whatsapp).catch((err: Error) => {
      logger.error(
        `[SESSION_START] ${whatsapp.name} falló al iniciar: ${err?.message || err}`
      );
    });

    const outcome = await waitForSessionOutcome(whatsapp.id, READY_TIMEOUT_MS);

    if (outcome === "connected") {
      logger.info(
        `[SESSION_START] ${whatsapp.name} CONNECTED (intento ${attempt})`
      );
      return;
    }

    // Requiere intervención manual (escanear QR) o terminó desconectada por
    // credenciales: reintentar no ayuda y podría disparar un QR indeseado.
    if (outcome === "qrcode" || outcome === "disconnected") {
      logger.warn(
        `[SESSION_START] ${whatsapp.name} quedó en "${outcome}"; no se reintenta automáticamente`
      );
      return;
    }

    // timeout: la sesión se trabó antes del READY. Destruimos su cliente (y su
    // browser) y volvemos a intentar.
    logger.warn(
      `[SESSION_START] ${whatsapp.name} no alcanzó READY en ${Math.round(
        READY_TIMEOUT_MS / 1000
      )}s; reintentando`
    );
    removeWbot(whatsapp.id);
    await delay(RETRY_BACKOFF_MS);
  }

  logger.error(
    `[SESSION_START] ${whatsapp.name} no alcanzó READY tras ${MAX_ATTEMPTS} intentos`
  );
};

export const StartAllWhatsAppsSessions = async (): Promise<void> => {
  const whatsapps = await ListWhatsAppsService();

  if (whatsapps.length === 0) {
    return;
  }

  const telegramSessions = whatsapps.filter(w => w.type === "telegram");
  const wwebjsSessions = whatsapps.filter(w => w.type === "wwebjs");

  // Telegram no compite por Chromium: puede arrancar en paralelo.
  telegramSessions.forEach(whatsapp => {
    if (whatsapp.status === "DISCONNECTED") {
      return;
    }
    startTelegramSession(whatsapp).catch((err: Error) => {
      logger.error(
        `[Telegram] Error iniciando sesión ${whatsapp.id}: ${err?.message}`
      );
    });
  });

  // wwebjs: arranque SECUENCIAL y con reintentos para garantizar el READY.
  for (const whatsapp of wwebjsSessions) {
    await startWhatsAppSessionWithRetry(whatsapp);
    await delay(STAGGER_MS);
  }
};
