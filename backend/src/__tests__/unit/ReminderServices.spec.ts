jest.mock("../../models/Reminder", () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  sequelize: {
    transaction: jest.fn()
  }
}));
jest.mock("../../models/Ticket", () => ({
  findByPk: jest.fn()
}));
jest.mock("../../models/Contact", () => ({
  findByPk: jest.fn()
}));

import { addDays } from "date-fns";
import Contact from "../../models/Contact";
import Reminder from "../../models/Reminder";
import Ticket from "../../models/Ticket";
import { assertCanManageReminder } from "../../services/ReminderService/ReminderPermissions";
import CreateReminderService from "../../services/ReminderService/CreateReminderService";
import DeleteReminderService from "../../services/ReminderService/DeleteReminderService";
import ListRemindersService from "../../services/ReminderService/ListRemindersService";
import MarkReminderDoneService from "../../services/ReminderService/MarkReminderDoneService";
import SnoozeReminderService from "../../services/ReminderService/SnoozeReminderService";
import UpdateReminderService from "../../services/ReminderService/UpdateReminderService";

const transaction = { LOCK: { UPDATE: "UPDATE" } };

const buildReminder = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  userId: 3,
  title: "Llamar",
  notes: null,
  dueAt: new Date("2026-10-21T18:00:00.000Z"),
  status: "pending",
  recurrence: "none",
  ticketId: null,
  contactId: null,
  notifiedAt: null,
  update: jest.fn().mockImplementation(function update(
    this: Record<string, unknown>,
    patch: Record<string, unknown>
  ) {
    Object.assign(this, patch);
    return Promise.resolve(this);
  }),
  destroy: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const findByPk = Reminder.findByPk as unknown as jest.Mock;
const findAll = Reminder.findAll as unknown as jest.Mock;
const create = Reminder.create as unknown as jest.Mock;
const modelUpdate = Reminder.update as unknown as jest.Mock;
const ticketFindByPk = Ticket.findByPk as unknown as jest.Mock;
const contactFindByPk = Contact.findByPk as unknown as jest.Mock;
const sequelizeTransaction = Reminder.sequelize!
  .transaction as unknown as jest.Mock;

describe("permisos de recordatorios", () => {
  const reminder = buildReminder() as unknown as Reminder;

  it("permite administrar al creador", () => {
    expect(() =>
      assertCanManageReminder(reminder, { id: 3, profile: "user" })
    ).not.toThrow();
  });

  it.each(["admin", "ADMIN", "masteradmin"])(
    "permite administrar al perfil %s",
    profile => {
      expect(() =>
        assertCanManageReminder(reminder, { id: 99, profile })
      ).not.toThrow();
    }
  );

  it("rechaza a otro usuario que no es admin", () => {
    expect(() =>
      assertCanManageReminder(reminder, { id: 99, profile: "user" })
    ).toThrow("ERR_REMINDER_FORBIDDEN");
  });
});

describe("CreateReminderService", () => {
  beforeEach(() => {
    create.mockReset();
    ticketFindByPk.mockReset();
    contactFindByPk.mockReset();
  });

  it("rechaza un vínculo a un ticket inexistente antes de insertar", async () => {
    ticketFindByPk.mockResolvedValue(null);

    await expect(
      CreateReminderService({
        userId: 3,
        title: "Llamar",
        dueAt: new Date("2026-10-21T18:00:00.000Z"),
        ticketId: 404
      })
    ).rejects.toMatchObject({
      message: "ERR_REMINDER_TICKET_NOT_FOUND",
      statusCode: 404
    });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("ListRemindersService", () => {
  it("lista recordatorios compartidos en el rango sin filtrar por creador", async () => {
    const from = new Date("2026-10-01T00:00:00.000Z");
    const to = new Date("2026-10-31T23:59:59.999Z");
    const reminders = [{ id: 1, userId: 3 }, { id: 2, userId: 8 }];
    findAll.mockResolvedValue(reminders);

    const result = await ListRemindersService({ from, to });

    expect(result).toBe(reminders);
    const query = findAll.mock.calls[0][0];
    expect(query.where.dueAt).toBeDefined();
    expect(query.where.userId).toBeUndefined();
    expect(query.include).toHaveLength(3);
  });
});

describe("MarkReminderDoneService", () => {
  beforeEach(() => {
    findByPk.mockReset();
    create.mockReset();
    sequelizeTransaction.mockReset().mockImplementation(callback =>
      callback(transaction)
    );
  });

  it("completa dentro de una transacción y crea la ocurrencia semanal", async () => {
    const reminder = buildReminder({ recurrence: "weekly" });
    findByPk.mockResolvedValue(reminder);
    create.mockResolvedValue({ id: 11 });

    const result = await MarkReminderDoneService(10);

    expect(sequelizeTransaction).toHaveBeenCalledTimes(1);
    expect(findByPk).toHaveBeenCalledWith(10, {
      transaction,
      lock: "UPDATE"
    });
    expect(reminder.update).toHaveBeenCalledWith(
      { status: "done" },
      { transaction }
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 3,
        title: "Llamar",
        dueAt: addDays(reminder.dueAt, 7),
        recurrence: "weekly"
      }),
      { transaction }
    );
    expect(result.nextReminder).toEqual({ id: 11 });
  });

  it("no crea otra ocurrencia si ya está completado", async () => {
    const reminder = buildReminder({ status: "done", recurrence: "daily" });
    findByPk.mockResolvedValue(reminder);

    const result = await MarkReminderDoneService(10);

    expect(reminder.update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(result.nextReminder).toBeUndefined();
  });

  it("no crea una ocurrencia si no repite", async () => {
    const reminder = buildReminder();
    findByPk.mockResolvedValue(reminder);

    const result = await MarkReminderDoneService(10);

    expect(reminder.update).toHaveBeenCalledWith(
      { status: "done" },
      { transaction }
    );
    expect(create).not.toHaveBeenCalled();
    expect(result.nextReminder).toBeUndefined();
  });
});

describe("edición y borrado", () => {
  beforeEach(() => {
    findByPk.mockReset();
  });

  it("no deja editar un recordatorio ajeno", async () => {
    const reminder = buildReminder();
    findByPk.mockResolvedValue(reminder);

    await expect(
      UpdateReminderService(10, { id: 99, profile: "user" }, {
        title: "Cambiar",
        notes: null,
        dueAt: new Date("2026-10-22T18:00:00.000Z"),
        recurrence: "none",
        ticketId: null,
        contactId: null
      })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(reminder.update).not.toHaveBeenCalled();
  });

  it("permite editar al creador y solo reinicia el aviso si cambia la fecha", async () => {
    const reminder = buildReminder();
    findByPk.mockResolvedValue(reminder);
    const dueAt = new Date(reminder.dueAt);

    await UpdateReminderService(10, { id: 3, profile: "user" }, {
      title: "Llamar mañana",
      notes: "Confirmar horario",
      dueAt,
      recurrence: "none",
      ticketId: null,
      contactId: null
    });

    expect(reminder.update).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Llamar mañana" })
    );
    expect(reminder.update.mock.calls[0][0].notifiedAt).toBeUndefined();
  });

  it("no deja borrar un recordatorio ajeno", async () => {
    const reminder = buildReminder();
    findByPk.mockResolvedValue(reminder);

    await expect(
      DeleteReminderService(10, { id: 99, profile: "user" })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(reminder.destroy).not.toHaveBeenCalled();
  });

  it("permite que un admin borre un recordatorio ajeno", async () => {
    const reminder = buildReminder();
    findByPk.mockResolvedValue(reminder);

    await DeleteReminderService(10, { id: 99, profile: "admin" });

    expect(reminder.destroy).toHaveBeenCalledTimes(1);
  });
});

describe("SnoozeReminderService", () => {
  beforeEach(() => {
    findByPk.mockReset();
    modelUpdate.mockReset().mockResolvedValue([1]);
  });

  it("pospone desde ahora y limpia notifiedAt", async () => {
    const reminder = buildReminder({ notifiedAt: new Date() });
    findByPk.mockResolvedValue(reminder);
    const before = Date.now();

    await SnoozeReminderService(10, 15);

    const after = Date.now();
    expect(modelUpdate).toHaveBeenCalledTimes(1);
    const [patch, options] = modelUpdate.mock.calls[0];
    expect(patch.notifiedAt).toBeNull();
    expect(patch.dueAt.getTime()).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
    expect(patch.dueAt.getTime()).toBeLessThanOrEqual(after + 15 * 60 * 1000);
    expect(options.where).toEqual({ id: 10, status: "pending" });
  });

  it("rechaza minutos fuera de 5, 15 y 60", async () => {
    await expect(SnoozeReminderService(10, 7)).rejects.toMatchObject({
      message: "ERR_REMINDER_INVALID_MINUTES",
      statusCode: 400
    });
    expect(findByPk).not.toHaveBeenCalled();
    expect(modelUpdate).not.toHaveBeenCalled();
  });

  it("no pospone un recordatorio completado", async () => {
    findByPk.mockResolvedValue(buildReminder({ status: "done" }));
    modelUpdate.mockResolvedValue([0]);

    await expect(SnoozeReminderService(10, 5)).rejects.toMatchObject({
      message: "ERR_REMINDER_ALREADY_DONE",
      statusCode: 409
    });
  });
});
