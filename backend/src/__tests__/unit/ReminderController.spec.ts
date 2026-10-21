jest.mock("../../models/Reminder", () => ({
  findByPk: jest.fn()
}));
jest.mock("../../libs/socket", () => ({
  getIO: jest.fn()
}));
jest.mock("../../services/ReminderService/CreateReminderService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../services/ReminderService/DeleteReminderService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../services/ReminderService/ListRemindersService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../services/ReminderService/MarkReminderDoneService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../services/ReminderService/SnoozeReminderService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../services/ReminderService/UpdateReminderService", () => ({
  __esModule: true,
  default: jest.fn()
}));

import { Request, Response } from "express";
import Reminder from "../../models/Reminder";
import { getIO } from "../../libs/socket";
import CreateReminderService from "../../services/ReminderService/CreateReminderService";
import ListRemindersService from "../../services/ReminderService/ListRemindersService";
import { index, store } from "../../controllers/ReminderController";

const findByPk = Reminder.findByPk as unknown as jest.Mock;
const createReminder = CreateReminderService as jest.Mock;
const listReminders = ListRemindersService as jest.Mock;
const emit = jest.fn();
const io = { to: jest.fn().mockReturnValue({ emit }) };

const makeResponse = () => {
  const response = {
    status: jest.fn(),
    json: jest.fn()
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response as unknown as Response & typeof response;
};

const makeRequest = (overrides: Record<string, unknown> = {}) =>
  ({
    body: {},
    params: {},
    query: {},
    user: { id: "5", profile: "user" },
    ...overrides
  }) as unknown as Request;

const reminderRecord = {
  id: 12,
  title: "Llamar al cliente",
  notes: null,
  dueAt: new Date("2026-10-21T18:00:00.000Z"),
  status: "pending",
  recurrence: "none",
  notifiedAt: null,
  createdAt: new Date("2026-10-20T18:00:00.000Z"),
  user: { id: 5, name: "Rei" },
  ticket: null,
  contact: null
};

describe("ReminderController", () => {
  beforeEach(() => {
    findByPk.mockReset();
    createReminder.mockReset();
    listReminders.mockReset();
    emit.mockReset();
    (getIO as jest.Mock).mockReturnValue(io);
  });

  it("usa el usuario autenticado como creador y no el userId del body", async () => {
    createReminder.mockResolvedValue({ id: 12 });
    findByPk.mockResolvedValue({
      toJSON: () => reminderRecord
    });
    const request = makeRequest({
      body: {
        userId: 99,
        title: " Llamar al cliente ",
        dueAt: "2026-10-21T18:00:00.000Z",
        recurrence: "none"
      }
    });
    const response = makeResponse();

    await store(request, response);

    expect(createReminder).toHaveBeenCalledWith({
      userId: 5,
      title: "Llamar al cliente",
      dueAt: new Date("2026-10-21T18:00:00.000Z"),
      notes: null,
      recurrence: "none",
      ticketId: null,
      contactId: null
    });
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 12,
        createdBy: { id: 5, name: "Rei" }
      })
    );
    expect(emit).toHaveBeenCalledWith(
      "reminderUpdate",
      expect.objectContaining({ action: "create" })
    );
  });

  it("rechaza vínculos simultáneos a ticket y contacto", async () => {
    const response = makeResponse();
    const request = makeRequest({
      body: {
        title: "Llamar",
        dueAt: "2026-10-21T18:00:00.000Z",
        ticketId: 20,
        contactId: 30
      }
    });

    await expect(store(request, response)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("ERR_REMINDER_INVALID_LINK")
    });
    expect(createReminder).not.toHaveBeenCalled();
  });

  it("exige un rango de fechas acotado para listar", async () => {
    const request = makeRequest({
      query: {
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-04-01T00:00:00.000Z"
      }
    });

    await expect(index(request, makeResponse())).rejects.toMatchObject({
      statusCode: 400,
      message: "ERR_REMINDER_INVALID_DATE_RANGE"
    });
    expect(listReminders).not.toHaveBeenCalled();
  });
});
