import * as Sentry from "@sentry/node";
import { Client } from "whatsapp-web.js";

import { getIO } from "../../libs/socket";
import { markSessionNotReady } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";

interface Session extends Client {
  id?: number;
}

const wbotMonitor = async (
  wbot: Session,
  whatsapp: Whatsapp,
  scheduleReconnect: () => void,
  markConnected: () => void
): Promise<void> => {
  const io = getIO();
  const sessionName = whatsapp.name;

  try {
    wbot.on("change_state", async newState => {
      logger.info(`Monitor session: ${sessionName}, ${newState}`);
      if (newState !== "CONNECTED") {
        markSessionNotReady(whatsapp.id);
      } else {
        markConnected();
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
      } catch (err) {
        Sentry.captureException(err);
        logger.error(err);
      }

      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });

      scheduleReconnect();
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

export default wbotMonitor;
