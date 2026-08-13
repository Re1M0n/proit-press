/* eslint-disable no-plusplus */
/* eslint-disable no-nested-ternary */
import { Message as WbotMessage } from "whatsapp-web.js";

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { debounce } from "../../helpers/Debounce";
import formatBody from "../../helpers/Mustache";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { getSafeChat, Session } from "./MessageUtils";
import { verifyMessage } from "./verifyMessage";

let greetingCounts: { [contactId: string]: number } = {};
const greetingLimit = (5 * 2);
let resetGreetingCountTimeout: NodeJS.Timeout;

const resetGreetingCounts = () => {
  greetingCounts = {};
  console.info("Contadores de saudações resetados.");
};

const startGreetingCountResetTimer = () => {
  clearTimeout(resetGreetingCountTimeout);
  resetGreetingCountTimeout = setTimeout(resetGreetingCounts, 1800000); 
};


const verifyQueue = async (
  wbot: Session,
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
) => {

  // Si el usuario responde a un mensaje iniciado por un agente, no enviar greeting automático
  if (!msg.fromMe && ticket.lastMessage) {
    console.info(`[GREETING_SKIP] Ticket  ya tenía lastMessage, no se envía greeting.`);
    return;
  }

  const { queues, greetingMessage, isDisplay } = await ShowWhatsAppService(
    wbot.id!
  );

  const queueLengthSetting = await ListSettingsServiceOne({ key: "queueLength" });
  const queueLength = queueLengthSetting?.value;
  const queueValue = queueLength === "enabled" ? 0 : 1;

  if (queues.length === queueValue) {
    await UpdateTicketService({
      ticketData: { queueId: queues[0].id },
      ticketId: ticket.id
    });


const chat = await getSafeChat(wbot, msg);
    await chat.sendStateTyping();

    const body = formatBody(`\u200e${queues[0].greetingMessage}`, ticket);

    const sentMessage = await wbot.sendMessage(
      `${contact.number}@c.us`,
      body
    );

    await verifyMessage(sentMessage, ticket, contact);

    return;
  }

  const selectedOption = msg.body;

  const choosenQueue = queues[+selectedOption - 1];

  if (choosenQueue) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    const startWorkParts = choosenQueue.startWork.split(':');
    const startWorkHour = parseInt(startWorkParts[0], 10);
    const startWorkMinute = parseInt(startWorkParts[1], 10);
    const startWorkInMinutes = startWorkHour * 60 + startWorkMinute;
    
    const endWorkParts = choosenQueue.endWork.split(':');
    const endWorkHour = parseInt(endWorkParts[0], 10);
    const endWorkMinute = parseInt(endWorkParts[1], 10);
    const endWorkInMinutes = endWorkHour * 60 + endWorkMinute;
    
    let isBreakTime = false;
    if (choosenQueue.startBreak && choosenQueue.endBreak) {
      try {
        const startBreakParts = choosenQueue.startBreak.split(':');
        const startBreakHour = parseInt(startBreakParts[0], 10);
        const startBreakMinute = parseInt(startBreakParts[1], 10);
        const startBreakInMinutes = startBreakHour * 60 + startBreakMinute;
        
        const endBreakParts = choosenQueue.endBreak.split(':');
        const endBreakHour = parseInt(endBreakParts[0], 10);
        const endBreakMinute = parseInt(endBreakParts[1], 10);
        const endBreakInMinutes = endBreakHour * 60 + endBreakMinute;
        
        if (currentTimeInMinutes >= startBreakInMinutes && currentTimeInMinutes <= endBreakInMinutes) {
          isBreakTime = true;
        }
      } catch (error) {
        console.error('Erro ao processar horário de intervalo:', error);
        isBreakTime = false;
      }
    }
    const isOutsideWorkHours = currentTimeInMinutes < startWorkInMinutes || currentTimeInMinutes > endWorkInMinutes;
    
    if (isBreakTime || isOutsideWorkHours) {
    
      await UpdateTicketService({
        ticketData: { queueId: choosenQueue.id },
        ticketId: ticket.id
      });

  
const chat = await getSafeChat(wbot, msg);
      await chat.sendStateTyping();
      
      const messageToSend = isBreakTime && choosenQueue.breakMessage 
        ? choosenQueue.breakMessage 
        : choosenQueue.absenceMessage;
      
      const body = formatBody(`\u200e${messageToSend}\n\n*[ # ]* - Voltar ao Menu Principal`, ticket);
      const debouncedSentMessage = debounce(
        async () => {
          const sentMessage = await wbot.sendMessage(
            `${contact.number}@c.us`,
            body
          );
          verifyMessage(sentMessage, ticket, contact);
        },
        3000,
        ticket.id
      );

      debouncedSentMessage();
    } else {
      await UpdateTicketService({
        ticketData: { queueId: choosenQueue.id },
        ticketId: ticket.id
      });

  
const chat = await getSafeChat(wbot, msg);
      await chat.sendStateTyping();

      const body = formatBody(`\u200e${choosenQueue.greetingMessage}`, ticket);

      const debouncedSentMessage = debounce(
        async () => {
          const sentMessage = await wbot.sendMessage(
            `${contact.number}@c.us`,
            body
          );
          verifyMessage(sentMessage, ticket, contact);
        },
        3000,
        ticket.id
      );
      debouncedSentMessage();
    }
  } else {
    let options = "";

    const contactId = contact.id.toString();
    if (!greetingCounts[contactId]) {
      greetingCounts[contactId] = 0;
    }

    if (greetingCounts[contactId] < greetingLimit) {
  
const chat = await getSafeChat(wbot, msg);
      await chat.sendStateTyping();
      greetingCounts[contactId]++;
      console.info(`Contador de saudações para ${contactId}:`, greetingCounts[contactId]);
      startGreetingCountResetTimer();
    }

    queues.forEach((queue, index) => {
      if (queue.startWork && queue.endWork) {
        if (isDisplay) {
          options += `*${index + 1}* - ${queue.name} das ${queue.startWork
            } as ${queue.endWork}\n`;
        } else {
          options += `*${index + 1}* - ${queue.name}\n`;
        }
      } else {
        options += `*${index + 1}* - ${queue.name}\n`;
      }
    });

    if (queues.length >= 2) {
      if (greetingCounts[contactId] < greetingLimit) {
        const body = formatBody(`\u200e${greetingMessage}\n\n${options}`, ticket);

        const debouncedSentMessage = debounce(
          async () => {
            const sentMessage = await wbot.sendMessage(
              `${contact.number}@c.us`,
              body
            );
            verifyMessage(sentMessage, ticket, contact);
          },
          3000,
          ticket.id
        );

        debouncedSentMessage();
        greetingCounts[contactId]++;
        console.info(`Contador de saudações para ${contactId}:`, greetingCounts[contactId]);
        startGreetingCountResetTimer();
      } else {
        console.info(`Limite de saudações atingido para ${contactId}.`);
      }
    } else {
      await UpdateTicketService({
        ticketData: { queueId: queues[0].id },
        ticketId: ticket.id
      });

      const body = greetingMessage?.trim()
        ? formatBody(`\u200e${greetingMessage}`, ticket)
        : null;

      const body2 = queues[0].greetingMessage?.trim()
        ? formatBody(`\u200e${queues[0].greetingMessage}`, ticket)
        : null;

      const debouncedSentMessage = debounce(
        async () => {
          if (body) {
            const sentMessage = await wbot.sendMessage(
              `${contact.number}@c.us`,
              body
      );
      verifyMessage(sentMessage, ticket, contact);
          }
        },
        3000,
        ticket.id
      );

      debouncedSentMessage();

      setTimeout(() => {
        const debouncedSecondMessage = debounce(
          async () => {
            if (body2) {
               const sentMessage = await wbot.sendMessage(
                `${contact.number}@c.us`,
               body2
            );
            verifyMessage(sentMessage, ticket, contact);
            }
          },
          2000,
          ticket.id
        );

        debouncedSecondMessage();
      }, 5000);
    }

  }
};


export { verifyQueue };

