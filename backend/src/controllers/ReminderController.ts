import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";
import Contact from "../models/Contact";
import Reminder, { ReminderRecurrence } from "../models/Reminder";
import Ticket from "../models/Ticket";
import User from "../models/User";
import CreateReminderService from "../services/ReminderService/CreateReminderService";
import DeleteReminderService from "../services/ReminderService/DeleteReminderService";
import ListRemindersService from "../services/ReminderService/ListRemindersService";
import MarkReminderDoneService from "../services/ReminderService/MarkReminderDoneService";
import SnoozeReminderService from "../services/ReminderService/SnoozeReminderService";
import UpdateReminderService from "../services/ReminderService/UpdateReminderService";

interface ReminderPayload {
  title: string;
  notes?: string | null;
  dueAt: string;
  recurrence?: ReminderRecurrence;
  ticketId?: number | null;
  contactId?: number | null;
}

type ReminderRelations = Omit<Reminder, "user" | "ticket" | "contact"> & {
  user?: User;
  ticket?: Ticket & { contact?: Contact };
  contact?: Contact;
};

const reminderSchema = Yup.object().shape({
  title: Yup.string().trim().required().max(120),
  notes: Yup.string().trim().max(150).nullable().optional(),
  dueAt: Yup.string()
    .required()
    .test("valid-date", "ERR_REMINDER_INVALID_DUE_AT", value =>
      Boolean(value && Number.isFinite(new Date(value).getTime()))
    ),
  recurrence: Yup.string()
    .oneOf(["none", "daily", "weekly", "monthly"])
    .optional(),
  ticketId: Yup.number().integer().positive().nullable().optional(),
  contactId: Yup.number().integer().positive().nullable().optional()
}).test(
  "single-link",
  "ERR_REMINDER_INVALID_LINK",
  value => !(value?.ticketId && value?.contactId)
);

const parseReminderId = (rawId: string): number => {
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError("ERR_REMINDER_INVALID_ID", 400);
  }
  return id;
};

const parseDateRange = (query: Request["query"]): { from: Date; to: Date } => {
  const { from: rawFrom, to: rawTo } = query;

  if (typeof rawFrom !== "string" || typeof rawTo !== "string") {
    throw new AppError("ERR_REMINDER_DATE_RANGE_REQUIRED", 400);
  }

  const from = new Date(rawFrom);
  const to = new Date(rawTo);
  const rangeMs = to.getTime() - from.getTime();

  if (
    !Number.isFinite(from.getTime()) ||
    !Number.isFinite(to.getTime()) ||
    rangeMs < 0 ||
    rangeMs > 62 * 24 * 60 * 60 * 1000
  ) {
    throw new AppError("ERR_REMINDER_INVALID_DATE_RANGE", 400);
  }

  return { from, to };
};

const validateReminderPayload = async (
  payload: unknown
): Promise<ReminderPayload> => {
  try {
    return (await reminderSchema.validate(payload, {
      abortEarly: false,
      stripUnknown: true
    })) as ReminderPayload;
  } catch (error) {
    if (error instanceof Yup.ValidationError) {
      throw new AppError(error.errors.join(", "), 400);
    }
    throw error;
  }
};

const findReminderWithRelations = async (
  id: number
): Promise<Reminder | null> =>
  Reminder.findByPk(id, {
    attributes: [
      "id",
      "userId",
      "title",
      "notes",
      "dueAt",
      "status",
      "recurrence",
      "ticketId",
      "contactId",
      "notifiedAt",
      "createdAt",
      "updatedAt"
    ],
    include: [
      { model: User, as: "user", attributes: ["id", "name"] },
      {
        model: Ticket,
        as: "ticket",
        attributes: ["id"],
        include: [{ model: Contact, as: "contact", attributes: ["id", "name"] }]
      },
      { model: Contact, as: "contact", attributes: ["id", "name"] }
    ]
  });

const serializeReminder = (reminder: Reminder) => {
  const plain = reminder.toJSON() as ReminderRelations;

  return {
    id: plain.id,
    title: plain.title,
    notes: plain.notes,
    dueAt: plain.dueAt,
    status: plain.status,
    recurrence: plain.recurrence,
    notifiedAt: plain.notifiedAt,
    createdAt: plain.createdAt,
    createdBy: plain.user
      ? { id: plain.user.id, name: plain.user.name }
      : null,
    ticket: plain.ticket
      ? {
          id: plain.ticket.id,
          contactName: plain.ticket.contact?.name || null
        }
      : null,
    contact: plain.contact
      ? { id: plain.contact.id, name: plain.contact.name }
      : null
  };
};

const emitReminderUpdate = (
  action: "create" | "update" | "delete",
  reminder: unknown
): void => {
  try {
    getIO().to("reminders").emit("reminderUpdate", { action, reminder });
  } catch (error) {
    console.error("[REMINDER] No se pudo emitir reminderUpdate", error);
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { from, to } = parseDateRange(req.query);
  const reminders = await ListRemindersService({ from, to });

  return res.json(reminders.map(serializeReminder));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const payload = await validateReminderPayload(req.body);
  const reminder = await CreateReminderService({
    userId: Number(req.user.id),
    title: payload.title,
    dueAt: new Date(payload.dueAt),
    notes: payload.notes ?? null,
    recurrence: payload.recurrence ?? "none",
    ticketId: payload.ticketId ?? null,
    contactId: payload.contactId ?? null
  });

  const withRelations = await findReminderWithRelations(reminder.id);
  const serialized = serializeReminder(withRelations || reminder);
  emitReminderUpdate("create", serialized);

  return res.status(201).json(serialized);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const id = parseReminderId(req.params.id);
  const payload = await validateReminderPayload(req.body);

  await UpdateReminderService(id, req.user, {
    title: payload.title,
    dueAt: new Date(payload.dueAt),
    notes: payload.notes ?? null,
    recurrence: payload.recurrence ?? "none",
    ticketId: payload.ticketId ?? null,
    contactId: payload.contactId ?? null
  });

  const withRelations = await findReminderWithRelations(id);
  if (!withRelations) {
    throw new AppError("ERR_REMINDER_NOT_FOUND", 404);
  }

  const serialized = serializeReminder(withRelations);
  emitReminderUpdate("update", serialized);

  return res.json(serialized);
};

export const markDone = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const id = parseReminderId(req.params.id);
  const { reminder, nextReminder } = await MarkReminderDoneService(id);
  const withRelations = await findReminderWithRelations(reminder.id);
  const serialized = serializeReminder(withRelations || reminder);

  emitReminderUpdate("update", serialized);

  if (!nextReminder) {
    return res.json({ reminder: serialized });
  }

  const nextWithRelations = await findReminderWithRelations(nextReminder.id);
  const serializedNext = serializeReminder(nextWithRelations || nextReminder);
  emitReminderUpdate("create", serializedNext);

  return res.json({ reminder: serialized, nextReminder: serializedNext });
};

export const snooze = async (req: Request, res: Response): Promise<Response> => {
  const id = parseReminderId(req.params.id);
  const { minutes } = req.body as { minutes?: number };
  const reminder = await SnoozeReminderService(id, Number(minutes));
  const withRelations = await findReminderWithRelations(reminder.id);
  const serialized = serializeReminder(withRelations || reminder);

  emitReminderUpdate("update", serialized);

  return res.json(serialized);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const id = parseReminderId(req.params.id);

  await DeleteReminderService(id, req.user);
  emitReminderUpdate("delete", { id });

  return res.status(200).json({ message: "ERR_REMINDER_DELETED" });
};
