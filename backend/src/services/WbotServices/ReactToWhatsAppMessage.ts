import { GetWbotMessage } from "../../helpers/GetWbotMessage";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

interface ReactParams {
  messageId: string;
  emoji: string;
}

const ReactToWhatsAppMessage = async ({
  messageId,
  emoji
}: ReactParams): Promise<{ ticketId: number }> => {
  const message = await Message.findByPk(messageId);
  if (!message) {
    throw new Error("Message not found");
  }

  const ticket = await Ticket.findByPk(message.ticketId, {
    include: ["user", "whatsapp", "contact"]
  });
  if (!ticket) {
    throw new Error("Ticket not found for message");
  }

  // El lookup de GetWbotMessage prueba todas las combinaciones de remote
  // (c.us / s.whatsapp.net / lid) usando el remoteJid real guardado en el
  // mensaje, igual que en las citas. El ID fabricado a mano que usaba este
  // servicio ("Invalid serialized message id") no servía después de la
  // migración a LID de WhatsApp.
  const wbotMessage = await GetWbotMessage(ticket, message.id);
  if (!wbotMessage || typeof (wbotMessage as any).react !== "function") {
    throw new Error("Message not found in WhatsApp Web");
  }

  // react("") quita la reacción (lo usa el frontend con removeEmoji).
  await (wbotMessage as any).react(emoji);

  return { ticketId: message.ticketId };
};

export default ReactToWhatsAppMessage;
