import { Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";

import formatBody from "../../helpers/Mustache";

async function findMessageDirectlyFromWA(wbot: any, ticket: Ticket, quotedMsgId: string): Promise<any | null> {
  try {
    const groupId = ticket.contact.number.includes("@")
      ? ticket.contact.number
      : `${ticket.contact.number}@g.us`;
    const chat = await wbot.getChatById(groupId);

    const messages = await chat.fetchMessages({ limit: 500 });

    const foundMsg = messages.find((m: any) => m.id.id === quotedMsgId);

    if (foundMsg) {
      return foundMsg;
    }

    return null;
  } catch (error) {
    console.error(`Erro ao buscar mensagem diretamente do WhatsApp: ${error}`);
    return null;
  }
}

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  mentions?: string[];
}

const updateTicketLastMessage = async (
  ticket: Ticket,
  body: string
): Promise<void> => {
  try {
    await ticket.update({ lastMessage: body });
    await ticket.reload();
  } catch (err) {
    logger.warn(
      `Message sent, but ticket ${ticket.id} lastMessage could not be updated: ${err}`
    );
  }
};

// Cuando wwebjs resuelve sendMessage sin id (el mensaje igual sale: la sesión
// actual de WhatsApp Web devuelve undefined), se recupera el id real desde el
// chat para poder guardar el mensaje con su quote y devolver un id válido.
const recoverSentMessageId = async (
  wbot: any,
  chatId: string,
  payload: string,
  sentMessage: any
): Promise<any> => {
  const chatIds = [chatId];
  if (chatId.endsWith("@c.us")) {
    chatIds.push(chatId.replace("@c.us", "@lid"));
  } else if (chatId.endsWith("@lid")) {
    chatIds.push(chatId.replace("@lid", "@c.us"));
  }

  for (const cid of chatIds) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const chat = await wbot.getChatById(cid);
      const messages = await chat.fetchMessages({ limit: 5 });
      const match = messages.find(
        (m: any) => m.fromMe && m.body === payload
      );
      if (match) {
        return match;
      }
    } catch (err) {
      logger.warn(
        `[SEND_RECOVER] No se pudo recuperar el id del mensaje (${cid}): ${
          (err as Error)?.message || err
        }`
      );
    }
  }
  return sentMessage;
};

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg,
  mentions
}: Request): Promise<WbotMessage> => {
  const wbot = await GetTicketWbot(ticket);
  const groupId = ticket.contact.number.includes("@")
    ? ticket.contact.number
    : `${ticket.contact.number}@g.us`;
  const userId = ticket.contact.number.includes("@")
    ? ticket.contact.number
    : `${ticket.contact.number}@c.us`;

  if (quotedMsg && ticket.isGroup) {
    const originalMessage = await findMessageDirectlyFromWA(wbot, ticket, quotedMsg.id);

    if (originalMessage) {
      try {
        try {
          const chat = await wbot.getChatById(groupId);
          await chat.sendStateTyping();
          await new Promise(resolve => setTimeout(resolve, 400));
        } catch (e) {
        }
        const replyOptions: any = {};
        if (mentions && mentions.length > 0) {
          replyOptions.mentions = mentions;
        }
        const sentMessage = await originalMessage.reply(formatBody(body, ticket), undefined, replyOptions);

        await updateTicketLastMessage(ticket, body);
      return sentMessage;
      } catch (replyError) {
        console.error(`Erro ao usar reply nativo: ${replyError}`);

        try {
          try {
            const chat = await wbot.getChatById(groupId);
            await chat.sendStateTyping();
            await new Promise(resolve => setTimeout(resolve, 400));
          } catch (e) {}
          const payload = formatBody(body, ticket);
          let sentMessage: any;
          const sendOpts: any = { linkPreview: false, quotedMessageId: originalMessage.id._serialized };
          if (mentions && mentions.length > 0) {
            sendOpts.mentions = mentions;
          }
          try {
            sentMessage = await wbot.sendMessage(groupId, payload, sendOpts);
          } catch (e1) {
            await new Promise(r => setTimeout(r, 500));
            sentMessage = await wbot.sendMessage(groupId, payload, sendOpts);
          }

          await updateTicketLastMessage(ticket, body);
          return sentMessage;
        } catch (idError) {
          console.error(`Erro ao usar ID serializado diretamente: ${idError}`);
        }
      }
    }

    try {
      const chat = await wbot.getChatById(groupId);
      await chat.sendStateTyping();
      await new Promise(resolve => setTimeout(resolve, 400));
    } catch (e) {}
    const payload = formatBody(body, ticket);
    let sentMessage: any;
    const sendOpts: any = { linkPreview: false };
    if (mentions && mentions.length > 0) {
      sendOpts.mentions = mentions;
    }
    try {
      sentMessage = await wbot.sendMessage(groupId, payload, sendOpts);
    } catch (e1) {
      await new Promise(r => setTimeout(r, 500));
      sentMessage = await wbot.sendMessage(groupId, payload, sendOpts);
    }

    await updateTicketLastMessage(ticket, body);
    return sentMessage;
  }
  
  if (ticket.isGroup) {
    try {
      try {
        const chat = await wbot.getChatById(groupId);
        await chat.sendStateTyping();
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (e) {}
      const payload = formatBody(body, ticket);
      let sentMessage: any;
      const sendOpts: any = { linkPreview: false };
      if (mentions && mentions.length > 0) {
        sendOpts.mentions = mentions;
      }
      try {
        sentMessage = await wbot.sendMessage(groupId, payload, sendOpts);
      } catch (e1) {
        await new Promise(r => setTimeout(r, 500));
        sentMessage = await wbot.sendMessage(groupId, payload, sendOpts);
      }

      await updateTicketLastMessage(ticket, body);

      if (!sentMessage?.id?.id) {
        sentMessage = await recoverSentMessageId(
          wbot,
          groupId,
          payload,
          sentMessage
        );
      }

      if (!sentMessage?.id?.id) {
        logger.warn(
          `Message was sent, but WhatsApp returned no message id for ticket ${ticket.id}`
        );
        return sentMessage;
      }
      
      const messageData = {
        id: sentMessage.id.id,
        ticketId: ticket.id,
        contactId: undefined,
        body: body,
        fromMe: true,
        mediaType: "chat",
        read: true,
        quotedMsgId: quotedMsg?.id,
        remoteJid: (sentMessage as any).id?.remote || (sentMessage as any).id?._serialized?.split("_")[1] || null,
        userId: ticket.userId
      };

      const CreateMessageService = require("../MessageServices/CreateMessageService").default;
      
      try {
        await CreateMessageService({ messageData });
      } catch (err) {
        console.error("Erro ao salvar mensagem no banco de dados:", err);
      }
      
      return sentMessage;
    } catch (err) {
      console.error("Erro ao enviar mensagem para grupo:", err);
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  let quotedMsgSerializedId: string | undefined;

  if (quotedMsg) {
    try {
      // Usar el _serialized REAL del mensaje encontrado: el remote puede ser
      // @c.us, @lid, @s.whatsapp.net... Fabricarlo con SerializeWbotMsgId
      // (siempre @c.us) hace que WhatsApp descarte la cita en silencio.
      const originalMessage = await GetWbotMessage(ticket, quotedMsg.id);
      quotedMsgSerializedId = originalMessage.id._serialized;
    } catch (error) {
      console.error(`Erro ao buscar mensagem citada: ${error}`);
      throw new AppError("ERR_FETCH_WAPP_MSG");
    }
  }

  const sendOptions: {
    linkPreview: boolean;
    quotedMessageId?: string;
  } = {
    linkPreview: false
  };

  if (quotedMsgSerializedId) {
    sendOptions.quotedMessageId = quotedMsgSerializedId;
  }

  try {
    const payload = formatBody(body, ticket);
    let sentMessage: any;
    let lidError = false;

    const preFn = new Function('pnId', 'lidId', [
      'return (async function() {',
      '  var ids = [pnId, lidId];',
      '  for (var i = 0; i < ids.length; i++) {',
      '    try {',
      '      var wid = window.require("WAWebWidFactory").createWid(ids[i]);',
      '      var chatResult = await window.require("WAWebFindChatAction").findOrCreateLatestChat(wid);',
      '      var chat = chatResult && chatResult.chat ? chatResult.chat : chatResult;',
      '      if (chat) { await window.require("WAWebCmd").Cmd.openChatBottom({ chat: chat }); break; }',
      '    } catch(_) {}',
      '  }',
      '})();'
    ].join('\n'));

    const lidUserId = `${ticket.contact.number}@lid`;

    try {
      await (wbot as any).pupPage.evaluate(preFn, userId, lidUserId);
      await new Promise(r => setTimeout(r, 2000));
    } catch (_) {}

    try {
      sentMessage = await wbot.sendMessage(userId, payload, sendOptions);
    } catch (e: any) {
      lidError = e?.message?.includes("No LID for user") || String(e).includes("No LID for user");
      if (!lidError) throw e;
    }

    if (lidError) {
      console.warn(`[LID_FALLBACK] Tentando com WID @lid: ${lidUserId}`);
      sentMessage = await wbot.sendMessage(lidUserId, payload, sendOptions);
    }

    await updateTicketLastMessage(ticket, body);

    if (!sentMessage?.id?.id) {
      sentMessage = await recoverSentMessageId(
        wbot,
        userId,
        payload,
        sentMessage
      );
    }

    if (!sentMessage?.id?.id) {
      logger.warn(
        `Message was sent, but WhatsApp returned no message id for ticket ${ticket.id}`
      );
      return sentMessage;
    }
    
    const messageData = {
      id: sentMessage.id.id,
      ticketId: ticket.id,
      contactId: undefined,
      body: body,
      fromMe: true,
      mediaType: "chat",
      read: true,
      quotedMsgId: quotedMsg?.id,
      remoteJid: (sentMessage as any).id?.remote || (sentMessage as any).id?._serialized?.split("_")[1] || null,
      userId: ticket.userId
    };

    const CreateMessageService = require("../MessageServices/CreateMessageService").default;
    
    try {
      await CreateMessageService({ messageData });
    } catch (err) {
      console.error("Erro ao salvar mensagem no banco de dados:", err);
    }
    
    return sentMessage;
} catch (err: any) {

  console.error("======================================");
  console.error("[SEND ERROR]");
  console.error(err);
  console.error(err?.message);
  console.error(err?.stack);
  console.error("======================================");

  throw new AppError("ERR_SENDING_WAPP_MSG");
}
};

export default SendWhatsAppMessage;
