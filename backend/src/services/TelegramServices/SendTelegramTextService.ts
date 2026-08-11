import AppError from "../../errors/AppError";
import formatBody from "../../helpers/Mustache";
import { telegramApi } from "../../libs/telegram";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";

interface Request {
  body: string;
  ticket: Ticket;
}

const SendTelegramTextService = async ({
  body,
  ticket
}: Request): Promise<any> => {
  const whatsapp: any = ticket.whatsapp;
  const token = whatsapp?.tokenTelegram;
  if (!token) {
    throw new AppError(
      "El canal de Telegram no tiene un token configurado. Editá el canal y cargá el token del bot."
    );
  }

  const chatId = ticket.contact?.telegramId;
  if (!chatId) {
    throw new AppError(
      "No se encontró el chat de Telegram para este contacto."
    );
  }

  const res = await telegramApi(token, "sendMessage", {
    chat_id: chatId,
    text: formatBody(body, ticket)
  });

  if (!res || !res.ok || !res.result) {
    throw new AppError(
      `No se pudo enviar el mensaje por Telegram: ${
        res?.description || "error desconocido"
      }`
    );
  }

  const messageId = `tg_${res.result.message_id}`;

  try {
    await CreateMessageService({
      messageData: {
        id: messageId,
        ticketId: ticket.id,
        body,
        fromMe: true,
        mediaType: "chat",
        read: true,
        userId: ticket.userId
      }
    });
  } catch (err) {
    console.error("Error al guardar mensaje de Telegram en la base:", err);
  }

  return { id: { id: messageId } };
};

export default SendTelegramTextService;
