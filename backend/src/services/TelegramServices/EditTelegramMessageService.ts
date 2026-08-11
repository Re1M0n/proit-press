import AppError from "../../errors/AppError";
import { telegramApi } from "../../libs/telegram";
import Message from "../../models/Message";
import OldMessage from "../../models/OldMessage";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";

const EditTelegramMessageService = async (
  messageId: string,
  newBody: string
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

  if (!newBody || newBody.trim() === "") {
    throw new AppError("El nuevo texto de la mensaje no puede estar vacío.");
  }

  const whatsapp: any = message.ticket?.whatsapp;
  const token = whatsapp?.tokenTelegram;
  if (!token) {
    throw new AppError(
      "El canal de Telegram no tiene un token configurado."
    );
  }

  if (message.mediaType && message.mediaType !== "chat") {
    throw new AppError(
      "Solo se pueden editar mensajes de texto en Telegram, no media."
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

  const res = await telegramApi(token, "editMessageText", {
    chat_id: chatId,
    message_id: tgMessageId,
    text: newBody
  });

  if (!res || !res.ok) {
    throw new AppError(
      `No se pudo editar el mensaje en Telegram. ${
        res?.description ||
        "Verificá que el mensaje sea reciente y haya sido enviado por este bot."
      }`
    );
  }

  const oldBody = message.body;
  if (typeof oldBody === "string" && oldBody !== newBody) {
    const existingHistory = await OldMessage.findOne({
      where: {
        messageId: message.id,
        body: oldBody
      }
    });
    if (!existingHistory) {
      await OldMessage.create({
        messageId: message.id,
        body: oldBody
      });
    }
  }

  await message.update({ body: newBody, isEdited: true });

  return message;
};

export default EditTelegramMessageService;
