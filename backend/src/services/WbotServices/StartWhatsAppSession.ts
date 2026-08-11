import { initWbot } from "../../libs/wbot";
import { startTelegramSession } from "../../libs/telegram";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import { logger } from "../../utils/logger";
import GroupEventsService from "./GroupEventsService";

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp
): Promise<void> => {
  await whatsapp.update({ status: "OPENING" });

  const io = getIO();
  io.emit("whatsappSession", {
    action: "update",
    session: whatsapp
  });

  try {
    if (whatsapp.type === "telegram") {
      await startTelegramSession(whatsapp);
      return;
    }

    const wbot = await initWbot(whatsapp);
    wbotMessageListener(wbot);
    wbotMonitor(wbot, whatsapp);
    GroupEventsService.setupGroupListeners(wbot, whatsapp.id);
  } catch (err) {
    logger.error(err);
  }
};
