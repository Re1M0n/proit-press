import AppError from "../../errors/AppError";
import getNextReminderDueAt from "../../helpers/getNextReminderDueAt";
import Reminder from "../../models/Reminder";

export interface MarkReminderDoneResult {
  reminder: Reminder;
  nextReminder?: Reminder;
}

const MarkReminderDoneService = async (
  id: number
): Promise<MarkReminderDoneResult> => {
  const sequelize = Reminder.sequelize;

  if (!sequelize) {
    throw new Error("El modelo Reminder no está conectado a Sequelize");
  }

  return sequelize.transaction(async transaction => {
    const reminder = await Reminder.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!reminder) {
      throw new AppError("ERR_REMINDER_NOT_FOUND", 404);
    }

    if (reminder.status === "done") {
      return { reminder };
    }

    await reminder.update({ status: "done" }, { transaction });

    const nextDueAt = getNextReminderDueAt(
      reminder.dueAt,
      reminder.recurrence
    );

    if (!nextDueAt) {
      return { reminder };
    }

    const nextReminder = await Reminder.create(
      {
        userId: reminder.userId,
        title: reminder.title,
        notes: reminder.notes,
        dueAt: nextDueAt,
        recurrence: reminder.recurrence,
        ticketId: reminder.ticketId,
        contactId: reminder.contactId
      },
      { transaction }
    );

    return { reminder, nextReminder };
  });
};

export default MarkReminderDoneService;
