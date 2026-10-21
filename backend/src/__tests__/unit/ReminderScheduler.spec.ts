jest.mock("../../models/Reminder", () => ({
  findAll: jest.fn(),
  update: jest.fn()
}));
jest.mock("../../libs/socket", () => ({
  getIO: jest.fn()
}));
jest.mock("../../utils/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

import Reminder from "../../models/Reminder";
import { getIO } from "../../libs/socket";
import { Op } from "sequelize";
import {
  runReminderSweep,
  startReminderScheduler,
  stopReminderScheduler
} from "../../services/ReminderService/ReminderScheduler";

const buildReminder = (id: number) => {
  const data = {
    id,
    userId: 1,
    title: `recordatorio ${id}`,
    notes: null,
    dueAt: new Date("2026-10-21T18:00:00.000Z"),
    status: "pending",
    recurrence: "none",
    ticketId: null,
    contactId: null,
    notifiedAt: null
  };

  return {
    ...data,
    toJSON: jest.fn(() => data)
  };
};

describe("runReminderSweep", () => {
  const now = new Date("2026-10-21T19:00:00.000Z");
  const emit = jest.fn();

  beforeEach(() => {
    (Reminder.findAll as unknown as jest.Mock).mockReset();
    (Reminder.update as unknown as jest.Mock).mockReset();
    emit.mockReset();
    (getIO as jest.Mock).mockReset().mockReturnValue({
      to: jest.fn().mockReturnValue({ emit })
    });
  });

  it("reclama y emite cada recordatorio vencido una sola vez al room autenticado", async () => {
    const first = buildReminder(1);
    const second = buildReminder(2);
    (Reminder.findAll as unknown as jest.Mock).mockResolvedValue([first, second]);
    (Reminder.update as unknown as jest.Mock).mockResolvedValue([1]);

    const claimed = await runReminderSweep(now);

    expect(claimed).toBe(2);
    expect(Reminder.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "pending",
          notifiedAt: null,
          dueAt: { [Op.lte]: now }
        }
      })
    );
    expect(Reminder.update).toHaveBeenCalledTimes(2);
    expect(Reminder.update).toHaveBeenCalledWith(
      { notifiedAt: now },
      expect.objectContaining({
        where: expect.objectContaining({
          status: "pending",
          notifiedAt: null,
          dueAt: { [Op.lte]: now }
        })
      })
    );
    expect(getIO().to).toHaveBeenCalledWith("reminders");
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith("reminder", {
      ...first.toJSON(),
      notifiedAt: now
    });
  });

  it("omite el aviso si el recordatorio dejó de estar pendiente antes de reclamarlo", async () => {
    const reminder = buildReminder(3);
    (Reminder.findAll as unknown as jest.Mock).mockResolvedValue([reminder]);
    (Reminder.update as unknown as jest.Mock).mockResolvedValue([0]);

    const claimed = await runReminderSweep(now);

    expect(claimed).toBe(0);
    expect(emit).not.toHaveBeenCalled();
  });

  it("continúa con los demás recordatorios si falla una emisión socket", async () => {
    const first = buildReminder(4);
    const second = buildReminder(5);
    (Reminder.findAll as unknown as jest.Mock).mockResolvedValue([first, second]);
    (Reminder.update as unknown as jest.Mock).mockResolvedValue([1]);
    emit.mockImplementationOnce(() => {
      throw new Error("socket caído");
    });

    const claimed = await runReminderSweep(now);

    expect(claimed).toBe(2);
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it("mantiene un solo intervalo y lo detiene al apagar el scheduler", () => {
    jest.useFakeTimers();

    startReminderScheduler();
    startReminderScheduler();

    expect(jest.getTimerCount()).toBe(1);

    stopReminderScheduler();

    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
