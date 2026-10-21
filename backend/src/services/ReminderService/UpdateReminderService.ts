import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Reminder, { ReminderRecurrence } from "../../models/Reminder";
import Ticket from "../../models/Ticket";
import {
  assertCanManageReminder,
  RequestingUser
} from "./ReminderPermissions";

export interface ReminderUpdateInput {
  title: string;
  notes: string | null;
  dueAt: Date;
  recurrence: ReminderRecurrence;
  ticketId: number | null;
  contactId: number | null;
}

const UpdateReminderService = async (
  id: number,
  user: RequestingUser,
  data: ReminderUpdateInput
): Promise<Reminder> => {
  const reminder = await Reminder.findByPk(id);

  if (!reminder) {
    throw new AppError("ERR_REMINDER_NOT_FOUND", 404);
  }

  assertCanManageReminder(reminder, user);

  if (
    data.ticketId &&
    !(await Ticket.findByPk(data.ticketId, { attributes: ["id"] }))
  ) {
    throw new AppError("ERR_REMINDER_TICKET_NOT_FOUND", 404);
  }

  if (
    data.contactId &&
    !(await Contact.findByPk(data.contactId, { attributes: ["id"] }))
  ) {
    throw new AppError("ERR_REMINDER_CONTACT_NOT_FOUND", 404);
  }

  const dueAtChanged = reminder.dueAt.getTime() !== data.dueAt.getTime();
  const patch = dueAtChanged ? { ...data, notifiedAt: null } : data;

  await reminder.update(patch);

  return reminder;
};

export default UpdateReminderService;
