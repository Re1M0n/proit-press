import Whatsapp from "../../models/Whatsapp";
import { getWbot, restartWbot } from "../../libs/wbot";
import { startTelegramSession, stopTelegramSession } from "../../libs/telegram";
import { logger } from "../../utils/logger";

const RestartWhatsAppService = async (whatsappId: string): Promise<void> => {
  const whatsappIDNumber: number = parseInt(whatsappId, 10);

  try {
    const whatsapp = await Whatsapp.findByPk(whatsappIDNumber);
    if (!whatsapp) {
      throw new Error("No channel found for this ID.");
    }

    if (whatsapp.type === "telegram") {
      stopTelegramSession(whatsappIDNumber);
      await startTelegramSession(whatsapp);
      logger.info(`Telegram session for ID ${whatsappId} has been restarted.`);
      return;
    }

    const wbot = getWbot(whatsappIDNumber);
    if (!wbot) {
      throw new Error("No active session found for this ID.");
    }

    await restartWbot(whatsappIDNumber);
    logger.info(`WhatsApp session for ID ${whatsappId} has been restarted.`);
  } catch (error) {
    logger.error(
      `Failed to restart session: ${(error as Error).message}`
    );
  }
};

export default RestartWhatsAppService;
