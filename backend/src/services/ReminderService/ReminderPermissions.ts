import AppError from "../../errors/AppError";
import Reminder from "../../models/Reminder";

export interface RequestingUser {
  id: number | string;
  profile?: string;
}

export const isReminderAdmin = (user?: RequestingUser): boolean => {
  const profile = String(user?.profile || "").toLowerCase();
  return profile === "admin" || profile === "masteradmin";
};

export const assertCanManageReminder = (
  reminder: Reminder,
  user: RequestingUser
): void => {
  const isCreator = Number(reminder.userId) === Number(user?.id);

  if (!isCreator && !isReminderAdmin(user)) {
    throw new AppError("ERR_REMINDER_FORBIDDEN", 403);
  }
};
