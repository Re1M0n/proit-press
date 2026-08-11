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

    return await wbot.pupPage.evaluate((msgId: string) => {
      const waw: any = window as any;
      const cap = waw.require?.("WAWebMsgActionCapability");
      const Msg = waw.require?.("WAWebCollections")?.Msg || waw?.Store?.Msg;
      if (!cap || !Msg) return null;

      const lookup = (): Promise<any> => {
        const inMem = Msg.get(msgId);
        if (inMem) return Promise.resolve(inMem);
        if (!Msg.getMessagesById) return Promise.resolve(null);
        return Msg.getMessagesById([msgId]).then((res: any) => res?.messages?.[0] || null);
      };

      return lookup().then((msg: any) => {
        if (!msg) return null;
        return !!(cap.canSenderRevokeMsg(msg) || cap.canAdminRevokeMsg(msg));
      }).catch(() => null);
    }, id);
  } catch (e) {
    return null;
  }
};

// Ejecuta el borrado directamente sobre el Store de la sesión. El delete()
// de wwebjs llama Cmd.sendRevokeMsgs / Cmd.sendDeleteMsgs sobre el módulo
// WAWebCmd, pero en la versión actual de WhatsApp Web esos métodos viven en
// Cmd.Cmd (la instancia), así que la librería falla con TypeError. Acá se
// usan las APIs correctas y se devuelve true solo si la acción se ejecutó.
const deleteMessageInWpp = async (
  messageToDelete: any,
  everyone: boolean
): Promise<boolean> => {
  const wbot = messageToDelete?.client;
  const msgKey =
    messageToDelete?.id?.["$1"] || messageToDelete?.id?._serialized;
  const targetId = messageToDelete?.id?.id || "";
  const remoteRaw = messageToDelete?.id?.remote || "";
  const remote =
    typeof remoteRaw === "string" ? remoteRaw : remoteRaw?._serialized || "";
  if (!wbot?.pupPage || !msgKey) return false;

  return wbot.pupPage.evaluate(
    (key: string, targetId: string, remote: string, everyone: boolean) => {
      const waw: any = window as any;
      const Msg = waw.require?.("WAWebCollections")?.Msg;
      const Chat = waw.require?.("WAWebCollections")?.Chat;

      // WhatsApp solo mantiene en memoria los últimos mensajes de cada chat
      // (los anteriores se evictan). Busca en la colección del chat y, si no
      // está, pagina hacia atrás con loadEarlierMsgs() hasta encontrarlo.
      const findInChat = (chat: any): any => {
        const msgs =
          (chat?.msgs && (chat.msgs._models || chat.msgs.models)) || [];
        for (const m of msgs) {
          if (m && m.id) {
            const k = m.id["$1"] || m.id._serialized || "";
            if (m.id.id === targetId || k === key) return m;
          }
        }
        return null;
      };

      const loadUntilFound = (chat: any, depth: number): Promise<any> => {
        const found = findInChat(chat);
        if (found) return Promise.resolve(found);
        if (depth >= 40 || typeof chat?.loadEarlierMsgs !== "function") {
          return Promise.resolve(null);
        }
        return chat
          .loadEarlierMsgs()
          .then(() => loadUntilFound(chat, depth + 1));
      };

      // 1) Intento rápido: el mensaje puede estar en el Store global.
      const lookupMsg = (): Promise<any> => {
        const inMem = Msg?.get(key);
        if (inMem) return Promise.resolve(inMem);
        if (Msg?.getMessagesById) {
          return Msg.getMessagesById([key]).then((res: any) => res?.messages?.[0] || null);
        }
        return Promise.resolve(null);
      };

      return lookupMsg().then((msg: any) => {
        if (msg) return Promise.resolve({ msg, chat: null });

        // 2) No está en memoria: cargar el chat y paginar hacia atrás.
        const loadChat = (): Promise<any> => {
          const inMem = Chat?.get(remote);
          if (inMem) return Promise.resolve(inMem);
          if (typeof Chat?.find !== "function") return Promise.resolve(null);
          return Chat.find(remote).catch(() => null);
        };

        return loadChat().then((chat: any) => {
          if (!chat) return Promise.resolve(null);
          return loadUntilFound(chat, 0).then((m: any) => ({ msg: m, chat }));
        });
      }).then((found: any) => {
        if (!found || !found.msg) return false;
        const msg = found.msg;
        const chat =
          found.chat ||
          (msg.id?.remote && Chat?.get(msg.id?.remote)) ||
          Chat?.get(remote);
        if (!chat) return false;

        const Cmd = waw.require?.("WAWebCmd");
        const cmdInstance = Cmd?.Cmd || Cmd;
        const sendRevoke = cmdInstance?.sendRevokeMsgs;
        const sendDelete = cmdInstance?.sendDeleteMsgs;

        if (everyone) {
          const cap = waw.require?.("WAWebMsgActionCapability");
          const canRevoke = !!(
            cap &&
            (cap.canSenderRevokeMsg(msg) || cap.canAdminRevokeMsg(msg))
          );
          if (canRevoke && typeof sendRevoke === "function") {
            return sendRevoke
              .call(
                cmdInstance,
                chat,
                { list: [msg], type: "message" },
                { clearMedia: true }
              )
              .then(() => true);
          }
        }
        if (typeof sendDelete === "function") {
          return sendDelete
            .call(cmdInstance, chat, { list: [msg], type: "message" }, true)
            .then(() => true);
        }
        return false;
      }).catch(() => false);
    },
    msgKey,
    targetId,
    remote,
    everyone
  );
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

  // El delete() de wwebjs está roto en esta versión de WhatsApp Web (llama
  // Cmd.sendRevokeMsgs/Cmd.sendDeleteMsgs sobre el módulo, pero acá viven en
  // Cmd.Cmd, la instancia). Usamos deleteMessageInWpp, que además distingue
  // revocar (borrar para todos) de borrado local.
  let deleteOk = false;
  try {
    deleteOk = await deleteMessageInWpp(messageToDelete, true);
  } catch (err) {
    console.warn("[DeleteWhatsAppMessage] Borrado en WhatsApp falló:", err);
  }

  if (!deleteOk) {
    throw new AppError("ERR_DELETE_WAPP_MSG", 400);
  }

  await message.update({ isDeleted: true });

  return message;
};

export default DeleteWhatsAppMessage;
