import fs from "fs";
import path from "path";
import AppError from "../../errors/AppError";
import { telegramApi } from "../../libs/telegram";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require("form-data") as any;

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

const SendTelegramMediaService = async ({
  media,
  ticket,
  body
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

  const filePath = media.path;
  if (!filePath || !fs.existsSync(filePath)) {
    throw new AppError("No se encontró el archivo de media para enviar.");
  }

  const mimeType = media.mimetype || "application/octet-stream";
  const type = mimeType.split("/")[0];
  const ext = path.extname(media.originalname || media.filename || "");

  let method = "sendDocument";
  let field = "document";
  if (type === "image") {
    method = "sendPhoto";
    field = "photo";
  } else if (type === "video") {
    method = "sendVideo";
    field = "video";
  } else if (type === "audio") {
    method = "sendAudio";
    field = "audio";
  }

  const form = new FormData();
  form.append("chat_id", chatId);
  if (body && body.trim() !== "") {
    form.append("caption", body);
  }
  const originalFilename = media.originalname || `media${ext || ""}`;
  form.append(field, fs.createReadStream(filePath), {
    filename: originalFilename,
    contentType: mimeType
  });

  const res = await telegramApi(token, method, undefined, form);

  if (!res || !res.ok || !res.result) {
    throw new AppError(
      `No se pudo enviar la media por Telegram: ${
        res?.description || "error desconocido"
      }`
    );
  }

  const messageId = `tg_${res.result.message_id}`;
  // El archivo ya está en /public (multer diskStorage) con nombre único.
  const mediaUrl = path.basename(filePath);

  let fileSize: number | null = null;
  try {
    fileSize = fs.statSync(filePath).size;
  } catch (e) {
    /* ignorar */
  }

  try {
    await CreateMessageService({
      messageData: {
        id: messageId,
        ticketId: ticket.id,
        body: body || originalFilename,
        fromMe: true,
        mediaType: type === "document" ? "document" : type,
        mediaUrl,
        mimetype: mimeType,
        read: true,
        userId: ticket.userId,
        fileSize
      }
    });
  } catch (err) {
    console.error("Error al guardar media de Telegram en la base:", err);
  }

  return { id: { id: messageId } };
};

export default SendTelegramMediaService;
