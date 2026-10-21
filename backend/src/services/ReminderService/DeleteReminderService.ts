import AppError from "../../errors/AppError";
import Reminder from "../../models/Reminder";
import {
  assertCanManageReminder,
  RequestingUser
} from "./ReminderPermissions";

const DeleteReminderService = async (
  id: number,
  user: RequestingUser
): Promise<void> => {
  const reminder = await Reminder.findByPk(id);

  if (!reminder) {
    throw new AppError("ERR_REMINDER_NOT_FOUND", 404);
  }

  assertCanManageReminder(reminder, user);
  await reminder.destroy();
};

export default DeleteReminderService;
