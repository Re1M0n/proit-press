import { Op } from "sequelize";
import { getIO } from "../../libs/socket";
import Reminder from "../../models/Reminder";
import { logger } from "../../utils/logger";

export const SWEEP_INTERVAL_MS = 30000;

let timer: NodeJS.Timeout | undefined;
let sweepInProgress = false;

export const runReminderSweep = async (now = new Date()): Promise<number> => {
  if (sweepInProgress) {
    return 0;
  }

  sweepInProgress = true;

  try {
    const dueReminders = await Reminder.findAll({
      attributes: [
        "id",
        "userId",
        "title",
        "notes",
        "dueAt",
        "status",
        "recurrence",
        "ticketId",
        "contactId",
        "notifiedAt"
      ],
      where: {
        status: "pending",
        dueAt: { [Op.lte]: now },
        notifiedAt: null
      }
    });

    let claimedCount = 0;

    for (const reminder of dueReminders) {
      try {
        const [claimed] = await Reminder.update(
          { notifiedAt: now },
          {
            where: {
              id: reminder.id,
              status: "pending",
              dueAt: { [Op.lte]: now },
              notifiedAt: null
            }
          }
        );

        if (!claimed) {
          continue;
        }

        claimedCount += 1;

        getIO().to("reminders").emit("reminder", {
          ...reminder.toJSON(),
          notifiedAt: now
        });
      } catch (error) {
        logger.error(
          `[REMINDER] No se pudo procesar el recordatorio ${reminder.id}: ${
            (error as Error)?.message || error
          }`
        );
      }
    }

    return claimedCount;
  } finally {
    sweepInProgress = false;
  }
};

export const startReminderScheduler = (): void => {
  if (timer) {
    return;
  }

  timer = setInterval(() => {
    runReminderSweep().catch(error => {
      logger.error(
        `[REMINDER] Falló el barrido de recordatorios: ${
          (error as Error)?.message || error
        }`
      );
    });
  }, SWEEP_INTERVAL_MS);

  logger.info(
    `[REMINDER] Scheduler de recordatorios activo (cada ${SWEEP_INTERVAL_MS / 1000}s)`
  );
};

export const stopReminderScheduler = (): void => {
  if (!timer) {
    return;
  }

  clearInterval(timer);
  timer = undefined;
};
