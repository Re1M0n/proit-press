import axios from "axios";
import fs from "fs";
import path from "path";
import { telegramApi } from "../../libs/telegram";
import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";

const TELEGRAM_API = "https://api.telegram.org";
const PUBLIC_DIR = path.resolve(__dirname, "..", "..", "..", "public");

const sanitize = (name: string): string =>
  name.replace(/[^\w.-]+/g, "_").substring(0, 80);

const downloadTelegramFile = async (
  token: string,
  fileId: string,
  fallbackName: string
): Promise<{ filename: string; mimetype: string } | null> => {
  try {
    const fileRes = await telegramApi(token, "getFile", { file_id: fileId });
    const file = fileRes?.result;
    if (!file || !file.file_path) {
      return null;
    }

    const url = `${TELEGRAM_API}/file/bot${token}/${file.file_path}`;
    const resp = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 60000
    });

    const ext = path.extname(file.file_path) || "";
    let filename = `${Date.now()}_${sanitize(
      fallbackName || path.basename(file.file_path)
    )}`;
    if (!path.extname(filename) && ext) {
      filename += ext;
    }

    fs.writeFileSync(path.join(PUBLIC_DIR, filename), Buffer.from(resp.data));

    const contentType =
      resp.headers["content-type"] || "application/octet-stream";
    return { filename, mimetype: contentType };
  } catch (err) {
    logger.error(
      `[Telegram] Error descargando archivo ${fileId}: ${(err as Error).message}`
    );
    return null;
  }
};

const findOrCreateContact = async (
  whatsapp: Whatsapp,
  telegramId: string,
  opts: { name?: string; isGroup?: boolean; pictureFileId?: string }
): Promise<Contact> => {
  const io = getIO();

  let profilePicUrl: string | undefined;
  if (opts.pictureFileId) {
    const pic = await downloadTelegramFile(
      whatsapp.tokenTelegram,
      opts.pictureFileId,
      "avatar.jpg"
    );
    profilePicUrl = pic?.filename;
  }

  let contact = await Contact.findOne({ where: { telegramId } });

  if (contact) {
    await contact.update({
      name: opts.name || contact.name,
      isGroup: !!opts.isGroup,
      profilePicUrl: profilePicUrl || contact.profilePicUrl
    });
    return contact;
  }

  contact = await Contact.create({
    name: opts.name || telegramId,
    telegramId,
    isGroup: !!opts.isGroup,
    profilePicUrl
  });

  io.emit("contact", { action: "create", contact });
  return contact;
};

interface TelegramUpdate {
  update_id: number;
  message?: any;
  edited_message?: any;
  channel_post?: any;
}

export const handleTelegramUpdate = async (
  session: { whatsappId: number; token: string },
  update: TelegramUpdate
): Promise<void> => {
  const message = update.message || update.edited_message || update.channel_post;
  if (!message || !message.chat) {
    return;
  }

  const whatsapp = await Whatsapp.findByPk(session.whatsappId);
  if (!whatsapp) {
    return;
  }

  const chat = message.chat;
  const chatId = String(chat.id);
  const isGroup =
    chat.type === "group" ||
    chat.type === "supergroup" ||
    chat.type === "channel";

  const from = message.from || {};
  const senderId = String(from.id || chat.id);
  const senderName =
    [from.first_name, from.last_name].filter(Boolean).join(" ") ||
    from.username ||
    senderId;

  // Avatar del chat (best effort).
  let avatarFileId: string | undefined;
  try {
    const chatRes = await telegramApi(session.token, "getChat", {
      chat_id: chatId
    });
    avatarFileId =
      chatRes?.result?.photo?.small_file_id ||
      chatRes?.result?.photo?.big_file_id;
  } catch (e) {
    /* ignorar */
  }

  let contact: Contact;
  let groupContact: Contact | undefined;

  if (isGroup) {
    groupContact = await findOrCreateContact(whatsapp, chatId, {
      name: chat.title || chatId,
      isGroup: true,
      pictureFileId: avatarFileId
    });
    contact = await findOrCreateContact(whatsapp, senderId, {
      name: senderName
    });
  } else {
    contact = await findOrCreateContact(whatsapp, chatId, {
      name: senderName,
      pictureFileId: avatarFileId
    });
  }

  const ticket = await FindOrCreateTicketService(
    contact,
    whatsapp.id,
    1,
    undefined,
    undefined,
    groupContact
  );

  // Texto / caption
  let body = message.text || message.caption || "";

  // Media
  let mediaType: string | undefined;
  let mimetype: string | undefined;
  let filename: string | undefined;
  let fileId: string | undefined;

  if (message.photo && message.photo.length > 0) {
    fileId = message.photo[message.photo.length - 1].file_id;
    mediaType = "image";
    filename = "photo.jpg";
  } else if (message.document) {
    fileId = message.document.file_id;
    mediaType = "document";
    mimetype = message.document.mime_type;
    filename = message.document.file_name || "document";
  } else if (message.audio) {
    fileId = message.audio.file_id;
    mediaType = "audio";
    mimetype = message.audio.mime_type;
    filename = message.audio.file_name || "audio";
  } else if (message.voice) {
    fileId = message.voice.file_id;
    mediaType = "audio";
    mimetype = message.voice.mime_type;
    filename = "voice";
  } else if (message.video) {
    fileId = message.video.file_id;
    mediaType = "video";
    mimetype = message.video.mime_type;
    filename = message.video.file_name || "video";
  } else if (message.video_note) {
    fileId = message.video_note.file_id;
    mediaType = "video";
    filename = "video_note";
  } else if (message.animation) {
    fileId = message.animation.file_id;
    mediaType = "video";
    mimetype = message.animation.mime_type;
    filename = message.animation.file_name || "animation";
  } else if (message.sticker) {
    fileId = message.sticker.file_id;
    mediaType = "image";
    filename = "sticker";
  }

  let mediaUrl: string | undefined;
  if (fileId) {
    const dl = await downloadTelegramFile(
      session.token,
      fileId,
      filename || "file"
    );
    if (dl) {
      mediaUrl = dl.filename;
      mimetype = mimetype || dl.mimetype;
      if (!body) {
        body = filename || dl.filename;
      }
    }
  }

  // Respuesta con cita en la app de Telegram (message.reply_to_message):
  // enlazar con el mensaje original (id tg_<message_id>). Si el original no
  // está en la BD (borrado o anterior al canal), se crea una fila mínima para
  // que la cita se muestre igual en el frontend.
  let quotedMsgId: string | undefined;
  if (message.reply_to_message && message.reply_to_message.message_id) {
    const quotedId = `tg_${message.reply_to_message.message_id}`;
    let quotedExists = await Message.findByPk(quotedId);
    if (!quotedExists) {
      try {
        const rtm = message.reply_to_message;
        let quotedBody = rtm.text || rtm.caption || "";
        if (!quotedBody) {
          if (rtm.photo) quotedBody = "[Foto]";
          else if (rtm.document) quotedBody = "[Documento]";
          else if (rtm.video) quotedBody = "[Video]";
          else if (rtm.voice || rtm.audio) quotedBody = "[Audio]";
          else quotedBody = "[Mensaje original]";
        }
        quotedExists = await Message.create({
          id: quotedId,
          ticketId: ticket.id,
          contactId: contact.id,
          body: quotedBody,
          fromMe: !!rtm.from?.is_bot,
          read: true,
          mediaType: "chat",
          userId: ticket.userId
        });
      } catch (e) {
        /* race o error al crear la fila de la cita */
      }
    }
    if (quotedExists) {
      quotedMsgId = quotedId;
    }
  }

  // Mensajes de servicio (miembro entró/salió, pin, etc.) sin texto ni media.
  if (!body && !mediaUrl) {
    return;
  }

  let newStatus = ticket.status;
  if (ticket.status === "closed") {
    newStatus = "pending";
  }
  await ticket.update({
    lastMessage: body || mediaUrl || "",
    status: newStatus
  });

  await CreateMessageService({
    messageData: {
      id: `tg_${message.message_id}`,
      ticketId: ticket.id,
      contactId: contact.id,
      body: body || "",
      fromMe: false,
      read: false,
      mediaUrl,
      mediaType,
      mimetype,
      filename: mediaUrl ? filename : undefined,
      quotedMsgId,
      userId: ticket.userId
    }
  });
};
