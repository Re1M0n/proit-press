import { addMinutes } from "date-fns";
import AppError from "../../errors/AppError";
import Reminder from "../../models/Reminder";

export const ALLOWED_SNOOZE_MINUTES = [5, 15, 60];

const SnoozeReminderService = async (
  id: number,
  minutes: number
): Promise<Reminder> => {
  if (!ALLOWED_SNOOZE_MINUTES.includes(Number(minutes))) {
    throw new AppError("ERR_REMINDER_INVALID_MINUTES", 400);
  }

  const [updated] = await Reminder.update(
    {
      dueAt: addMinutes(new Date(), Number(minutes)),
      notifiedAt: null
    },
    {
      where: { id, status: "pending" }
    }
  );

  if (!updated) {
    const reminder = await Reminder.findByPk(id);

    if (!reminder) {
      throw new AppError("ERR_REMINDER_NOT_FOUND", 404);
    }

    throw new AppError("ERR_REMINDER_ALREADY_DONE", 409);
  }

  const reminder = await Reminder.findByPk(id);
  if (!reminder) {
    throw new AppError("ERR_REMINDER_NOT_FOUND", 404);
  }

  return reminder;
};

export default SnoozeReminderService;
