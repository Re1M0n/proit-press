import AppError from "../../errors/AppError";
import { telegramApi } from "../../libs/telegram";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";

const DeleteTelegramMessageService = async (
  messageId: string
): Promise<Message> => {
  const message = await Message.findByPk(messageId, {
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: [
          "contact",
          {
            model: Whatsapp,
            as: "whatsapp"
          }
        ]
      }
    ]
  });

  if (!message) {
    throw new AppError("No message found with this ID.");
  }

  const whatsapp: any = message.ticket?.whatsapp;
  const token = whatsapp?.tokenTelegram;
  if (!token) {
    throw new AppError(
      "El canal de Telegram no tiene un token configurado."
    );
  }

  const chatId = message.ticket?.contact?.telegramId;
  if (!chatId) {
    throw new AppError("No se encontró el chat de Telegram para este mensaje.");
  }

  const tgMessageId = Number(String(message.id).replace(/^tg_/, ""));
  if (!tgMessageId) {
    throw new AppError("Este mensaje no es un mensaje de Telegram.");
  }

  const res = await telegramApi(token, "deleteMessage", {
    chat_id: chatId,
    message_id: tgMessageId
  });

  if (!res || !res.ok) {
    throw new AppError(
      `No se pudo borrar el mensaje en Telegram. ${
        res?.description ||
        "Solo se pueden borrar mensajes enviados por este bot y dentro de las 48 horas."
      }`
    );
  }

  await message.update({ isDeleted: true });

  return message;
};

export default DeleteTelegramMessageService;
