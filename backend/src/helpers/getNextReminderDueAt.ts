import { addDays, addMonths } from "date-fns";
import { ReminderRecurrence } from "../models/Reminder";

const getNextReminderDueAt = (
  dueAt: Date,
  recurrence: ReminderRecurrence
): Date | undefined => {
  switch (recurrence) {
    case "daily":
      return addDays(dueAt, 1);
    case "weekly":
      return addDays(dueAt, 7);
    case "monthly":
      return addMonths(dueAt, 1);
    default:
      return undefined;
  }
};

export default getNextReminderDueAt;
