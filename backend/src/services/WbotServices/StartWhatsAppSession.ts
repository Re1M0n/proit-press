import {
  destroyAllWbots,
  getWbot,
  initWbot,
  isSessionReady,
  removeWbot,
  Session
} from "../../libs/wbot";
import { startTelegramSession } from "../../libs/telegram";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import { logger } from "../../utils/logger";
import GroupEventsService from "./GroupEventsService";
import { WbotSessionCoordinator } from "./WbotSessionCoordinator";

const coordinator = new WbotSessionCoordinator<Session>({
  getReady: whatsappId => {
    if (!isSessionReady(whatsappId)) {
      return undefined;
    }
    try {
      return getWbot(whatsappId);
    } catch {
      return undefined;
    }
  },
  stopClient: removeWbot,
  stopAllClients: destroyAllWbots
});

const emitOpening = async (whatsapp: Whatsapp): Promise<void> => {
  await whatsapp.update({ status: "OPENING" });
  getIO().emit("whatsappSession", {
    action: "update",
    session: whatsapp
  });
};

const createWbotSession = async (whatsapp: Whatsapp): Promise<Session> => {
  await emitOpening(whatsapp);

  try {
    // Desconexiones previas pueden dejar el Client registrado aunque ya no sea
    // reutilizable. Cerrarlo antes de volver a abrir el perfil LocalAuth.
    await removeWbot(whatsapp.id);

    const wbot = await initWbot(whatsapp);
    wbotMessageListener(wbot);
    wbotMonitor(
      wbot,
      whatsapp,
      () => {
        coordinator.scheduleReconnect(whatsapp.id, () => {
          coordinator
            .restart(whatsapp.id, () => createWbotSession(whatsapp))
            .catch(error => {
              logger.error(
                `[SESSION_START] Error reconectando sesión ${whatsapp.id}: ${
                  error?.message || error
                }`
              );
            });
        });
      },
      () => coordinator.markConnected(whatsapp.id)
    );
    wbot.once("ready", () => coordinator.markConnected(whatsapp.id));
    wbot.on("auth_failure", () => coordinator.markDisconnected(whatsapp.id));
    GroupEventsService.setupGroupListeners(wbot, whatsapp.id);

    if (isSessionReady(whatsapp.id)) {
      coordinator.markConnected(whatsapp.id);
    }

    return wbot;
  } catch (error) {
    await removeWbot(whatsapp.id);
    throw error;
  }
};

export async function StartWhatsAppSession(whatsapp: Whatsapp): Promise<void> {
  if (whatsapp.type === "telegram") {
    await emitOpening(whatsapp);
    await startTelegramSession(whatsapp);
    return;
  }

  try {
    await coordinator.start(whatsapp.id, () => createWbotSession(whatsapp));
  } catch (error) {
    logger.error(
      `[SESSION_START] Error iniciando sesión ${whatsapp.id}: ${
        (error as Error)?.message || error
      }`
    );
    throw error;
  }
}

export const RestartWhatsAppSession = async (
  whatsappId: number
): Promise<Session> => {
  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) {
    throw new Error("No se encontró la sesión de WhatsApp.");
  }
  if (whatsapp.type === "telegram") {
    throw new Error("Las sesiones de Telegram no usan Chromium.");
  }

  await coordinator.restart(whatsappId, () => createWbotSession(whatsapp));
  return coordinator.waitForReady(whatsappId);
};

export const StopWhatsAppSession = (
  whatsappId: number,
  beforeStop?: () => Promise<void>
): Promise<void> => coordinator.stop(whatsappId, beforeStop);

export const StopAllWhatsAppSessions = (): Promise<void> =>
  coordinator.stopAll();
