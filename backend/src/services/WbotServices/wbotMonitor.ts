import * as Sentry from "@sentry/node";
import { Client } from "whatsapp-web.js";

import { getIO } from "../../libs/socket";
import { markSessionNotReady } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import { notifyChannelDisconnected } from "../PushNotificationService";

interface Session extends Client {
  id?: number;
}

const wbotMonitor = async (
  wbot: Session,
  whatsapp: Whatsapp
): Promise<void> => {
  const io = getIO();
  const sessionName = whatsapp.name;

  try {
    wbot.on("change_state", async newState => {
      logger.info(`Monitor session: ${sessionName}, ${newState}`);
      if (newState !== "CONNECTED") {
        markSessionNotReady(whatsapp.id);
      }
      try {
        await whatsapp.update({ status: newState });
      } catch (err) {
        Sentry.captureException(err);
        logger.error(err);
      }

      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });
    });

    wbot.on("disconnected", async reason => {
      logger.info(`Disconnected session: ${sessionName}, reason: ${reason}`);
      markSessionNotReady(whatsapp.id);
      try {
        await whatsapp.update({ status: "OPENING", session: "", number: "" });
        void notifyChannelDisconnected(whatsapp, String(reason)).catch(err => {
          logger.error(`[PUSH] Error notificando canal desconectado ${whatsapp.id}: ${err.message}`);
        });
      } catch (err) {
        Sentry.captureException(err);
        logger.error(err);
      }

      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });

      setTimeout(() => StartWhatsAppSession(whatsapp), 2000);
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

export default wbotMonitor;
