import AppError from "../../errors/AppError";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

// Verifica si WhatsApp permite revocar (borrar para todos) el mensaje. Usa la
// misma "capability" que whatsapp-web.js internamente; si devuelve false, el
// delete(true) de la librería haría un borrado LOCAL silencioso que confunde
// (el mensaje desaparece del sistema pero el contacto lo sigue viendo).
const tryCheckCanRevoke = async (
  messageToDelete: any
): Promise<boolean | null> => {
  try {
    const id =
      messageToDelete.id?._serialized || messageToDelete.id?.["$1"] || "";
    if (!id) return null;

    const wbot = messageToDelete.client;
    if (!wbot?.pupPage) return null;

    return await wbot.pupPage.evaluate(async (msgId: string) => {
      try {
        const waw: any = window as any;
        const cap = waw.require?.("WAWebMsgActionCapability");
        const Msg = waw.require?.("WAWebCollections")?.Msg || waw?.Store?.Msg;
        if (!cap || !Msg) return null;

        let msg = Msg.get(msgId);
        if (!msg) {
          const res = await Msg.getMessagesById?.([msgId]);
          msg = res?.messages?.[0];
        }
        if (!msg) return null;

        return !!(
          cap.canSenderRevokeMsg(msg) || cap.canAdminRevokeMsg(msg)
        );
      } catch (e) {
        return null;
      }
    }, id);
  } catch (e) {
    return null;
  }
};

const DeleteWhatsAppMessage = async (messageId: string): Promise<Message> => {
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

  const { ticket } = message;

  const messageToDelete = await GetWbotMessage(ticket, messageId);

  // Si el mensaje no es revocable (muy viejo, >~48 h, o enviado desde el
  // teléfono), avisar con claridad en lugar de un borrado local mudo.
  const canRevoke = await tryCheckCanRevoke(messageToDelete);
  if (canRevoke === false) {
    throw new AppError("ERR_MSG_NOT_DELETABLE", 400);
  }

  // delete() de wwebjs no lanza cuando no puede revocar: degrada a borrado
  // local y devuelve un resultado que puede ser falsy aunque el borrado se
  // haya ejecutado. Por eso solo se considera fallo si AMBAS llamadas lanzan.
  let lastError: any = null;

  try {
    await messageToDelete.delete(true);
  } catch (err) {
    lastError = err;
    console.warn(
      "[DeleteWhatsAppMessage] delete(true) falló, probando borrado local:",
      err
    );
    try {
      await messageToDelete.delete(false);
      lastError = null;
    } catch (err2) {
      lastError = err2;
      console.error(
        "[DeleteWhatsAppMessage] delete(false) también falló:",
        err2
      );
    }
  }

  if (lastError) {
    throw new AppError("ERR_DELETE_WAPP_MSG", 400);
  }

  await message.update({ isDeleted: true });

  return message;
};

export default DeleteWhatsAppMessage;
