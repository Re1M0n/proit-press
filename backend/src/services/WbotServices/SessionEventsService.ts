import { Client } from "whatsapp-web.js";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

/**
 * Handlers autocontenidos de eventos de sesión de whatsapp-web.js.
 * Se extrajeron de libs/wbot.ts para mantener el ciclo de vida de la sesión
 * legible; cada handler recibe lo que necesita (wbot, payload, whatsappId).
 */

export const handleMessageReaction = async (
  wbot: Client,
  reaction: any
): Promise<void> => {
  try {
    const parentId = reaction?.msgId?.id || reaction?.msgId?._serialized || reaction?.msgId || reaction?.id?.id || reaction?.id?._serialized;
    if (!parentId) return;

    const MessageModel = (await import("../../models/Message")).default;
    const msg = await MessageModel.findByPk(parentId);
    if (!msg) return;

    const io = getIO();
    const sender = reaction?.senderId || reaction?.author || reaction?.participant || reaction?.from || reaction?.id?.participant || "";
    const emoji = reaction?.reaction || "";
    const action = emoji ? "update" : "remove";

    try {
      const MessageReaction = (await import("../../models/MessageReaction")).default;
      if (action === "update" && emoji) {
        await MessageReaction.destroy({ where: { messageId: parentId, senderId: sender } });
        await MessageReaction.create({ messageId: parentId, senderId: sender, emoji });
      } else {
        await MessageReaction.destroy({ where: { messageId: parentId, senderId: sender } });
      }
    } catch (dbErr) {
      logger.warn("Persist reaction skipped (table might be missing)");
    }

    try {
      const TicketModel = (await import("../../models/Ticket")).default;
      const ticket = await TicketModel.findByPk(msg.ticketId);
      if (ticket && action === "update" && emoji) {
        const myNumber = wbot.info?.wid?._serialized || null;
        const isMyReaction = myNumber && sender === myNumber;

        const reactionText = isMyReaction
          ? `Reaccionaste con ${emoji} a: "${msg.body || 'multimedia'}"`
          : `Reagiu com ${emoji} a: "${msg.body || 'mídia'}"`;

        await ticket.update({ lastMessage: reactionText });

        const ticketData = {
          id: ticket.id,
          lastMessage: reactionText,
          updatedAt: new Date()
        };

        io.to(ticket.id.toString()).emit("ticket", {
          action: "update",
          ticket: ticketData
        });

        io.to(ticket.status).emit("ticket", {
          action: "update",
          ticket: ticketData
        });

        io.emit("appMessage", {
          action: "update",
          ticket: ticketData
        });
      }
    } catch (ticketErr) {
      logger.warn("Error al actualizar lastMessage del ticket:", ticketErr);
    }

    io.to(msg.ticketId.toString()).emit("messageReaction", {
      action,
      messageId: parentId,
      emoji,
      senderId: sender
    });
  } catch (err) {
    logger.warn("Error al procesar evento message_reaction:", err);
  }
};

export const handleVoteUpdate = async (
  wbot: Client,
  vote: any
): Promise<void> => {
  try {
    logger.info(`[POLL_VOTE] ========== NUEVO VOTO RECIBIDO ==========`);
    logger.info(`[POLL_VOTE] Votante: ${vote.voter}`);
    logger.info(`[POLL_VOTE] Poll ID (parentMsgKey): ${vote.parentMsgKey?.id}`);
    logger.info(`[POLL_VOTE] Poll ID (parentMessage): ${vote.parentMessage?.id?.id}`);
    logger.info(`[POLL_VOTE] Opciones Seleccionadas: ${JSON.stringify(vote.selectedOptions)}`);
    logger.info(`[POLL_VOTE] Timestamp: ${vote.interractedAtTs}`);
    logger.info(`[POLL_VOTE] ==========================================`);

    const PollVoteService = (await import("../PollVoteService")).default;

    let voterName = vote.voter;
    try {
      const contact = await wbot.getContactById(vote.voter);
      voterName = contact.name || contact.pushname || vote.voter;
      logger.info(`[POLL_VOTE] Nombre del votante: ${voterName}`);
    } catch (err) {
      logger.warn(`[POLL_VOTE] Error al buscar nombre del votante: ${err}`);
    }

    const pollMessageId = vote.parentMsgKey?.id || vote.parentMessage?.id?.id;
    logger.info(`[POLL_VOTE] Guardando voto para poll: ${pollMessageId}`);

    await PollVoteService.createOrUpdate({
      pollMessageId,
      voterId: vote.voter,
      voterName,
      selectedOptions: vote.selectedOptions,
      timestamp: new Date(vote.interractedAtTs)
    });

    logger.info(`[POLL_VOTE] ¡Voto guardado con éxito!`);
  } catch (error) {
    logger.error(`[POLL_VOTE] Error al procesar voto: ${error}`);
    logger.error(`[POLL_VOTE] Stack: ${error.stack}`);
  }
};

export const handleCall = async (
  wbot: Client,
  call: any,
  whatsappId: number
): Promise<void> => {
  try {
    const originalFrom = call.from;
    let realPhoneNumber = call.from;

    if (call.from.includes('@lid')) {
      try {
        const contact = await wbot.getContactById(call.from);
        const phoneNumber = contact.id.user || contact.number;
        realPhoneNumber = `${phoneNumber}@c.us`;
      } catch (err) {
        logger.warn(`[CALL] Error al convertir LID, usando original: ${err}`);
        realPhoneNumber = call.from;
      }
    }

    const Setting = (await import("../../models/Setting")).default;

    const autoRejectCallsSetting = await Setting.findOne({
      where: { key: "autoRejectCalls" }
    });

    const callSetting = await Setting.findOne({
      where: { key: "call" }
    });

    if (autoRejectCallsSetting && autoRejectCallsSetting.value === "enabled") {
      try {
        const pupPage = await wbot.pupPage;

        if (pupPage) {
          const rejected = await pupPage.evaluate((callId: string) => {
            try {
              const results: string[] = [];

              results.push('Método 1: Intentando tecla ESC...');
              try {
                const escEvent = new KeyboardEvent('keydown', {
                  key: 'Escape',
                  code: 'Escape',
                  keyCode: 27,
                  which: 27,
                  bubbles: true,
                  cancelable: true
                });
                document.dispatchEvent(escEvent);
                results.push('✅ Tecla ESC enviada');
              } catch (err: any) {
                results.push(`❌ Tecla ESC falló: ${err.message}`);
              }

              results.push('Método 2: Buscando botón rojo...');
              try {
                const allButtons = Array.from(document.querySelectorAll('button, div[role="button"]'));
                const redButton = allButtons.find((btn: any) => {
                  const style = window.getComputedStyle(btn);
                  const bgColor = style.backgroundColor;
                  return bgColor.includes('234, 67, 53') ||
                         bgColor.includes('244, 67, 54') ||
                         bgColor.includes('255, 0, 0') ||
                         bgColor.includes('220, 53, 69');
                });

                if (redButton) {
                  (redButton as HTMLElement).click();
                  results.push('✅ Botón rojo clickeado');
                  return { success: true, method: 'Red Button Click', results };
                } else {
                  results.push(`❌ Botón rojo no encontrado (${allButtons.length} botones verificados)`);
                }
              } catch (err: any) {
                results.push(`❌ Búsqueda por botón rojo falló: ${err.message}`);
              }

              results.push('Método 3: Buscando icono call-end...');
              try {
                const callEndIcon = document.querySelector('[data-icon="call-end"]');
                if (callEndIcon) {
                  const button = callEndIcon.closest('button') || callEndIcon.closest('[role="button"]');
                  if (button) {
                    (button as HTMLElement).click();
                    results.push('✅ Icono call-end clickeado');
                    return { success: true, method: 'Call End Icon', results };
                  }
                }
                results.push('❌ Icono call-end no encontrado');
              } catch (err: any) {
                results.push(`❌ Búsqueda por icono call-end falló: ${err.message}`);
              }

              results.push('Método 4: Intentando WWebJS.rejectCall...');
              try {
                const WWebJS = (window as any).WWebJS;
                if (WWebJS && typeof WWebJS.rejectCall === 'function') {
                  WWebJS.rejectCall(callId);
                  results.push('✅ WWebJS.rejectCall ejecutado');
                  return { success: true, method: 'WWebJS.rejectCall', results };
                } else {
                  results.push('❌ WWebJS.rejectCall no disponible');
                }
              } catch (err: any) {
                results.push(`❌ WWebJS.rejectCall falló: ${err.message}`);
              }

              return { success: false, error: 'Todos los métodos fallaron', results };
            } catch (err: any) {
              return { success: false, error: err.message, stack: err.stack, results: [] };
            }
          }, call.id);

          if (rejected.results && rejected.results.length > 0) {
            logger.info(`[CALL] Resultados de los intentos:\n${rejected.results.join('\n')}`);
          }

          if (rejected.success) {
            logger.info(`[CALL] ✅ Llamada rechazada vía Puppeteer (método: ${rejected.method})`);
          } else {
            logger.warn(`[CALL] ❌ Fallo al rechazar vía Puppeteer: ${rejected.error}`);
            if (rejected.stack) {
              logger.warn(`[CALL] Stack trace: ${rejected.stack}`);
            }

            logger.info(`[CALL] Intentando rechazar vía call.reject() - call.from: ${call.from}, call.id: ${call.id}`);
            try {
              const originalCallFrom = call.from;
              const originalPeerJid = call.peerJid;

              if (originalCallFrom.includes('@lid')) {
                call.from = realPhoneNumber;
                if (call.peerJid) {
                  call.peerJid = realPhoneNumber;
                }
              }

              const rejectResult = await call.reject();

              call.from = originalCallFrom;
              if (originalPeerJid) {
                call.peerJid = originalPeerJid;
              }
            } catch (rejectError) {
              logger.error(`[CALL] Error al ejecutar call.reject(): ${rejectError}`);
              logger.error(`[CALL] Stack: ${(rejectError as Error).stack}`);
            }
          }
        } else {
          logger.warn(`[CALL] pupPage no disponible, usando método predeterminado`);
          await call.reject();
          logger.info(`[CALL] Llamada rechazada vía método predeterminado`);
        }
      } catch (rejectErr) {
        logger.error(`[CALL] Error al rechazar llamada: ${rejectErr}`);
        logger.error(`[CALL] Stack trace: ${(rejectErr as Error).stack}`);
      }

      const autoRejectMessageSetting = await Setting.findOne({
        where: { key: "autoRejectCallsMessage" }
      });

      if (autoRejectMessageSetting && autoRejectMessageSetting.value) {
        try {
          await wbot.sendMessage(realPhoneNumber, autoRejectMessageSetting.value);
          logger.info(`[CALL] Mensaje automático enviado para ${realPhoneNumber}`);
        } catch (msgErr) {
          logger.warn(`[CALL] Error al enviar mensaje automático: ${msgErr}`);
        }
      }

      const io = getIO();
      io.emit("callRejected", {
        whatsappId,
        from: call.from,
        isVideo: call.isVideo,
        timestamp: new Date(),
        reason: "autoReject"
      });
    } else if (callSetting && callSetting.value === "enabled") {
      logger.info(`[CALL] Llamada de ${realPhoneNumber} no será aceptada (call setting enabled)`);

      try {
        await wbot.sendMessage(
          realPhoneNumber,
          "*Mensaje Automático:*\nLas llamadas de voz y video están deshabilitadas para este WhatsApp, por favor envíe un mensaje de texto. Gracias"
        );
        logger.info(`[CALL] Mensaje de no aceptación enviado para ${realPhoneNumber}`);
      } catch (msgErr) {
        logger.warn(`[CALL] Error al enviar mensaje de no aceptación: ${msgErr}`);
      }

      const io = getIO();
      io.emit("callRejected", {
        whatsappId,
        from: call.from,
        isVideo: call.isVideo,
        timestamp: new Date(),
        reason: "notAccepted"
      });
    } else {
      logger.info(`[CALL] Llamadas habilitadas - Llamada de ${call.from} permitida`);
    }
  } catch (err) {
    logger.error(`[CALL] Error al procesar llamada: ${err}`);
  }
};
