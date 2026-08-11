import AppError from "../../errors/AppError";
import formatBody from "../../helpers/Mustache";
import { telegramApi } from "../../libs/telegram";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import CreateMessageService from "../MessageServices/CreateMessageService";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const SendTelegramTextService = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<any> => {
  // ShowTicketService no incluye el token del bot en el asociado "whatsapp"
  // (attributes: name/type/color), así que lo buscamos por PK como hace el
  // listener de Telegram — sin exponer el token al frontend.
  const whatsapp = ticket.whatsappId
    ? await Whatsapp.findByPk(ticket.whatsappId)
    : undefined;
  const token = whatsapp?.tokenTelegram;
  if (!token) {
    throw new AppError(
      "El canal de Telegram no tiene un token configurado. Editá el canal y cargá el token del bot."
    );
  }

  const chatId = ticket.contact?.telegramId;
  if (!chatId) {
    throw new AppError(
      "No se encontró el chat de Telegram para este contacto."
    );
  }

  // Reply citando el mensaje original (reply nativo de Telegram) y guardando
  // el quote en la BD para que se muestre en el frontend.
  const params: any = {
    chat_id: chatId,
    text: formatBody(body, ticket)
  };
  const tgReplyId = quotedMsg
    ? Number(String(quotedMsg.id || "").replace(/^tg_/, ""))
    : undefined;
  if (tgReplyId && !Number.isNaN(tgReplyId)) {
    params.reply_to_message_id = tgReplyId;
  }

  const res = await telegramApi(token, "sendMessage", params);

  if (!res || !res.ok || !res.result) {
    throw new AppError(
      `No se pudo enviar el mensaje por Telegram: ${
        res?.description || "error desconocido"
      }`
    );
  }

  const messageId = `tg_${res.result.message_id}`;

  try {
    await CreateMessageService({
      messageData: {
        id: messageId,
        ticketId: ticket.id,
        body,
        fromMe: true,
        mediaType: "chat",
        read: true,
        quotedMsgId: quotedMsg?.id,
        userId: ticket.userId
      }
    });
  } catch (err) {
    console.error("Error al guardar mensaje de Telegram en la base:", err);
  }

  return { id: { id: messageId } };
};

export default SendTelegramTextService;
