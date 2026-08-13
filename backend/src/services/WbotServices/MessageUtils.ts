/* eslint-disable no-plusplus */
import * as Sentry from "@sentry/node";
import {
  Client,
  Contact as WbotContact,
  Message as WbotMessage
} from "whatsapp-web.js";

import Contact from "../../models/Contact";
import Message from "../../models/Message";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";

export interface Session extends Client {
  id?: number;
}

const verifyContact = async (
  msgContact: WbotContact,
  whatsappId?: number
): Promise<Contact> => {
  const contactData = {
    name: msgContact.name || msgContact.pushname || msgContact.id.user,
    number: msgContact.id.user,
    isGroup: msgContact.isGroup,
    whatsappId
  };

  const contact = await CreateOrUpdateContactService(contactData);

  return contact;
};


const verifyQuotedMessage = async (
  msg: WbotMessage
): Promise<Message | null> => {
  if (!msg.hasQuotedMsg) return null;

  const wbotQuotedMsg = await msg.getQuotedMessage();

  const quotedMsg = await Message.findOne({
    where: { id: wbotQuotedMsg.id.id }
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};


const verifyRevoked = async (msgBody?: string): Promise<void> => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  if (msgBody === undefined) {
    return;
  }

  try {
    const message = await Message.findOne({
      where: {
        body: msgBody
      }
    });

    if (!message) {
      return;
    }

    if (message) {
      await Message.update(
        { isDeleted: true },
        {
          where: { id: message.id }
        }
      );

      const msgIsDeleted = await Message.findOne({
        where: {
          body: msgBody
        }
      });

      if (!msgIsDeleted) {
        return;
      }

      io.to(msgIsDeleted.ticketId.toString())
        .to("notification")
        .emit("appMessage", {
          action: "update",
          message: msgIsDeleted
        });
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error Message Revoke. Err: ${err}`);
  }
};


const verifyRevokedById = async (messageId: string): Promise<void> => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  try {
    const message = await Message.findByPk(messageId);

    if (!message) {
      return;
    }

    await message.update({ isDeleted: true });

    io.to(message.ticketId.toString())
      .to("notification")
      .emit("appMessage", {
        action: "update",
        message
      });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error Message Revoke. Err: ${err}`);
  }
};


const isValidMsg = (msg: WbotMessage): boolean => {
  if (
    msg.from === "status@broadcast" ||
    msg.type === "notification_template" ||
    msg.type === "e2e_notification" ||
    msg.type === "notification" ||
    msg.type === "group_notification"
  ) {
    console.info("Mensagem recebida - tipo de notificação ou broadcast:", msg.type);
    return false;
  }

  const msgType = msg.type;
  if (
    msgType === "chat" ||
    msgType === "audio" ||
    msgType === "ptt" ||
    msgType === "video" ||
    msgType === "image" ||
    msgType === "document" ||
    msgType === "vcard" ||
    msgType === "multi_vcard" ||
    msgType === "sticker" ||
    msgType === "location" ||
    msgType === "poll_creation"
  ) {
    return true;
  }
  
  console.warn("Tipo de mensagem desconhecido:", msgType);
  return true;
};


const getSafeContact = async (
  wbot: Session,
  msg: WbotMessage,
  useRemoteJid?: string
): Promise<WbotContact> => {
  try {
    if (useRemoteJid) {
      return await wbot.getContactById(useRemoteJid);
    }
    
    if (msg.fromMe) {
      return await wbot.getContactById(msg.to);
    }
    
    return await msg.getContact();
  } catch (err) {
    logger.warn(`[FALLBACK] Usando contato alternativo devido a limitação da lib whatsapp-web.js: ${err.message || String(err)}`);
    const jid = useRemoteJid || (msg.fromMe ? msg.to : msg.from);
    const user = jid ? jid.split("@")[0] : "";
    const isGroup = jid?.endsWith("@g.us") || false;
    const fallbackContact: any = {
      id: { user, _serialized: jid },
      name: user,
      pushname: user,
      isGroup
    };
    return fallbackContact as WbotContact;
  }
};


const getSafeChat = async (wbot: Session, msg: WbotMessage): Promise<any> => {
  try {
    return await msg.getChat();
  } catch (err) {
    logger.warn("[FALLBACK] getChat falló: " + (err?.message || String(err)));
    return {
      sendStateTyping: async () => {}
    };
  }
};


export {
  verifyContact,
  verifyQuotedMessage,
  verifyRevoked,
  verifyRevokedById,
  isValidMsg,
  getSafeContact,
  getSafeChat
};

