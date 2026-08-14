import { startTelegramSession } from "../../libs/telegram";
import { logger } from "../../utils/logger";
import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";

export const StartAllWhatsAppsSessions = async (): Promise<void> => {
  const whatsapps = await ListWhatsAppsService();
  if (whatsapps.length > 0) {
    whatsapps.forEach(whatsapp => {
      if (whatsapp.type === "wwebjs") {
        StartWhatsAppSession(whatsapp);
      } else if (whatsapp.type === "telegram") {
        if (whatsapp.status === "DISCONNECTED") {
          return;
        }
        startTelegramSession(whatsapp).catch(err => {
          logger.error(
            `[Telegram] Error iniciando sesión ${whatsapp.id}: ${
              (err as Error).message
            }`
          );
        });
      }
    });
  }
};
