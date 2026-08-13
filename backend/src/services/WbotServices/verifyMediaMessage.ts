/* eslint-disable no-plusplus */
import * as Sentry from "@sentry/node";
import { writeFile } from "fs";
import { join } from "path";
import { promisify } from "util";
import { Message as WbotMessage } from "whatsapp-web.js";
import ffmpeg from "fluent-ffmpeg";

import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { verifyQuotedMessage } from "./MessageUtils";

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");

const writeFileAsync = promisify(writeFile);

const verifyMediaMessage = async (
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
): Promise<Message> => {
  const quotedMsg = await verifyQuotedMessage(msg);

let media: import("whatsapp-web.js").MessageMedia;

try {


const downloaded = await msg.downloadMedia();

  if (!downloaded) {
    throw new Error("DOWNLOAD_MEDIA_UNDEFINED");
  }

  media = downloaded;
} catch (err) {
  console.error("[MEDIA] Error al descargar media:", err);
  throw err;
}

  if (!media.filename) {
    const ext = media.mimetype.split("/")[1].split(";")[0];
    const shortTime = new Date().getTime().toString().slice(-6);
    const sanitizedName = contact.name.replace(/[^a-zA-Z0-9_]/g, "_");
    media.filename = `${sanitizedName}_${shortTime}.${ext}`;
  } else {
    const originalFilename = media.filename ? `-${media.filename}` : "";
    const shortTime = new Date().getTime().toString().slice(-6);
    media.filename = `${shortTime}_${originalFilename}`;
  }

  try {
    await writeFileAsync(
      join(__dirname, "..", "..", "..", "public", media.filename),
      media.data,
      "base64"
    )
      .then(() => {
        const inputFile = `./public/${media.filename}`;
        let outputFile: string;

        if (inputFile.endsWith(".mpeg")) {
          outputFile = inputFile.replace(".mpeg", ".mp3");
        } else if (inputFile.endsWith(".ogg")) {
          outputFile = inputFile.replace(".ogg", ".mp3");
        } else {
          return;
        }

        return new Promise<void>((resolve, reject) => {
          ffmpeg(inputFile)
            .toFormat("mp3")
            .save(outputFile)
            .on("end", () => {
              resolve();
            })
            .on("error", (err: any) => {
              reject(err);
            });
        });
      })
      .then(() => {
        console.info("Conversão concluída!");
      })
      .catch(err => {
        console.error("Ocorreu um erro:", err);
      });
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(err);
  }

  let albumId = null;
  const mediaType = media.mimetype.split("/")[0];
  if (mediaType === "image" || mediaType === "video") {
    const roundedTimestamp = Math.floor(msg.timestamp / 5) * 5;
    albumId = `${msg.from}_${roundedTimestamp}`;
  }

  const fileSize = media.data ? Buffer.from(media.data, 'base64').length : null;

  const messageData = {
    id: msg.id.id,
    ticketId: ticket.id,
    contactId: msg.fromMe ? undefined : contact.id,
    body: msg.body || media.filename,
    fromMe: msg.fromMe,
    read: msg.fromMe,
    mediaUrl: media.filename,
    mediaType: mediaType,
    mimetype: media.mimetype,
    filename: media.filename,
    quotedMsgId: quotedMsg?.id,
    albumId: albumId,
    remoteJid: (msg as any).id?.remote || (msg as any).id?._serialized?.split("_")[1] || null,
    userId: ticket.userId,
    fileSize: fileSize
  };
  
  const existingMessage = await Message.findByPk(messageData.id);
  if (existingMessage) {
    const messageAge = Date.now() - new Date(existingMessage.createdAt).getTime();
    if (messageAge < 5000) {
      return existingMessage;
    }
  }
  
  try {
      const newMessage = await CreateMessageService({ messageData });

    
    const FormatLastMessage = require("../../helpers/FormatLastMessage").default;
    const formattedLastMessage = FormatLastMessage({
      body: messageData.body,
      mediaType: messageData.mediaType,
      mimetype: media.mimetype,
      messageType: msg.type,
      fromMe: msg.fromMe,
      filename: media.filename
    });
    
    await ticket.update({ lastMessage: formattedLastMessage });
    await ticket.reload();
    
    return newMessage;
  } catch (error) {
    console.error("Erro ao salvar mensagem com mídia no banco de dados:", error);
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
      const newMessage = await CreateMessageService({ messageData });

          
          const FormatLastMessage = require("../../helpers/FormatLastMessage").default;
          const formattedLastMessage = FormatLastMessage({
            body: messageData.body,
            mediaType: messageData.mediaType,
            mimetype: media.mimetype,
            messageType: msg.type,
            fromMe: msg.fromMe,
            filename: media.filename
          });
          
          await ticket.update({ lastMessage: formattedLastMessage });
          await ticket.reload();
          
          resolve(newMessage);
        } catch (retryError) {
          console.error("Erro ao salvar mensagem com mídia na segunda tentativa:", retryError);
          reject(retryError);
        }
      }, 1000);
    });
  }
};


export { verifyMediaMessage };

