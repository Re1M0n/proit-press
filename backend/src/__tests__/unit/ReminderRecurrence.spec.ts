import { addDays, addMonths } from "date-fns";
import getNextReminderDueAt from "../../helpers/getNextReminderDueAt";

describe("getNextReminderDueAt", () => {
  const dueAt = new Date("2026-10-21T18:00:00.000Z");

  it("no devuelve fecha cuando no repite", () => {
    expect(getNextReminderDueAt(dueAt, "none")).toBeUndefined();
  });

  it("suma un día en la repetición diaria", () => {
    expect(getNextReminderDueAt(dueAt, "daily")).toEqual(addDays(dueAt, 1));
  });

  it("suma siete días en la repetición semanal", () => {
    expect(getNextReminderDueAt(dueAt, "weekly")).toEqual(addDays(dueAt, 7));
  });

  it("suma un mes y recorta al último día del mes", () => {
    const endOfMonth = new Date("2026-01-31T12:00:00.000Z");
    const nextDueAt = getNextReminderDueAt(endOfMonth, "monthly");

    expect(nextDueAt).toEqual(addMonths(endOfMonth, 1));
    expect(nextDueAt?.getDate()).toBe(28);
  });
});
