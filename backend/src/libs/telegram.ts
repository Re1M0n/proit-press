import axios from "axios";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import { logger } from "../utils/logger";
import { getIO } from "./socket";
import { handleTelegramUpdate } from "../services/TelegramServices/TelegramMessageListener";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require("form-data") as any;

const TELEGRAM_API = "https://api.telegram.org";

interface TelegramSession {
  whatsappId: number;
  token: string;
  stopped: boolean;
  offset: number;
}

const sessions = new Map<number, TelegramSession>();

/**
 * Llamada genérica a la Bot API de Telegram.
 * Si `form` viene, se envía como multipart/form-data (subida de archivos).
 */
export const telegramApi = async (
  token: string,
  method: string,
  params: Record<string, unknown> = {},
  form?: any
): Promise<any> => {
  if (form) {
    const { data } = await axios.post(
      `${TELEGRAM_API}/bot${token}/${method}`,
      form,
      {
        headers: form.getHeaders ? form.getHeaders() : undefined,
        timeout: 60000
      }
    );
    return data;
  }

  const { data } = await axios.post(
    `${TELEGRAM_API}/bot${token}/${method}`,
    params,
    { timeout: 60000 }
  );
  return data;
};

const poll = async (session: TelegramSession): Promise<void> => {
  if (session.stopped) {
    return;
  }

  try {
    const { data } = await axios.post(
      `${TELEGRAM_API}/bot${session.token}/getUpdates`,
      {
        timeout: 30,
        offset: session.offset,
        allowed_updates: ["message", "edited_message", "channel_post"]
      },
      { timeout: 90 * 1000 }
    );

    if (data && data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        session.offset = update.update_id + 1;
        try {
          await handleTelegramUpdate(session, update);
        } catch (err) {
          logger.error(
            `[Telegram] Error procesando update ${update.update_id} (sesión ${session.whatsappId}): ${
              (err as Error).message
            }`
          );
        }
      }
    }
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      logger.error(
        `[Telegram] Token inválido para la sesión ${session.whatsappId}, desconectando`
      );
      session.stopped = true;
      await Whatsapp.update(
        { status: "DISCONNECTED" },
        { where: { id: session.whatsappId } }
      ).catch(() => {});
      return;
    }
    logger.warn(
      `[Telegram] Error de polling en sesión ${session.whatsappId}: ${err?.message}`
    );
  } finally {
    if (!session.stopped) {
      setTimeout(() => poll(session), 1000);
    }
  }
};

export const startTelegramSession = async (
  whatsapp: Whatsapp
): Promise<void> => {
  const token = whatsapp.tokenTelegram;
  if (!token) {
    await whatsapp.update({ status: "DISCONNECTED" }).catch(() => {});
    throw new AppError(
      "No se encontró un token de bot de Telegram para este canal. Editá el canal y cargá el token de @BotFather."
    );
  }

  const existing = sessions.get(whatsapp.id);
  if (existing) {
    existing.stopped = true;
    sessions.delete(whatsapp.id);
  }

  const me = await telegramApi(token, "getMe").catch(() => null);
  if (!me || !me.ok || !me.result) {
    await whatsapp.update({ status: "DISCONNECTED" }).catch(() => {});
    throw new AppError(
      "El token de Telegram es inválido o fue revocado. Verificá el token del bot en @BotFather."
    );
  }

  const session: TelegramSession = {
    whatsappId: whatsapp.id,
    token,
    stopped: false,
    offset: 0
  };
  sessions.set(whatsapp.id, session);

  // Descartar el backlog de updates pendientes para no re-ingresar mensajes viejos.
  try {
    const res = await telegramApi(token, "getUpdates", { offset: -1 });
    if (res && res.ok && Array.isArray(res.result) && res.result.length > 0) {
      session.offset = res.result[res.result.length - 1].update_id + 1;
    }
  } catch (e) {
    /* ignorar */
  }

  await whatsapp.update({
    status: "CONNECTED",
    number: me.result.username || String(me.result.id || "")
  });

  const io = getIO();
  io.emit("whatsappSession", { action: "update", session: whatsapp });
  io.emit("whatsapp", { action: "update", whatsapp });

  setTimeout(() => poll(session), 500);
};

export const stopTelegramSession = (whatsappId: number): void => {
  const session = sessions.get(whatsappId);
  if (session) {
    session.stopped = true;
    sessions.delete(whatsappId);
  }
};

export const stopAllTelegramSessions = (): void => {
  for (const [, session] of sessions) {
    session.stopped = true;
  }
  sessions.clear();
};

export const getTelegramSession = (
  whatsappId: number
): TelegramSession | undefined => sessions.get(whatsappId);
