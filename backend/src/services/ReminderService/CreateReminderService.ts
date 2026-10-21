import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Reminder, { ReminderRecurrence } from "../../models/Reminder";
import Ticket from "../../models/Ticket";

interface Request {
  userId: number;
  title: string;
  dueAt: Date;
  notes?: string | null;
  recurrence?: ReminderRecurrence;
  ticketId?: number | null;
  contactId?: number | null;
}

const CreateReminderService = async ({
  userId,
  title,
  dueAt,
  notes = null,
  recurrence = "none",
  ticketId = null,
  contactId = null
}: Request): Promise<Reminder> => {
  if (
    ticketId &&
    !(await Ticket.findByPk(ticketId, { attributes: ["id"] }))
  ) {
    throw new AppError("ERR_REMINDER_TICKET_NOT_FOUND", 404);
  }

  if (
    contactId &&
    !(await Contact.findByPk(contactId, { attributes: ["id"] }))
  ) {
    throw new AppError("ERR_REMINDER_CONTACT_NOT_FOUND", 404);
  }

  return Reminder.create({
    userId,
    title,
    dueAt,
    notes,
    recurrence,
    ticketId,
    contactId
  });
};

export default CreateReminderService;
