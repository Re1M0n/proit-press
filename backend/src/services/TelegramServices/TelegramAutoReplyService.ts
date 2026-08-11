import { startOfDay } from "date-fns";
import { Op } from "sequelize";
import { telegramApi } from "../../libs/telegram";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import CreateMessageService from "../MessageServices/CreateMessageService";

export const WELCOME_REPLY =
  "Bienvenida/o a professionalIT, por favor, describa su consulta y un técnico lo atenderá en breve";

// Saludos típicos de Argentina (mayúsculas incluidas: el texto se normaliza a
// minúsculas y sin acentos antes de comparar).
const GREETING_REGEXES: RegExp[] = [
  /\bbuen[oa]?s?\b/, // buen día, buenos días, buenas tardes/noches, bueno(s)
  /\bbdia\b/, // bdia
  /\bhol[ai]\b/, // hola, holi
  /\bconsultas?\b/, // consulta, consultas
  /\bque\s+tal\b/, // qué tal
  /\bque\s+haces\b/, // qué hacés
  /\bcomo\s+(estas|andas)\b/, // cómo estás, cómo andás
  /\bsaludos?\b/, // saludo, saludos
  /\bhey\b/,
  /\bey\b/,
  /\bhi\b/
];

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const isGreetingMessage = (body: string): boolean => {
  const text = normalizeText(body);
  if (!text) {
    return false;
  }
  return GREETING_REGEXES.some(regex => regex.test(text));
};

// "Primer mensaje del día": no hay ningún mensaje entrante de hoy (huso local
// del servidor) en este ticket antes del actual.
export const isFirstMessageOfDay = async (
  ticketId: number
): Promise<boolean> => {
  const count = await Message.count({
    where: {
      ticketId,
      fromMe: false,
      createdAt: { [Op.gte]: startOfDay(new Date()) }
    }
  });
  return count === 0;
};

export const shouldAutoReply = async (
  ticket: Ticket,
  body: string
): Promise<boolean> => {
  if (isGreetingMessage(body)) {
    return true;
  }
  return isFirstMessageOfDay(ticket.id);
};

interface Session {
  whatsappId: number;
  token: string;
}

export const sendWelcomeAutoReply = async (
  session: Session,
  ticket: Ticket,
  chatId: string
): Promise<void> => {
  try {
    const res = await telegramApi(session.token, "sendMessage", {
      chat_id: chatId,
      text: WELCOME_REPLY
    });

    if (res && res.ok && res.result) {
      await CreateMessageService({
        messageData: {
          id: `tg_${res.result.message_id}`,
          ticketId: ticket.id,
          body: WELCOME_REPLY,
          fromMe: true,
          mediaType: "chat",
          read: true,
          userId: ticket.userId
        }
      });
      logger.info(
        `[Telegram] Auto-respuesta de bienvenida enviada al chat ${chatId}`
      );
    } else {
      logger.warn(
        `[Telegram] Auto-respuesta falló: ${
          res?.description || "respuesta vacía"
        }`
      );
    }
  } catch (err) {
    logger.error(
      `[Telegram] Error en auto-respuesta: ${(err as Error).message}`
    );
  }
};
