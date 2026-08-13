import { handleMessage } from "./handleMessage";
import {
  handleMsgAck,
  handleMsgEdit,
  updatePendingMessages
} from "./MessageStatusHandlers";
import { Session, verifyRevoked, verifyRevokedById } from "./MessageUtils";

const wbotMessageListener = async (wbot: Session): Promise<void> => {
  wbot.on("message_create", async msg => {
    handleMessage(msg, wbot);
  });

  wbot.on("message_edit", async (msg, newBody, oldBody) => {
    handleMsgEdit(msg, newBody as string, oldBody as string);
  });

  wbot.on("media_uploaded", async msg => {
    handleMessage(msg, wbot);
  });

  wbot.on("message_ack", async (msg, ack) => {
    handleMsgAck(msg, ack);
  });

  wbot.on("message_revoke_everyone", async (after, before) => {
    const msgId: string | undefined = before?.id?.id;
    if (msgId) {
      verifyRevokedById(msgId);
    } else {
      const msgBody: string | undefined = before?.body;
      if (msgBody !== undefined) {
        verifyRevoked(msgBody || "");
      }
    }
  });

  wbot.on("message_revoke_me", async (after: any, before: any) => {
    const msgId: string | undefined = before?.id?.id;
    if (msgId) {
      verifyRevokedById(msgId);
    }
  });
  
  if (wbot.id) {
    setInterval(() => {
      updatePendingMessages(wbot.id!);
    }, 30 * 60 * 1000); 
    
    setTimeout(() => {
      updatePendingMessages(wbot.id!);
    }, 5 * 60 * 1000); 
  }
};


export { handleMessage, handleMsgAck, wbotMessageListener };

