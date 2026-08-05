import AppError from "../../errors/AppError";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import OldMessage from "../../models/OldMessage";

const EditWhatsAppMessage = async (
  messageId: string,
  newBody: string
): Promise<Message> => {
  const message = await Message.findByPk(messageId, {
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"]
      }
    ]
  });
  if (!message) {
    throw new AppError("No message found with this ID.");
  }

  if (!newBody || newBody.trim() === "") {
    throw new AppError("O novo texto da mensagem não pode estar vazio.");
  }

  const { ticket } = message;

  const oldBody = message.body;
  
  let messageToEdit;

  try {
    messageToEdit = await GetWbotMessage(ticket, messageId);
  } catch (err: any) {
    console.error(
      "[EditWhatsAppMessage] No se pudo localizar el mensaje en WhatsApp:",
      err
    );
    throw new AppError("ERR_FETCH_WAPP_MSG", 400);
  }

  let res: any;

  try {
    res = await messageToEdit.edit(newBody);
  } catch (err: any) {
    console.error("[EditWhatsAppMessage] edit() lanzó un error:", err);
    throw new AppError("ERR_EDITING_WAPP_MSG", 400);
  }

  // wwebjs devuelve null/undefined cuando WhatsApp no permite editar:
  // mensaje muy antiguo (>15 min) o enviado desde otro dispositivo (ej. el
  // teléfono). Se avisa con un mensaje claro en lugar de un error genérico.
  if (res === null || res === undefined) {
    throw new AppError("ERR_MSG_NOT_EDITABLE", 400);
  }


  if (typeof oldBody === "string" && oldBody !== newBody) {
    
    const existingHistory = await OldMessage.findOne({
      where: {
        messageId: message.id,
        body: oldBody
      }
    });

    if (!existingHistory) {
      const newHistory = await OldMessage.create({
        messageId: message.id,
        body: oldBody
      });

    } else {
      console.log(`[EditWhatsAppMessage] Histórico já existe (ID: ${existingHistory.id}), pulando duplicata`);
    }
  } else {
    console.log(`[EditWhatsAppMessage] Histórico não salvo - oldBody: "${oldBody}", newBody: "${newBody}", são iguais: ${oldBody === newBody}`);
  }

  await message.update({
    body: newBody,
    isEdited: true,
    updatedAt: new Date()
  });

  const mostRecentMessage = await Message.findOne({
    where: { ticketId: ticket.id },
    order: [["updatedAt", "DESC"]]
  });

  if (mostRecentMessage && mostRecentMessage.id === messageId) {
    await ticket.update({ lastMessage: newBody });
    await ticket.reload();
  }

  await message.reload({
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"]
      },
      {
        model: OldMessage,
        as: "oldMessages",
        separate: true,
        order: [["createdAt", "DESC"]]
      }
    ]
  });

  if (message.oldMessages && message.oldMessages.length > 0) {
    console.log(`[EditWhatsAppMessage] Históricos encontrados:`, 
      message.oldMessages.map((om: any) => ({ id: om.id, body: om.body?.substring(0, 30) }))
    );
  }

  return message;
};

export default EditWhatsAppMessage;
