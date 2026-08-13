/* eslint-disable no-plusplus */
/* eslint-disable no-nested-ternary */
import axios from "axios";
import { Message as WbotMessage } from "whatsapp-web.js";

import Contact from "../../models/Contact";
import Integration from "../../models/Integration";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { verifyQuotedMessage } from "./MessageUtils";
import { buildMultiVCardBody } from "./processVCard";

const getGeocode = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  const apiKey = await Integration.findOne({
    where: { key: "apiMaps" }
  });

  const safeLatitude = encodeURIComponent(String(latitude).trim());
  const safeLongitude = encodeURIComponent(String(longitude).trim());
  
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${safeLatitude},${safeLongitude}&key=${encodeURIComponent(apiKey?.value || '')}`;

  try {
    const { data: body } = await axios.get(url);
    if (body && body.results && body.results.length > 0) {
      return body.results[0].formatted_address;
    }
    return `${latitude}, ${longitude}`;
  } catch (error) {
    console.error("Erro na requisição da API do Google Maps:", error);
    throw error;
  }
};

const prepareLocation = async (msg: WbotMessage): Promise<WbotMessage> => {
  const safeLatitude = encodeURIComponent(String(msg.location.latitude).trim());
  const safeLongitude = encodeURIComponent(String(msg.location.longitude).trim());
  
  const gmapsUrl = `https://maps.google.com/maps?q=${safeLatitude}%2C${safeLongitude}&z=17`;

  try {
    if (!msg.location || !msg.location.latitude || !msg.location.longitude) {
      throw new Error("Dados de localização incompletos");
    }
    const address = await getGeocode(
      Number(msg.location.latitude),
      Number(msg.location.longitude)
    );

    if (typeof msg.body !== 'string') {
      msg.body = '';
    }
    msg.body = `data:image/png;base64,${msg.body}|${gmapsUrl}`;
    msg.body += `|${
      address || `${msg.location.latitude}, ${msg.location.longitude}`
    }`;
  } catch (error) {
    console.error("Erro ao preparar a localização:", error);
    
    if (typeof msg.body !== 'string') {
      msg.body = '';
    }
    if (msg.location && msg.location.latitude && msg.location.longitude) {
      msg.body = `data:image/png;base64,${msg.body}|${gmapsUrl}|${msg.location.latitude}, ${msg.location.longitude}`;
    } else {
      msg.body = `data:image/png;base64,${msg.body}|${gmapsUrl}|Coordenadas não disponíveis`;
    }
  }

  return msg;
};

const verifyMessage = async (
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
) => {
  if (msg.type === "location") msg = await prepareLocation(msg);

  const quotedMsg = await verifyQuotedMessage(msg);
  
  let pollBody = msg.body;
  if (msg.type === "poll_creation" && (msg as any).pollName) {
    const poll = msg as any;
    const pollName = poll.pollName || "Enquete";
    const pollOptions = poll.pollOptions || [];
    
    pollBody = `📊 Enquete: ${pollName}\n\n`;
    pollBody += `Selecione uma ou mais opções:\n\n`;
    
    pollOptions.forEach((option: any, index: number) => {
      const optionName = option?.name || option?.localName || option;
      if (optionName && typeof optionName === 'string' && optionName.trim() !== '') {
        pollBody += `${index + 1}. ${optionName}\n`;
      }
    });
    
    logger.info(`[POLL_RECEIVED] Enquete recebida: ${pollName} com ${pollOptions.length} opções`);
  }
  
  const messageData = {
    id: msg.id.id,
    ticketId: ticket.id,
    contactId: msg.fromMe ? undefined : contact.id,
    body: pollBody,
    fromMe: msg.fromMe,
    mediaType: msg.type === "poll_creation" ? "poll" : msg.type,
    messageType: msg.type,
    read: msg.fromMe,
    quotedMsgId: quotedMsg?.id,
    remoteJid: (msg as any).id?.remote || (msg as any).id?._serialized?.split("_")[1] || null,
    userId: ticket.userId
  };

  if (msg.type === "multi_vcard") {
    const multiVCardBody = await buildMultiVCardBody(msg, ticket);
    if (multiVCardBody !== undefined) {
      messageData.body = multiVCardBody;
      msg.body = multiVCardBody;
    }
  }

  const existingMessage = await Message.findByPk(messageData.id);
  if (existingMessage) {
    const messageAge = Date.now() - new Date(existingMessage.createdAt).getTime();
    if (messageAge < 5000) {
      return;
    }
  }

  try {
    
await CreateMessageService({ messageData });

    
    const FormatLastMessage = require("../../helpers/FormatLastMessage").default;
    const formattedLastMessage = FormatLastMessage({
      body: messageData.body,
      mediaType: messageData.mediaType,
      mimetype: undefined,
      messageType: messageData.messageType,
      fromMe: msg.fromMe,
      filename: undefined
    });
    
    await ticket.update({ lastMessage: formattedLastMessage });
    await ticket.reload();
  } catch (error) {
    console.error("Erro ao salvar mensagem no banco de dados:", error);
    setTimeout(async () => {
      try {
        
await CreateMessageService({ messageData });

        
        const FormatLastMessage = require("../../helpers/FormatLastMessage").default;
        const formattedLastMessage = FormatLastMessage({
          body: messageData.body,
          mediaType: messageData.mediaType,
          mimetype: undefined,
          messageType: messageData.messageType,
          fromMe: msg.fromMe,
          filename: undefined
        });
        
        await ticket.update({ lastMessage: formattedLastMessage });
        await ticket.reload();
      } catch (retryError) {
        console.error("Erro ao salvar mensagem na segunda tentativa:", retryError);
      }
    }, 1000);
  }
};

export { verifyMessage };
