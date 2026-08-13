/* eslint-disable no-plusplus */
import * as Sentry from "@sentry/node";
import { Op } from "sequelize";
import { MessageAck, Message as WbotMessage } from "whatsapp-web.js";

import Message from "../../models/Message";
import OldMessage from "../../models/OldMessage";
import Ticket from "../../models/Ticket";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

const handleMsgAck = async (msg: WbotMessage, ack: MessageAck) => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  try {
    const messageToUpdate = await Message.findByPk(msg.id.id, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        },
        {
          model: OldMessage,
          as: "oldMessages"
        }
      ]
    });

    if (!messageToUpdate) {
      logger.warn(`[ACK_ERRO] Mensagem não encontrada no banco de dados: ${msg.id.id}`);
      console.warn(`[ACK_ERRO] Mensagem não encontrada no banco de dados: ${msg.id.id}`);
      return;
    }

    const currentAck = messageToUpdate.ack || 0;
    let ackToUpdate = ack || 0;
    
    if (messageToUpdate.read === true && ackToUpdate < 3 && messageToUpdate.fromMe) {
      // Mensagem lida con ACK inferior: se mantiene el ACK original.
    }
    
    if (ackToUpdate > currentAck) {
      await messageToUpdate.update({ ack: ackToUpdate });

      io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
        action: "update",
        message: messageToUpdate
      });
    }
    
    if (ackToUpdate >= 2) {
      try {
        const messagesToUpdate = await Message.findAll({
          where: {
            ticketId: messageToUpdate.ticketId,
            id: { [Op.lt]: messageToUpdate.id },
            ack: { [Op.lt]: ackToUpdate }
          },
          order: [['createdAt', 'DESC']]
        });
        
        if (messagesToUpdate.length > 0) {
          for (const msg of messagesToUpdate) {
            await msg.update({ ack: ackToUpdate >= 3 ? 3 : 2 });
            
            io.to(msg.ticketId.toString()).emit("appMessage", {
              action: "update",
              message: msg
            });
          }
        }
      } catch (batchErr) {
        logger.error(`[ACK_BATCH_ERROR] Erro ao processar atualização em lote: ${batchErr}`);
      }
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`[ACK_ERRO] Erro ao processar ACK da mensagem. ID=${msg?.id?.id || 'unknown'}, ACK=${ack}, Erro: ${err}`);
    console.error(`[ACK_ERRO] Erro ao processar ACK da mensagem. ID=${msg?.id?.id || 'unknown'}, ACK=${ack}, Erro: ${err}`);
  }
};


const handleMsgEdit = async (
  msg: WbotMessage,
  newBody: string,
  oldBody: string
): Promise<void> => {
  let editedMsg = await Message.findByPk(msg.id.id, {
    include: [
      {
        model: OldMessage,
        as: "oldMessages"
      }
    ]
  });

  if (!editedMsg) return;

  const io = getIO();

  try {
    
    if (oldBody && newBody && oldBody !== newBody) {
      
      const existingHistory = await OldMessage.findOne({
        where: {
          messageId: msg.id.id,
          body: oldBody
        }
      });

      if (!existingHistory) {
        await OldMessage.create({
          messageId: msg.id.id,
          body: oldBody
        });
        console.info(`[handleMsgEdit] Histórico salvo: "${oldBody}"`);
      } else {
        console.info(`[handleMsgEdit] Histórico já existe (ID: ${existingHistory.id}), pulando duplicata`);
      }
    } else {
      console.info(`[handleMsgEdit] Sem mudança no corpo ou valores inválidos`);
    }

    if (editedMsg.body !== newBody) {
      await editedMsg.update({ body: newBody, isEdited: true });
    } else {
      console.info(`[handleMsgEdit] Mensagem já está atualizada no banco`);
    }

    await editedMsg.reload({
      include: [
        {
          model: OldMessage,
          as: "oldMessages",
          separate: true,
          order: [["createdAt", "DESC"]]
        }
      ]
    });

    io.to(editedMsg.ticketId.toString()).emit("appMessage", {
      action: "update",
      message: editedMsg
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message edit. Err: ${err}`);
  }
};


const updatePendingMessages = async (whatsappId: number): Promise<void> => {
  try {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const pendingMessages = await Message.findAll({
      where: {
        fromMe: true,
        ack: { [Op.in]: [0, 1] },
        createdAt: { [Op.lt]: oneHourAgo },
      },
      include: [{
        model: Ticket,
        where: { whatsappId },
        required: true
      }],
      limit: 100
    });
    
    if (pendingMessages.length > 0) {      
      const io = getIO();
      
      for (const message of pendingMessages) {
        await message.update({ ack: 3 });
        
        io.to(message.ticketId.toString()).emit("appMessage", {
          action: "update",
          message
        });
      }
    }
  } catch (err) {
    console.error("Erro ao atualizar mensagens antigas:", err);
  }
};


export { handleMsgAck, handleMsgEdit, updatePendingMessages };

