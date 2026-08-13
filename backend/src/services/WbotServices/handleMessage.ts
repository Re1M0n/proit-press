/* eslint-disable no-plusplus */
/* eslint-disable no-nested-ternary */
import * as Sentry from "@sentry/node";
import axios from "axios";
import {
  Contact as WbotContact,
  Message as WbotMessage
} from "whatsapp-web.js";

import Integration from "../../models/Integration";
import Settings from "../../models/Setting";
import Contact from "../../models/Contact";
import getProfilePicUrlSafe from "../../helpers/GetProfilePicUrlSafe";
import formatBody from "../../helpers/Mustache";
import { logger } from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { incrementMessageCount, incrementErrorCount, updateLastActivity } from "./HealthCheckService";
import { getSafeChat, getSafeContact, isValidMsg, Session, verifyContact } from "./MessageUtils";
import { processMultiVCard, processVCard } from "./processVCard";
import { verifyMediaMessage } from "./verifyMediaMessage";
import { verifyMessage } from "./verifyMessage";
import { verifyQueue } from "./verifyQueue";

const handleMessage = async (
  msg: WbotMessage,
  wbot: Session
): Promise<void> => {

  try {
    if (wbot.id) {
      incrementMessageCount(wbot.id);
      updateLastActivity(wbot.id);
    }
    

    // if (msg.type === 'poll_creation' || (msg as any).pollName) {
    //   logger.info(`[MSG_IGNORADA] Mensagem de enquete ignorada (processada pelo SendPollService): ID=${msg.id?.id || 'unknown'}`);
    //   return;
    // }
    
    if (!isValidMsg(msg)) {
      return;
    }
  } catch (err) {
    logger.error(`[MSG_ERRO_LOG] Erro ao registrar logs iniciais: ${err}`);
    if (wbot.id) {
      incrementErrorCount(wbot.id);
    }
  }

  const Integrationdb = await Integration.findOne({
    where: { key: "urlApiN8N" }
  });

  if (Integrationdb?.value) {

const chat = await getSafeChat(wbot, msg);
    let groupContact;
    let baseContact: WbotContact;
    
    if (chat.isGroup) {
      baseContact = msg.fromMe
        ? await getSafeContact(wbot, msg, msg.to)
        : await getSafeContact(wbot, msg, msg.from);
      const msgGroupContact = msg.fromMe
        ? await getSafeContact(wbot, msg, msg.to)
        : await getSafeContact(wbot, msg, msg.from);
      groupContact = await verifyContact(msgGroupContact);
    } else {
      baseContact = await getSafeContact(wbot, msg);
    }
    
    const contact = await verifyContact(baseContact, wbot.id!);
    
    const unreadMessages = msg.fromMe ? 0 : chat.unreadCount;
    
    const ticket = await FindOrCreateTicketService(
      contact,
      wbot.id!,
      unreadMessages,
      undefined,
      undefined,
      groupContact
    );
    
    const options = {
      method: "POST",
      url: Integrationdb?.value,
      headers: {
        "Content-Type": "application/json"
      },
      data: {
        message: msg,
        ticket: ticket
      }
    };
    
    axios(options).catch(error => {
      console.error("Erro ao enviar dados para o n8n:", error);
    });
  }

  const Settingdb = await Settings.findOne({
    where: { key: "CheckMsgIsGroup" }
  });
  if (Settingdb?.value === "enabled") {

const chat = await getSafeChat(wbot, msg);
    if (
      msg.type === "sticker" ||
      msg.type === "e2e_notification" ||
      msg.type === "notification_template" ||
      msg.from === "status@broadcast" ||
      // msg.author !== null ||
      chat.isGroup
    ) {
      return;
    }
  }

  try {    
    let msgContact: WbotContact;
    let groupContact: Contact | undefined;
    let userId;
    let queueId;


const chat = await getSafeChat(wbot, msg);

    if (msg.fromMe) {
      if (/\u200e/.test(msg.body[0])) return;


      if (
        !msg.hasMedia &&
        msg.type !== "location" &&
        msg.type !== "chat" &&
        msg.type !== "vcard"
        && msg.type !== "multi_vcard"
      )
        return;

      msgContact = await getSafeContact(wbot, msg, msg.to);
    } else {
      msgContact = await getSafeContact(wbot, msg);
    }

    if (chat.isGroup) {
      let msgGroupContact;

      if (msg.fromMe) {
        msgGroupContact = await getSafeContact(wbot, msg, msg.to);
      } else {
        msgGroupContact = await getSafeContact(wbot, msg, msg.from);
      }

      groupContact = await verifyContact(msgGroupContact);

      try {
        const fullJid = (chat as any)?.id?._serialized
          || (msgGroupContact as any)?.id?._serialized
          || `${msgGroupContact.id.user}@g.us`;
        const groupName = (chat as any)?.name || (chat as any)?.subject || groupContact.name;
        
        let profilePicUrl: string | undefined;
        let retries = 2;
        
        while (retries > 0) {
          profilePicUrl = await getProfilePicUrlSafe(wbot, fullJid);
          if (profilePicUrl) {
            logger.info(`[WBOT_LISTENER] Foto de grupo obtida: ${fullJid}`);
            break;
          }
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        const needsUpdate = 
          groupContact.name !== groupName ||
          (profilePicUrl && groupContact.profilePicUrl !== profilePicUrl);

        if (needsUpdate) {
          await groupContact.update({
            isGroup: true,
            name: groupName || groupContact.name,
            number: fullJid, 
            profilePicUrl: profilePicUrl || groupContact.profilePicUrl
          });

          logger.info(`[WBOT_LISTENER] Contato de grupo atualizado: ${fullJid}`);

          try {
            const { getIO } = require("../../libs/socket");
            const io = getIO();
            io.emit("contact", { action: "update", contact: groupContact });
          } catch (socketErr) {
            logger.warn(`[WBOT_LISTENER] Erro ao emitir socket: ${socketErr}`);
          }
        }
      } catch (enrichErr) {
        logger.warn(`Falha ao enriquecer contato de grupo: ${String(enrichErr)}`);
      }
    }
    const whatsapp = await ShowWhatsAppService(wbot.id!);

    const unreadMessages = msg.fromMe ? 0 : chat.unreadCount;

    const contact = await verifyContact(msgContact, wbot.id!);

    if (!msg.fromMe) {
      try {
        await contact.update({
          lastContactAt: new Date()
        });
        logger.info(`[WBOT_LISTENER] lastContactAt atualizado para contato ${contact.id}`);
      } catch (error) {
        logger.error(`[WBOT_LISTENER] Erro ao atualizar lastContactAt: ${error}`);
      }
    }

    let ticket = await FindOrCreateTicketService(
      contact,
      wbot.id!,
      unreadMessages,
      userId,
      queueId,
      groupContact
    );

    if (
      unreadMessages === 0 &&
      whatsapp.farewellMessage &&
      formatBody(whatsapp.farewellMessage, ticket) === msg.body
    )
      return;

    ticket = await FindOrCreateTicketService(
      contact,
      wbot.id!,
      unreadMessages,
      userId,
      queueId,
      groupContact
    );

    if (msg.hasMedia) {
      await verifyMediaMessage(msg, ticket, contact);
    } else {
      await verifyMessage(msg, ticket, contact);
    }
    const now = Math.floor(Date.now() / 1000);
    const msgAge = now - msg.timestamp;
    const greetingMaxAge = 300; // 5 minutos
    const isOldMessage = msgAge > greetingMaxAge;
    const backCommands = ["voltar", "menu", "inicio", "sair", "0", "#"];
    if (backCommands.includes(msg.body.toLowerCase().trim())) {

      await UpdateTicketService({
        ticketData: { queueId: null },
        ticketId: ticket.id
      });

      if(!isOldMessage) {
	await verifyQueue(wbot, msg, ticket, contact);
	} else {
	  logger.info(`[GREETING_IGNORADO] Mensagem antiga (backCommands). ID=${msg.id.id} age=${msgAge}s`);
	}
      return;
    }

    if (
      !ticket.queue &&
      !chat.isGroup &&
      !msg.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1
    ) {
      if (!isOldMessage) {
	await verifyQueue(wbot, msg, ticket, contact);
      } else {
	console.info(`[GREETING_IGNORADO] Mensagem antiga (autoQueue). ID=${msg.id.id} age=${msgAge}s`);
	}
    }

    if (msg.type === "vcard") {
      msg = await processVCard(msg, wbot.id!);
    }

    if (msg.type === "multi_vcard") {
      msg = await processMultiVCard(msg, wbot.id!);
    }

    let profilePicUrl;
    try {
      const jid =
        (msgContact as any)?.id?._serialized ||
        ((msgContact as any)?.id?.user
          ? `${(msgContact as any).id.user}@c.us`
          : undefined);
      if (jid) {
        profilePicUrl = await getProfilePicUrlSafe(wbot, jid);
      } else if (typeof msgContact.getProfilePicUrl === 'function') {
        profilePicUrl = await msgContact.getProfilePicUrl();
      }
    } catch (picErr) {
      logger.warn(`Não foi possível obter foto de perfil: ${String(picErr)}`);
    }
    
    const contactData = {
      name: msgContact.name || msgContact.pushname || msgContact.id.user,
      number: msgContact.id.user,
      profilePicUrl,
      isGroup: msgContact.isGroup
    };
    await CreateOrUpdateContactService(contactData);
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`[MSG_ERRO] Erro ao processar mensagem do WhatsApp. ID=${msg?.id?.id || 'unknown'}, Erro: ${err}`);
    
    logger.error(`[MSG_ERRO_DETALHES] Stack trace: ${err.stack || 'Sem stack trace'}`);
    
    try {
      logger.error(`[MSG_ERRO_CONTEXTO] Contexto da mensagem com erro: ${JSON.stringify({
        id: msg?.id?.id || 'unknown',
        fromMe: msg?.fromMe,
        from: msg?.from,
        to: msg?.to,
        body: msg?.body?.substring(0, 100) || 'Sem corpo',
        type: msg?.type,
        timestamp: msg?.timestamp,
        hasMedia: msg?.hasMedia
      })}`);
    } catch (logErr) {
      logger.error(`[MSG_ERRO_LOG] Erro ao tentar registrar detalhes do erro: ${logErr}`);
    }
  } finally {
    // sin log por mensaje (evita ruido en el log de pm2)
  }
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types

export { handleMessage };

