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

  // Un mensaje eliminado/revocado no se puede editar: WhatsApp en vez de
  // editar crea un mensaje nuevo, lo que confunde (parece que "borra uno
  // para escribir el editado").
  if (message.isDeleted) {
    throw new AppError("ERR_MSG_NOT_EDITABLE", 400);
  }

  const { ticket } = message;

  const oldBody = message.body;

  // Conservar la firma del agente (ej. "*Emiliano:*") al editar: el
  // frontend a veces la antepone y a veces no, así que se normaliza acá
  // para que el mensaje editado mantenga exactamente una firma con el
  // mismo nombre que el original.
  const signatureMatch = oldBody?.match(/^(\*[^*\n]+:\*)\s*\n?/);
  // Quitar firmas que el nuevo texto ya traiga (el frontend a veces deja
  // una o hasta dos: "\*Emiliano:*\n\*Emiliano:*\n...") y anteponer la
  // firma original exactamente una sola vez.
  let editBody = newBody.trim().replace(/^(?:(?:\*[^*\n]+:\*)\s*\n?)+/, "");
  if (signatureMatch && signatureMatch[1]) {
    editBody = `${signatureMatch[1]}\n${editBody}`;
  }
  
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
    res = await messageToEdit.edit(editBody);
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
    body: editBody,
    isEdited: true,
    updatedAt: new Date()
  });

  const mostRecentMessage = await Message.findOne({
    where: { ticketId: ticket.id },
    order: [["updatedAt", "DESC"]]
  });

  if (mostRecentMessage && mostRecentMessage.id === messageId) {
    await ticket.update({ lastMessage: editBody });
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
