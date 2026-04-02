import { Message as WbotMessage, Chat } from "whatsapp-web.js";
import AppError from "../errors/AppError";
import Ticket from "../models/Ticket";
import GetTicketWbot from "./GetTicketWbot";

export const GetWbotMessage = async (
  ticket: Ticket,
  messageId: string
): Promise<WbotMessage> => {
  const wbot = await GetTicketWbot(ticket);

  if (!ticket.contact.number) {
    console.error("Número del contacto no encontrado en el ticket:", ticket.id);
    throw new AppError("ERR_INVALID_CONTACT_NUMBER");
  }

  let chatId = ticket.contact.number;
  if (!chatId.includes("@")) {
    chatId = `${chatId}@${ticket.isGroup ? "g" : "c"}.us`;
  }

  let wbotChat: Chat;
  try {
    wbotChat = await wbot.getChatById(chatId);
    
    if (!wbotChat) {
      console.error(`[GetWbotMessage] Chat no encontrado: ${chatId}`);
      throw new Error("Chat no encontrado");
    }
  } catch (getChatError: any) {
    console.error(`[GetWbotMessage] Error al buscar chat ${chatId}:`, getChatError.message);
    
    try {
      const directMessage = await wbot.getMessageById(messageId);
      
      if (directMessage) {
        return directMessage;
      }
    } catch (directError: any) {
      console.error(`[GetWbotMessage] Fallo al buscar mensaje directamente:`, directError.message);
    }
    
    throw new AppError("ERR_CHAT_NOT_FOUND");
  }

  let limit = ticket.isGroup ? 50 : 20;
  const maxLimit = ticket.isGroup ? 300 : 100;

  const fetchWbotMessagesGradually = async (): Promise<void | WbotMessage> => {
    try {
      const chatMessages = await wbotChat.fetchMessages({ limit });

      const msgFound = chatMessages.find((msg: WbotMessage) => msg.id.id === messageId);

      if (!msgFound && limit < maxLimit) {
        limit += ticket.isGroup ? 50 : 20;
        return fetchWbotMessagesGradually();
      }

      return msgFound;
    } catch (fetchError) {
      console.error("[GetWbotMessage] Error al buscar mensajes del chat:", fetchError);
      return undefined;
    }
  };

  try {
    const msgFound = await fetchWbotMessagesGradually();

    if (!msgFound) {
      const errorMsg = ticket.isGroup
        ? `No fue posible encontrar el mensaje en los últimos ${maxLimit} mensajes del grupo`
        : `No fue posible encontrar el mensaje en los últimos ${maxLimit} mensajes`;

      console.error(`[GetWbotMessage] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    return msgFound;
  } catch (err) {
    console.error("[GetWbotMessage] Error final:", err);
    throw new AppError("ERR_FETCH_WAPP_MSG");
  }
};

export default GetWbotMessage;