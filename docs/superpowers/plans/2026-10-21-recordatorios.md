# Recordatorios con agenda y alarma — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Goal:** Agregar recordatorios compartidos con fecha/hora, repetición, agenda mensual y alarma para todo el equipo en Press-Ticket.

**Architecture:** Tabla `Reminders` en MySQL + servicios REST en el backend Express/Sequelize, un scheduler de 30 s que emite a un room Socket.IO de usuarios autenticados, y una página React con grilla mensual más un componente global de alarma. Sin dependencias nuevas.

**Tech Stack:** Node 18 + TypeScript + Express + Sequelize (`sequelize-typescript`) + Socket.IO + Yup; React (CRA) + MUI v5 + date-fns + `use-sound`.

**Spec:** `docs/superpowers/specs/2026-10-21-recordatorios-design.md`

## Restricciones globales

- La UI es 100 % en español; textos nuevos con `defaultValue` en español.
- No agregar dependencias npm.
- No tocar `IA/` ni la app Android.
- Fechas: se guardan en UTC (`dueAt` Date) y se muestran con la hora local del navegador.
- El deploy corre `db:migrate` antes de reiniciar el backend; la migración debe ser idempotente respecto de datos existentes (tabla nueva, sin backfill).
- Tests del backend se ejecutan sin `pretest` para no tocar la DB de test:
  `npx jest --runInBand src/__tests__/unit/<archivo>.spec.ts`
- Commits convencionales en español, uno por tarea.

## Refinamientos técnicos aplicados

- El scheduler usa un guard para no solapar barridos y reclama cada vencimiento
  mediante `UPDATE` condicional (`pending`, vencida y sin `notifiedAt`); así no
  duplica alarmas al competir con snooze o completado.
- Solo sockets que validaron el JWT entran al room `reminders`; el evento no se
  emite a sockets no autenticados.
- Completar una repetición bloquea la fila dentro de una transacción, para crear
  una sola siguiente ocurrencia aunque dos usuarios pulsen «Listo» a la vez.
- Posponer actualiza solo filas `pending`, desde la hora actual; los recordatorios
  ya completados responden `409`.
- GET requiere `from` y `to`, con un rango máximo de 62 días. Los vínculos se
  validan contra la existencia del ticket/contacto.
- Los perfiles `admin` y `masteradmin` pueden editar o borrar recordatorios
  ajenos; usuarios normales solo los de su autoría.

## Estructura de archivos

Backend:

| Archivo | Responsabilidad |
| --- | --- |
| `backend/src/models/Reminder.ts` | modelo Sequelize con asociaciones a User, Ticket y Contact |
| `backend/src/database/migrations/20261021010000-create-reminders.ts` | crear tabla e índices |
| `backend/src/database/index.ts` | registrar el modelo en la instancia de Sequelize |
| `backend/src/helpers/getNextReminderDueAt.ts` | calcular la próxima ocurrencia |
| `backend/src/services/ReminderService/ReminderScheduler.ts` | barrido de vencidos + emit socket |
| `backend/src/services/ReminderService/ReminderPermissions.ts` | regla creador/admin |
| `backend/src/services/ReminderService/CreateReminderService.ts` | alta |
| `backend/src/services/ReminderService/ListRemindersService.ts` | listado por rango con includes |
| `backend/src/services/ReminderService/UpdateReminderService.ts` | edición con permisos |
| `backend/src/services/ReminderService/DeleteReminderService.ts` | borrado con permisos |
| `backend/src/services/ReminderService/MarkReminderDoneService.ts` | completar + siguiente ocurrencia |
| `backend/src/services/ReminderService/SnoozeReminderService.ts` | posponer 5/15/60 |
| `backend/src/controllers/ReminderController.ts` | validación, serialización y evento `reminderUpdate` |
| `backend/src/routes/routeRegistry.ts` | montar `/reminders` |
| `backend/src/server.ts` | arrancar/detener el scheduler |

Frontend:

| Archivo | Responsabilidad |
| --- | --- |
| `frontend/src/pages/Reminders/index.js` | grilla mensual + panel del día + permiso de notificaciones |
| `frontend/src/components/ReminderModal/index.js` | alta/edición y borrado |
| `frontend/src/components/ReminderAlarm/index.js` | escucha socket, sonido y diálogo |
| `frontend/src/assets/reminder-alarm.wav` | sonido propio (generado por script) |
| `frontend/scripts/generate-reminder-alarm.js` | genera el WAV una sola vez |
| `frontend/src/routes/index.js` | ruta `/reminders` |
| `frontend/src/layout/MainListItems.js` | ítem de menú |
| `frontend/src/layout/index.js` | montar `<ReminderAlarm />` |

---

### Task 1: Modelo, migración y registro

**Files:**
- Create: `backend/src/models/Reminder.ts`
- Create: `backend/src/database/migrations/20261021010000-create-reminders.ts`
- Modify: `backend/src/database/index.ts:1-60`

**Interfaces:**
- Consumes: nada.
- Produces: `Reminder` (default export) con campos `id, userId, title, notes, dueAt, status, recurrence, ticketId, contactId, notifiedAt, createdAt, updatedAt` y asociaciones `user`, `ticket`, `contact`.

- [ ] **Step 1: Crear el modelo**

`backend/src/models/Reminder.ts`:

```ts
import {
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import Contact from "./Contact";
import Ticket from "./Ticket";
import User from "./User";

export type ReminderStatus = "pending" | "done";
export type ReminderRecurrence = "none" | "daily" | "weekly" | "monthly";

@Table
class Reminder extends Model<Reminder> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  })
  user: User;

  @Column(DataType.STRING(120))
  title: string;

  @Column(DataType.STRING(150))
  notes: string;

  @Column(DataType.DATE)
  dueAt: Date;

  @Default("pending")
  @Column(DataType.ENUM("pending", "done"))
  status: ReminderStatus;

  @Default("none")
  @Column(DataType.ENUM("none", "daily", "weekly", "monthly"))
  recurrence: ReminderRecurrence;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket, {
    onDelete: "SET NULL",
    onUpdate: "CASCADE"
  })
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact, {
    onDelete: "SET NULL",
    onUpdate: "CASCADE"
  })
  contact: Contact;

  @Column(DataType.DATE)
  notifiedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Reminder;
```

- [ ] **Step 2: Crear la migración**

`backend/src/database/migrations/20261021010000-create-reminders.ts`:

```ts
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("Reminders", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      title: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      notes: {
        type: DataTypes.STRING(150),
        allowNull: true
      },
      dueAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("pending", "done"),
        allowNull: false,
        defaultValue: "pending"
      },
      recurrence: {
        type: DataTypes.ENUM("none", "daily", "weekly", "monthly"),
        allowNull: false,
        defaultValue: "none"
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      notifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("Reminders", ["status", "dueAt"], {
      name: "reminders_status_due_at"
    });
    await queryInterface.addIndex("Reminders", ["dueAt"], {
      name: "reminders_due_at"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("Reminders");
  }
};
```

- [ ] **Step 3: Registrar el modelo**

En `backend/src/database/index.ts`: agregar `import Reminder from "../models/Reminder";` junto a los demás imports y `Reminder,` dentro del array `models` (al final del listado).

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit` (en `backend/`)
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/Reminder.ts backend/src/database/migrations/20261021010000-create-reminders.ts backend/src/database/index.ts
git commit -m "feat(recordatorios): agrega modelo y migracion de recordatorios"
```

---

### Task 2: Cálculo de la próxima ocurrencia

**Files:**
- Create: `backend/src/helpers/getNextReminderDueAt.ts`
- Test: `backend/src/__tests__/unit/ReminderRecurrence.spec.ts`

**Interfaces:**
- Consumes: `ReminderRecurrence` de `models/Reminder`.
- Produces: `getNextReminderDueAt(dueAt: Date, recurrence: ReminderRecurrence): Date | undefined`.

- [ ] **Step 1: Escribir el test que falla**

`backend/src/__tests__/unit/ReminderRecurrence.spec.ts`:

```ts
import { addDays, addMonths } from "date-fns";
import getNextReminderDueAt from "../../helpers/getNextReminderDueAt";

describe("getNextReminderDueAt", () => {
  const dueAt = new Date("2026-10-21T18:00:00.000Z");

  it("no devuelve fecha cuando no repite", () => {
    expect(getNextReminderDueAt(dueAt, "none")).toBeUndefined();
  });

  it("suma un dia en la repeticion diaria", () => {
    expect(getNextReminderDueAt(dueAt, "daily")).toEqual(addDays(dueAt, 1));
  });

  it("suma siete dias en la repeticion semanal", () => {
    expect(getNextReminderDueAt(dueAt, "weekly")).toEqual(addDays(dueAt, 7));
  });

  it("suma un mes y recorta fin de mes", () => {
    const endOfMonth = new Date("2026-01-31T12:00:00.000Z");
    expect(getNextReminderDueAt(endOfMonth, "monthly")).toEqual(
      addMonths(endOfMonth, 1)
    );
  });
});
```

- [ ] **Step 2: Ejecutar y ver el fallo**

Run: `npx jest --runInBand src/__tests__/unit/ReminderRecurrence.spec.ts`
Expected: FAIL `Cannot find module '../../helpers/getNextReminderDueAt'`.

- [ ] **Step 3: Implementar el helper**

`backend/src/helpers/getNextReminderDueAt.ts`:

```ts
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
```

- [ ] **Step 4: Ejecutar el test**

Run: `npx jest --runInBand src/__tests__/unit/ReminderRecurrence.spec.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/helpers/getNextReminderDueAt.ts backend/src/__tests__/unit/ReminderRecurrence.spec.ts
git commit -m "feat(recordatorios): calcula la proxima ocurrencia de un recordatorio"
```

---

### Task 3: Scheduler de vencidos

**Files:**
- Create: `backend/src/services/ReminderService/ReminderScheduler.ts`
- Test: `backend/src/__tests__/unit/ReminderScheduler.spec.ts`

**Interfaces:**
- Consumes: `Reminder`, `getIO`, `logger`.
- Produces: `runReminderSweep(now?: Date): Promise<number>`, `startReminderScheduler(): void`, `stopReminderScheduler(): void`, `SWEEP_INTERVAL_MS = 30000`.

- [ ] **Step 1: Escribir el test que falla**

`backend/src/__tests__/unit/ReminderScheduler.spec.ts`:

```ts
jest.mock("../../models/Reminder", () => ({
  findAll: jest.fn()
}));
jest.mock("../../libs/socket", () => ({
  getIO: jest.fn()
}));
jest.mock("../../utils/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

import Reminder from "../../models/Reminder";
import { getIO } from "../../libs/socket";
import { runReminderSweep } from "../../services/ReminderService/ReminderScheduler";

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
    update: jest.fn().mockResolvedValue(undefined),
    toJSON: jest.fn(() => data)
  };
};

describe("runReminderSweep", () => {
  it("marca y emite cada recordatorio vencido una sola vez", async () => {
    const first = buildReminder(1);
    const second = buildReminder(2);
    (Reminder.findAll as unknown as jest.Mock).mockResolvedValue([first, second]);
    const emit = jest.fn();
    (getIO as jest.Mock).mockReturnValue({ emit });

    const now = new Date("2026-10-21T19:00:00.000Z");
    const emitted = await runReminderSweep(now);

    expect(emitted).toBe(2);
    expect(Reminder.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "pending",
          notifiedAt: null
        })
      })
    );
    expect(first.update).toHaveBeenCalledWith({ notifiedAt: now });
    expect(second.update).toHaveBeenCalledWith({ notifiedAt: now });
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith("reminder", first.toJSON());
  });

  it("no corta el barrido si falla una emision", async () => {
    const first = buildReminder(1);
    const second = buildReminder(2);
    (Reminder.findAll as unknown as jest.Mock).mockResolvedValue([first, second]);
    const emit = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("socket caido");
      })
      .mockImplementationOnce(() => undefined);
    (getIO as jest.Mock).mockReturnValue({ emit });

    const emitted = await runReminderSweep(new Date());

    expect(emitted).toBe(2);
    expect(second.update).toHaveBeenCalled();
    expect(second.toJSON).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar y ver el fallo**

Run: `npx jest --runInBand src/__tests__/unit/ReminderScheduler.spec.ts`
Expected: FAIL `Cannot find module '../../services/ReminderService/ReminderScheduler'`.

- [ ] **Step 3: Implementar el scheduler**

`backend/src/services/ReminderService/ReminderScheduler.ts`:

```ts
import { Op } from "sequelize";
import { getIO } from "../../libs/socket";
import Reminder from "../../models/Reminder";
import { logger } from "../../utils/logger";

export const SWEEP_INTERVAL_MS = 30000;

let timer: NodeJS.Timeout | undefined;

export const runReminderSweep = async (now = new Date()): Promise<number> => {
  const dueReminders = await Reminder.findAll({
    where: {
      status: "pending",
      dueAt: { [Op.lte]: now },
      notifiedAt: null
    }
  });

  let emitted = 0;

  for (const reminder of dueReminders) {
    await reminder.update({ notifiedAt: now });
    emitted += 1;

    try {
      getIO().emit("reminder", reminder.toJSON());
    } catch (error) {
      logger.error(
        `[REMINDER] No se pudo emitir el recordatorio ${reminder.id}: ${
          (error as Error)?.message || error
        }`
      );
    }
  }

  return emitted;
};

export const startReminderScheduler = (): void => {
  if (timer) {
    return;
  }

  timer = setInterval(() => {
    runReminderSweep().catch(error => {
      logger.error(
        `[REMINDER] Fallo el barrido de recordatorios: ${
          (error as Error)?.message || error
        }`
      );
    });
  }, SWEEP_INTERVAL_MS);

  logger.info(
    `[REMINDER] Scheduler de recordatorios activo (cada ${SWEEP_INTERVAL_MS / 1000}s)`
  );
};

export const stopReminderScheduler = (): void => {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
};
```

- [ ] **Step 4: Ejecutar el test**

Run: `npx jest --runInBand src/__tests__/unit/ReminderScheduler.spec.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/ReminderService/ReminderScheduler.ts backend/src/__tests__/unit/ReminderScheduler.spec.ts
git commit -m "feat(recordatorios): agrega scheduler que avisa los vencidos por socket"
```

---

### Task 4: Servicios con permisos, recurrencia y snooze

**Files:**
- Create: `backend/src/services/ReminderService/ReminderPermissions.ts`
- Create: `backend/src/services/ReminderService/CreateReminderService.ts`
- Create: `backend/src/services/ReminderService/ListRemindersService.ts`
- Create: `backend/src/services/ReminderService/UpdateReminderService.ts`
- Create: `backend/src/services/ReminderService/DeleteReminderService.ts`
- Create: `backend/src/services/ReminderService/MarkReminderDoneService.ts`
- Create: `backend/src/services/ReminderService/SnoozeReminderService.ts`
- Test: `backend/src/__tests__/unit/ReminderServices.spec.ts`

**Interfaces:**
- Consumes: `Reminder`, `getNextReminderDueAt`, `AppError`.
- Produces:
  - `RequestingUser { id: number | string; profile?: string }`
  - `assertCanManageReminder(reminder, user): void`
  - `CreateReminderService(data): Promise<Reminder>`
  - `ListRemindersService({ from, to }): Promise<Reminder[]>`
  - `UpdateReminderService(id, user, data): Promise<Reminder>`
  - `DeleteReminderService(id, user): Promise<void>`
  - `MarkReminderDoneService(id): Promise<{ reminder: Reminder; nextReminder?: Reminder }>`
  - `SnoozeReminderService(id, minutes): Promise<Reminder>`

- [ ] **Step 1: Escribir los tests que fallan**

`backend/src/__tests__/unit/ReminderServices.spec.ts`:

```ts
jest.mock("../../models/Reminder", () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn()
}));
jest.mock("../../utils/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

import { addDays } from "date-fns";
import Reminder from "../../models/Reminder";
import { assertCanManageReminder } from "../../services/ReminderService/ReminderPermissions";
import MarkReminderDoneService from "../../services/ReminderService/MarkReminderDoneService";
import SnoozeReminderService from "../../services/ReminderService/SnoozeReminderService";

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
  update: jest.fn().mockImplementation(function update(patch) {
    Object.assign(this, patch);
    return Promise.resolve(this);
  }),
  ...overrides
});

describe("permisos de recordatorios", () => {
  it("deja editar al creador", () => {
    expect(() =>
      assertCanManageReminder(buildReminder() as any, { id: 3, profile: "user" })
    ).not.toThrow();
  });

  it("deja editar a un admin", () => {
    expect(() =>
      assertCanManageReminder(buildReminder() as any, { id: 99, profile: "ADMIN" })
    ).not.toThrow();
  });

  it("rechaza a otro usuario", () => {
    expect(() =>
      assertCanManageReminder(buildReminder() as any, { id: 99, profile: "user" })
    ).toThrow("ERR_REMINDER_FORBIDDEN");
  });
});

describe("MarkReminderDoneService", () => {
  it("crea la siguiente ocurrencia cuando repite semanalmente", async () => {
    const reminder = buildReminder({ recurrence: "weekly" });
    (Reminder.findByPk as unknown as jest.Mock).mockResolvedValue(reminder);
    (Reminder.create as unknown as jest.Mock).mockResolvedValue({ id: 11 });

    const result = await MarkReminderDoneService(10);

    expect(reminder.update).toHaveBeenCalledWith({ status: "done" });
    expect(Reminder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 3,
        title: "Llamar",
        dueAt: addDays(reminder.dueAt, 7),
        recurrence: "weekly"
      })
    );
    expect(result.nextReminder).toEqual({ id: 11 });
  });

  it("no crea otra ocurrencia si no repite", async () => {
    const reminder = buildReminder();
    (Reminder.findByPk as unknown as jest.Mock).mockResolvedValue(reminder);

    const result = await MarkReminderDoneService(10);

    expect(Reminder.create).not.toHaveBeenCalled();
    expect(result.nextReminder).toBeUndefined();
  });
});

describe("SnoozeReminderService", () => {
  it("pospone desde ahora y limpia notifiedAt", async () => {
    const reminder = buildReminder({ notifiedAt: new Date() });
    (Reminder.findByPk as unknown as jest.Mock).mockResolvedValue(reminder);

    await SnoozeReminderService(10, 15);

    expect(reminder.update).toHaveBeenCalledWith({
      dueAt: expect.any(Date),
      notifiedAt: null
    });
    const patch = reminder.update.mock.calls[0][0];
    expect(patch.dueAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("rechaza minutos fuera de 5, 15 y 60", async () => {
    await expect(SnoozeReminderService(10, 7)).rejects.toThrow(
      "ERR_REMINDER_INVALID_MINUTES"
    );
  });
});
```

- [ ] **Step 2: Ejecutar y ver los fallos**

Run: `npx jest --runInBand src/__tests__/unit/ReminderServices.spec.ts`
Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Implementar permisos**

`backend/src/services/ReminderService/ReminderPermissions.ts`:

```ts
import AppError from "../../errors/AppError";
import Reminder from "../../models/Reminder";

export interface RequestingUser {
  id: number | string;
  profile?: string;
}

export const isAdmin = (user?: RequestingUser): boolean =>
  String(user?.profile || "").toLowerCase() === "admin";

export const assertCanManageReminder = (
  reminder: Reminder,
  user: RequestingUser
): void => {
  const isOwner = Number(reminder.userId) === Number(user?.id);

  if (!isOwner && !isAdmin(user)) {
    throw new AppError("ERR_REMINDER_FORBIDDEN", 403);
  }
};
```

- [ ] **Step 4: Implementar alta y listado**

`CreateReminderService.ts`:

```ts
import Reminder, { ReminderRecurrence } from "../../models/Reminder";

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
```

`ListRemindersService.ts`:

```ts
import { Op, WhereOptions } from "sequelize";
import Contact from "../../models/Contact";
import Reminder from "../../models/Reminder";
import Ticket from "../../models/Ticket";
import User from "../../models/User";

interface Request {
  from?: string;
  to?: string;
}

const ListRemindersService = async ({ from, to }: Request): Promise<Reminder[]> => {
  const where: WhereOptions = {};

  if (from || to) {
    const dueAt: Record<string, Date> = {};
    if (from) dueAt[Op.gte as unknown as string] = new Date(from);
    if (to) dueAt[Op.lte as unknown as string] = new Date(to);
    (where as Record<string, unknown>).dueAt = dueAt;
  }

  return Reminder.findAll({
    where,
    include: [
      { model: User, as: "user", attributes: ["id", "name"] },
      {
        model: Ticket,
        as: "ticket",
        attributes: ["id"],
        include: [{ model: Contact, as: "contact", attributes: ["id", "name"] }]
      },
      { model: Contact, as: "contact", attributes: ["id", "name"] }
    ],
    order: [["dueAt", "ASC"]]
  });
};

export default ListRemindersService;
```

- [ ] **Step 5: Implementar edición y borrado**

`UpdateReminderService.ts`:

```ts
import AppError from "../../errors/AppError";
import Reminder, { ReminderRecurrence } from "../../models/Reminder";
import { assertCanManageReminder, RequestingUser } from "./ReminderPermissions";

interface Request {
  title?: string;
  notes?: string | null;
  dueAt?: Date;
  recurrence?: ReminderRecurrence;
  ticketId?: number | null;
  contactId?: number | null;
}

const UpdateReminderService = async (
  id: number,
  user: RequestingUser,
  data: Request
): Promise<Reminder> => {
  const reminder = await Reminder.findByPk(id);

  if (!reminder) {
    throw new AppError("ERR_REMINDER_NOT_FOUND", 404);
  }

  assertCanManageReminder(reminder, user);

  const patch: Request & { notifiedAt?: Date | null } = { ...data };

  if (data.dueAt) {
    patch.notifiedAt = null;
  }

  await reminder.update(patch);

  return reminder;
};

export default UpdateReminderService;
```

`DeleteReminderService.ts`:

```ts
import AppError from "../../errors/AppError";
import Reminder from "../../models/Reminder";
import { assertCanManageReminder, RequestingUser } from "./ReminderPermissions";

const DeleteReminderService = async (
  id: number,
  user: RequestingUser
): Promise<void> => {
  const reminder = await Reminder.findByPk(id);

  if (!reminder) {
    throw new AppError("ERR_REMINDER_NOT_FOUND", 404);
  }

  assertCanManageReminder(reminder, user);
  await reminder.destroy();
};

export default DeleteReminderService;
```

- [ ] **Step 6: Implementar completar y posponer**

`MarkReminderDoneService.ts`:

```ts
import AppError from "../../errors/AppError";
import getNextReminderDueAt from "../../helpers/getNextReminderDueAt";
import Reminder from "../../models/Reminder";

interface Result {
  reminder: Reminder;
  nextReminder?: Reminder;
}

const MarkReminderDoneService = async (id: number): Promise<Result> => {
  const reminder = await Reminder.findByPk(id);

  if (!reminder) {
    throw new AppError("ERR_REMINDER_NOT_FOUND", 404);
  }

  if (reminder.status === "done") {
    return { reminder };
  }

  await reminder.update({ status: "done" });

  const nextDueAt = getNextReminderDueAt(reminder.dueAt, reminder.recurrence);

  if (!nextDueAt) {
    return { reminder };
  }

  const nextReminder = await Reminder.create({
    userId: reminder.userId,
    title: reminder.title,
    notes: reminder.notes,
    dueAt: nextDueAt,
    recurrence: reminder.recurrence,
    ticketId: reminder.ticketId,
    contactId: reminder.contactId
  });

  return { reminder, nextReminder };
};

export default MarkReminderDoneService;
```

`SnoozeReminderService.ts`:

```ts
import { addMinutes } from "date-fns";
import AppError from "../../errors/AppError";
import Reminder from "../../models/Reminder";

const ALLOWED_MINUTES = [5, 15, 60];

const SnoozeReminderService = async (
  id: number,
  minutes: number
): Promise<Reminder> => {
  if (!ALLOWED_MINUTES.includes(Number(minutes))) {
    throw new AppError("ERR_REMINDER_INVALID_MINUTES", 400);
  }

  const reminder = await Reminder.findByPk(id);

  if (!reminder) {
    throw new AppError("ERR_REMINDER_NOT_FOUND", 404);
  }

  await reminder.update({
    dueAt: addMinutes(new Date(), Number(minutes)),
    notifiedAt: null
  });

  return reminder;
};

export default SnoozeReminderService;
```

- [ ] **Step 7: Ejecutar los tests**

Run: `npx jest --runInBand src/__tests__/unit/ReminderServices.spec.ts`
Expected: 7 tests PASS.

- [ ] **Step 8: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 9: Commit**

```bash
git add backend/src/services/ReminderService backend/src/__tests__/unit/ReminderServices.spec.ts
git commit -m "feat(recordatorios): servicios de alta, edicion, completado y posposicion"
```

---

### Task 5: Controlador, validación y rutas

**Files:**
- Create: `backend/src/controllers/ReminderController.ts`
- Modify: `backend/src/routes/routeRegistry.ts`

**Interfaces:**
- Consumes: servicios de Task 4, `getIO`, `AppError`, `isAuth`.
- Produces: endpoints `GET/POST /reminders`, `PUT/DELETE /reminders/:id`, `PATCH /reminders/:id/status`, `POST /reminders/:id/snooze`; evento `reminderUpdate` con `{ action, reminder }`.

- [ ] **Step 1: Escribir el controlador**

`backend/src/controllers/ReminderController.ts`:

```ts
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

const reminderSchema = Yup.object().shape({
  title: Yup.string().trim().required().max(120),
  notes: Yup.string().trim().max(150).nullable(),
  dueAt: Yup.date().required(),
  recurrence: Yup.string().oneOf(["none", "daily", "weekly", "monthly"]),
  ticketId: Yup.number().integer().nullable(),
  contactId: Yup.number().integer().nullable()
});

const serializeReminder = (reminder: Reminder) => {
  const plain = reminder.toJSON() as any;

  return {
    id: plain.id,
    title: plain.title,
    notes: plain.notes,
    dueAt: plain.dueAt,
    status: plain.status,
    recurrence: plain.recurrence,
    notifiedAt: plain.notifiedAt,
    createdAt: plain.createdAt,
    createdBy: plain.user ? { id: plain.user.id, name: plain.user.name } : null,
    ticket: plain.ticket
      ? {
          id: plain.ticket.id,
          contactName: plain.ticket.contact?.name || null
        }
      : null,
    contact: plain.contact ? { id: plain.contact.id, name: plain.contact.name } : null
  };
};

const findReminderWithRelations = async (id: number): Promise<Reminder | null> =>
  Reminder.findByPk(id, {
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

const emitReminderUpdate = (action: "create" | "update" | "delete", reminder: unknown) => {
  try {
    getIO().emit("reminderUpdate", { action, reminder });
  } catch (error) {
    console.error("[REMINDER] No se pudo emitir reminderUpdate", error);
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { from, to } = req.query as { from?: string; to?: string };
  const reminders = await ListRemindersService({ from, to });

  return res.json(reminders.map(serializeReminder));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const payload = req.body as ReminderPayload;

  try {
    await reminderSchema.validate(payload);
  } catch (err) {
    throw new AppError((err as Error).message);
  }

  const reminder = await CreateReminderService({
    userId: Number(req.user.id),
    title: payload.title.trim(),
    dueAt: new Date(payload.dueAt),
    notes: payload.notes ?? null,
    recurrence: payload.recurrence ?? "none",
    ticketId: payload.ticketId ?? null,
    contactId: payload.contactId ?? null
  });

  const withRelations = await findReminderWithRelations(reminder.id);
  const serialized = serializeReminder(withRelations || reminder);

  emitReminderUpdate("create", serialized);

  return res.status(200).json(serialized);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const payload = req.body as ReminderPayload;

  try {
    await reminderSchema.validate(payload);
  } catch (err) {
    throw new AppError((err as Error).message);
  }

  await UpdateReminderService(Number(req.params.id), req.user, {
    title: payload.title.trim(),
    dueAt: new Date(payload.dueAt),
    notes: payload.notes ?? null,
    recurrence: payload.recurrence ?? "none",
    ticketId: payload.ticketId ?? null,
    contactId: payload.contactId ?? null
  });

  const withRelations = await findReminderWithRelations(Number(req.params.id));
  const serialized = serializeReminder(withRelations as Reminder);

  emitReminderUpdate("update", serialized);

  return res.json(serialized);
};

export const markDone = async (req: Request, res: Response): Promise<Response> => {
  const { reminder, nextReminder } = await MarkReminderDoneService(
    Number(req.params.id)
  );

  const serialized = serializeReminder(
    (await findReminderWithRelations(reminder.id)) || reminder
  );

  emitReminderUpdate("update", serialized);

  if (nextReminder) {
    const serializedNext = serializeReminder(
      (await findReminderWithRelations(nextReminder.id)) || nextReminder
    );
    emitReminderUpdate("create", serializedNext);
    return res.json({ reminder: serialized, nextReminder: serializedNext });
  }

  return res.json({ reminder: serialized });
};

export const snooze = async (req: Request, res: Response): Promise<Response> => {
  const { minutes } = req.body as { minutes?: number };
  const reminder = await SnoozeReminderService(
    Number(req.params.id),
    Number(minutes)
  );

  const serialized = serializeReminder(
    (await findReminderWithRelations(reminder.id)) || reminder
  );

  emitReminderUpdate("update", serialized);

  return res.json(serialized);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);

  await DeleteReminderService(id, req.user);

  emitReminderUpdate("delete", { id });

  return res.status(200).json({ message: "ERR_REMINDER_DELETED" });
};
```

- [ ] **Step 2: Registrar las rutas**

En `backend/src/routes/routeRegistry.ts`:

1. Agregar el import junto a los demás controladores:

```ts
import * as ReminderController from "../controllers/ReminderController";
```

2. Agregar este grupo dentro del array (por ejemplo, después del grupo `quickAnswers`):

```ts
  // reminders
  {
    path: "/reminders",
    routes: [
    { method: "get", path: "/", middlewares: [isAuth], handler: ReminderController.index },
    { method: "post", path: "/", middlewares: [isAuth], handler: ReminderController.store },
    { method: "put", path: "/:id", middlewares: [isAuth], handler: ReminderController.update },
    { method: "patch", path: "/:id/status", middlewares: [isAuth], handler: ReminderController.markDone },
    { method: "post", path: "/:id/snooze", middlewares: [isAuth], handler: ReminderController.snooze },
    { method: "delete", path: "/:id", middlewares: [isAuth], handler: ReminderController.remove }
    ]
  },
```

- [ ] **Step 3: Verificar tipos y tests**

Run: `npx tsc --noEmit` y `npx jest --runInBand src/__tests__/unit/ReminderServices.spec.ts src/__tests__/unit/ReminderScheduler.spec.ts src/__tests__/unit/ReminderRecurrence.spec.ts`
Expected: sin errores de tipos y 13 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/ReminderController.ts backend/src/routes/routeRegistry.ts
git commit -m "feat(recordatorios): expone la API de recordatorios"
```

---

### Task 6: Arranque y apagado del scheduler

**Files:**
- Modify: `backend/src/server.ts`

**Interfaces:**
- Consumes: `startReminderScheduler`, `stopReminderScheduler`.
- Produces: scheduler activo mientras corre el backend.

- [ ] **Step 1: Integrar en `server.ts`**

Dejar el archivo así:

```ts
import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { stopAllTelegramSessions } from "./libs/telegram";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { StopAllWhatsAppSessions } from "./services/WbotServices/StartWhatsAppSession";
import {
  startReminderScheduler,
  stopReminderScheduler
} from "./services/ReminderService/ReminderScheduler";

const server = app.listen(process.env.PORT, () => {
  logger.info(`Servidor iniciado na porta: ${process.env.PORT}`);
});

initIO(server);
StartAllWhatsAppsSessions();
startReminderScheduler();

// Al recibir SIGTERM/SIGINT (p. ej. `pm2 restart`), destruir los clients de
// wwebjs para que sus browsers de Chromium se cierren antes de salir. Si se
// dejan huérfanos, siguen conectados a WhatsApp Web con el mismo LocalAuth y
// la instancia nueva entra en conflicto de sesión: WhatsApp mata ambos.
gracefulShutdown(server, {
  onShutdown: async () => {
    logger.info("Deteniendo sesiones de WhatsApp y Telegram...");
    stopReminderScheduler();
    await StopAllWhatsAppSessions();
    stopAllTelegramSessions();
  }
});
```

- [ ] **Step 2: Compilar**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat(recordatorios): arranca y detiene el scheduler con el servidor"
```

---

### Task 7: Sonido propio de alarma

**Files:**
- Create: `frontend/scripts/generate-reminder-alarm.js`
- Create: `frontend/src/assets/reminder-alarm.wav` (generado)

**Interfaces:**
- Produces: asset WAV mono 44.1 kHz con tres pitidos ascendentes, distinto de `sound.mp3`.

- [ ] **Step 1: Escribir el generador**

`frontend/scripts/generate-reminder-alarm.js`:

```js
const fs = require("fs");
const path = require("path");

const sampleRate = 44100;
const beeps = [
  { frequency: 880, duration: 0.22 },
  { frequency: 1046, duration: 0.22 },
  { frequency: 1318, duration: 0.34 }
];
const gap = 0.12;
const totalSamples = Math.ceil(
  (beeps.reduce((sum, beep) => sum + beep.duration + gap, 0) + 0.2) * sampleRate
);
const samples = new Int16Array(totalSamples);

let offset = Math.floor(0.1 * sampleRate);

beeps.forEach(({ frequency, duration }) => {
  const length = Math.floor(duration * sampleRate);
  for (let index = 0; index < length; index += 1) {
    const envelope = Math.min(1, index / 200, (length - index) / 400);
    const value =
      Math.sin((2 * Math.PI * frequency * index) / sampleRate) *
      0.35 *
      envelope;
    samples[offset + index] = Math.round(value * 32767);
  }
  offset += length + Math.floor(gap * sampleRate);
});

const dataSize = samples.length * 2;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

samples.forEach((sample, index) => {
  buffer.writeInt16LE(sample, 44 + index * 2);
});

const target = path.join(__dirname, "..", "src", "assets", "reminder-alarm.wav");
fs.writeFileSync(target, buffer);
console.log(`Generado ${target} (${buffer.length} bytes)`);
```

- [ ] **Step 2: Generar el asset**

Run: `node scripts/generate-reminder-alarm.js` (en `frontend/`)
Expected: `Generado ...reminder-alarm.wav (XXXX bytes)`.

- [ ] **Step 3: Verificar que existe y pesa poco**

Run: `Get-Item src/assets/reminder-alarm.wav`
Expected: archivo de unos 70-90 KB.

- [ ] **Step 4: Commit**

```bash
git add frontend/scripts/generate-reminder-alarm.js frontend/src/assets/reminder-alarm.wav
git commit -m "feat(recordatorios): agrega un sonido de alarma propio"
```

---

### Task 8: Página, modal, ruta y menú

**Files:**
- Create: `frontend/src/pages/Reminders/index.js`
- Create: `frontend/src/components/ReminderModal/index.js`
- Modify: `frontend/src/routes/index.js`
- Modify: `frontend/src/layout/MainListItems.js`

**Interfaces:**
- Consumes: `api`, `openSocket`, `toastError`, `AuthContext`.
- Produces: componente `Reminders` (ruta `/reminders`) que lista, muestra la grilla del mes, abre el modal de alta/edición y refresca por socket.

- [ ] **Step 1: Escribir la página**

`frontend/src/pages/Reminders/index.js`:

```jsx
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import { styled } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { es } from "date-fns/locale";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ReminderModal from "../../components/ReminderModal";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import openSocket from "../../services/socket-io";

const Grid = styled("div")(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  borderTop: `1px solid ${theme.palette.divider}`,
  borderLeft: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden"
}));

const DayCell = styled("button", {
  shouldForwardProp: prop => !["outside", "selected", "hasOverdue"].includes(prop)
})(({ theme, outside, selected, hasOverdue }) => ({
  appearance: "none",
  border: 0,
  borderRight: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  background: selected
    ? theme.palette.action.selected
    : outside
      ? theme.palette.action.hover
      : theme.palette.background.paper,
  color: outside ? theme.palette.text.disabled : theme.palette.text.primary,
  minHeight: 96,
  padding: theme.spacing(0.75),
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  font: "inherit",
  borderLeft: hasOverdue ? `3px solid ${theme.palette.error.main}` : undefined,
  "&:hover": { backgroundColor: theme.palette.action.hover }
}));

const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const toDateKey = date => format(date, "yyyy-MM-dd");

const timeOf = reminder => format(new Date(reminder.dueAt), "HH:mm");

const Reminders = () => {
  const { user } = useContext(AuthContext);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(toDateKey(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const from = startOfMonth(month).toISOString();
      const to = endOfMonth(month).toISOString();
      const { data } = await api.get("/reminders", { params: { from, to } });
      setReminders(data);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  useEffect(() => {
    const socket = openSocket();
    const handleUpdate = () => fetchReminders();
    socket.on("reminderUpdate", handleUpdate);
    return () => socket.off("reminderUpdate", handleUpdate);
  }, [fetchReminders]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const remindersByDay = useMemo(() => {
    const map = new Map();
    reminders.forEach(reminder => {
      const key = toDateKey(new Date(reminder.dueAt));
      const list = map.get(key) || [];
      list.push(reminder);
      map.set(key, list);
    });
    return map;
  }, [reminders]);

  const selectedReminders = remindersByDay.get(selectedDay) || [];
  const now = new Date();

  const requestPermission = () => {
    if (typeof Notification === "undefined") {
      toast.info("Este navegador no soporta notificaciones.");
      return;
    }
    Notification.requestPermission().then(result => setPermission(result));
  };

  const handleDone = async reminderId => {
    try {
      await api.patch(`/reminders/${reminderId}/status`, { status: "done" });
      fetchReminders();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, height: "100%", overflowY: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Recordatorios
        </Typography>
        <Box sx={{ flex: 1 }} />
        {permission !== "granted" && (
          <Tooltip title="Recibir avisos del sistema cuando la pestaña no está visible">
            <Button
              size="small"
              startIcon={<NotificationsActiveIcon />}
              onClick={requestPermission}
              variant="outlined"
            >
              Activar notificaciones
            </Button>
          </Tooltip>
        )}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          Nuevo recordatorio
        </Button>
      </Stack>

      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexDirection: { xs: "column", md: "row" } }}>
        <Paper variant="outlined" sx={{ flex: 2, width: "100%", p: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <IconButton size="small" onClick={() => setMonth(subMonths(month, 1))}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6" sx={{ textTransform: "capitalize", minWidth: 180, textAlign: "center" }}>
              {format(month, "MMMM yyyy", { locale: es })}
            </Typography>
            <IconButton size="small" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRightIcon />
            </IconButton>
            <Button size="small" onClick={() => setMonth(startOfMonth(new Date()))}>
              Hoy
            </Button>
            <Box sx={{ flex: 1 }} />
            {loading && <CircularProgress size={18} />}
          </Stack>

          <Grid>
            {weekdayLabels.map(label => (
              <Typography
                key={label}
                variant="caption"
                sx={{ p: 1, fontWeight: 700, textAlign: "center", backgroundColor: "action.hover" }}
              >
                {label}
              </Typography>
            ))}
            {days.map(day => {
              const key = toDateKey(day);
              const list = remindersByDay.get(key) || [];
              const hasOverdue = list.some(
                reminder => reminder.status === "pending" && new Date(reminder.dueAt) < now
              );
              return (
                <DayCell
                  key={key}
                  type="button"
                  outside={!isSameMonth(day, month)}
                  selected={key === selectedDay}
                  hasOverdue={hasOverdue}
                  onClick={() => setSelectedDay(key)}
                >
                  <Typography variant="caption" sx={{ fontWeight: key === toDateKey(now) ? 700 : 500 }}>
                    {format(day, "d")}
                  </Typography>
                  {list.slice(0, 3).map(reminder => (
                    <Chip
                      key={reminder.id}
                      size="small"
                      label={`${timeOf(reminder)} ${reminder.title}`}
                      color={
                        reminder.status === "done"
                          ? "default"
                          : new Date(reminder.dueAt) < now
                            ? "error"
                            : "primary"
                      }
                      variant={reminder.status === "done" ? "outlined" : "filled"}
                      onClick={event => {
                        event.stopPropagation();
                        setEditing(reminder);
                        setModalOpen(true);
                      }}
                      sx={{ justifyContent: "flex-start", maxWidth: "100%" }}
                    />
                  ))}
                  {list.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{list.length - 3} más
                    </Typography>
                  )}
                </DayCell>
              );
            })}
          </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ flex: 1, width: "100%", p: 2, minHeight: 240 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, textTransform: "capitalize", mb: 1 }}>
            {format(new Date(`${selectedDay}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })}
          </Typography>
          {selectedReminders.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Sin recordatorios para este día.
            </Typography>
          )}
          <Stack spacing={1}>
            {selectedReminders.map(reminder => {
              const canManage =
                Number(reminder.createdBy?.id) === Number(user?.id) ||
                String(user?.profile || "").toLowerCase() === "admin";
              return (
                <Paper
                  key={reminder.id}
                  variant="outlined"
                  sx={{ p: 1.25, cursor: canManage ? "pointer" : "default" }}
                  onClick={() => {
                    if (!canManage) return;
                    setEditing(reminder);
                    setModalOpen(true);
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {timeOf(reminder)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        textDecoration: reminder.status === "done" ? "line-through" : "none"
                      }}
                    >
                      {reminder.title}
                    </Typography>
                    {reminder.status === "pending" && (
                      <Tooltip title="Marcar como listo">
                        <IconButton
                          size="small"
                          onClick={event => {
                            event.stopPropagation();
                            handleDone(reminder.id);
                          }}
                        >
                          <CheckCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {reminder.createdBy?.name || "—"}
                    {reminder.ticket ? ` · Ticket #${reminder.ticket.id}` : ""}
                    {reminder.contact ? ` · ${reminder.contact.name}` : ""}
                    {reminder.recurrence !== "none" ? ` · Repite ${reminder.recurrence}` : ""}
                  </Typography>
                  {reminder.notes && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {reminder.notes}
                    </Typography>
                  )}
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      </Box>

      <ReminderModal
        open={modalOpen}
        reminder={editing}
        defaultDate={selectedDay}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          fetchReminders();
        }}
      />
    </Box>
  );
};

export default Reminders;
```

- [ ] **Step 2: Escribir el modal**

`frontend/src/components/ReminderModal/index.js`:

```jsx
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { format } from "date-fns";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";
import api from "../../services/api";

const emptyForm = defaultDate => ({
  title: "",
  date: defaultDate || format(new Date(), "yyyy-MM-dd"),
  time: "09:00",
  recurrence: "none",
  notes: "",
  ticketId: null,
  contactId: null
});

const toForm = reminder => {
  const dueAt = new Date(reminder.dueAt);
  return {
    title: reminder.title,
    date: format(dueAt, "yyyy-MM-dd"),
    time: format(dueAt, "HH:mm"),
    recurrence: reminder.recurrence,
    notes: reminder.notes || "",
    ticketId: reminder.ticket?.id || null,
    contactId: reminder.contact?.id || null
  };
};

const ReminderModal = ({ open, reminder, defaultDate, onClose, onSaved }) => {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState(emptyForm(defaultDate));
  const [linkTab, setLinkTab] = useState("ticket");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [saving, setSaving] = useState(false);

  const canManage = useMemo(() => {
    if (!reminder) return true;
    return (
      Number(reminder.createdBy?.id) === Number(user?.id) ||
      String(user?.profile || "").toLowerCase() === "admin"
    );
  }, [reminder, user]);

  useEffect(() => {
    if (!open) return;
    setForm(reminder ? toForm(reminder) : emptyForm(defaultDate));
    setSearch("");
    setOptions([]);
    setSelectedLink(
      reminder?.ticket
        ? { type: "ticket", id: reminder.ticket.id, label: `Ticket #${reminder.ticket.id} — ${reminder.ticket.contactName || ""}` }
        : reminder?.contact
          ? { type: "contact", id: reminder.contact.id, label: reminder.contact.name }
          : null
    );
    setLinkTab(reminder?.contact && !reminder?.ticket ? "contact" : "ticket");
  }, [open, reminder, defaultDate]);

  useEffect(() => {
    if (!open || search.trim().length < 2) {
      setOptions([]);
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        if (linkTab === "ticket") {
          const { data } = await api.get("/tickets", {
            params: { searchParam: search.trim(), pageNumber: 1 }
          });
          setOptions(
            (data.tickets || []).map(ticket => ({
              type: "ticket",
              id: ticket.id,
              label: `Ticket #${ticket.id} — ${ticket.contact?.name || ""}`
            }))
          );
        } else {
          const { data } = await api.get("/contacts", {
            params: { searchParam: search.trim(), pageNumber: 1 }
          });
          setOptions(
            (data.contacts || []).map(contact => ({
              type: "contact",
              id: contact.id,
              label: contact.name
            }))
          );
        }
      } catch (err) {
        setOptions([]);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [open, search, linkTab]);

  const handleSave = async () => {
    const dueAt = new Date(`${form.date}T${form.time}:00`);
    if (!form.title.trim() || Number.isNaN(dueAt.getTime())) return;

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        dueAt: dueAt.toISOString(),
        recurrence: form.recurrence,
        ticketId: selectedLink?.type === "ticket" ? selectedLink.id : null,
        contactId: selectedLink?.type === "contact" ? selectedLink.id : null
      };

      if (reminder) {
        await api.put(`/reminders/${reminder.id}`, payload);
      } else {
        await api.post("/reminders", payload);
      }

      onSaved();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reminder) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm("¿Eliminar este recordatorio?")) return;

    try {
      await api.delete(`/reminders/${reminder.id}`);
      onSaved();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{reminder ? "Editar recordatorio" : "Nuevo recordatorio"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Título"
            value={form.title}
            onChange={event => setForm({ ...form, title: event.target.value })}
            inputProps={{ maxLength: 120 }}
            autoFocus
            fullWidth
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Fecha"
              type="date"
              value={form.date}
              onChange={event => setForm({ ...form, date: event.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Hora"
              type="time"
              value={form.time}
              onChange={event => setForm({ ...form, time: event.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              label="Repetir"
              value={form.recurrence}
              onChange={event => setForm({ ...form, recurrence: event.target.value })}
              fullWidth
            >
              <MenuItem value="none">Nunca</MenuItem>
              <MenuItem value="daily">Todos los días</MenuItem>
              <MenuItem value="weekly">Todas las semanas</MenuItem>
              <MenuItem value="monthly">Todos los meses</MenuItem>
            </TextField>
          </Stack>

          <Tabs value={linkTab} onChange={(event, value) => setLinkTab(value)}>
            <Tab value="ticket" label="Ticket" />
            <Tab value="contact" label="Contacto" />
          </Tabs>
          <Autocomplete
            options={options}
            value={selectedLink}
            inputValue={search}
            onInputChange={(event, value) => setSearch(value)}
            onChange={(event, value) => {
              setSelectedLink(value);
              setForm({
                ...form,
                ticketId: value?.type === "ticket" ? value.id : null,
                contactId: value?.type === "contact" ? value.id : null
              });
            }}
            getOptionLabel={option => option.label || ""}
            isOptionEqualToValue={(option, value) => option.type === value.type && option.id === value.id}
            renderInput={params => (
              <TextField {...params} label="Vincular (opcional)" placeholder="Buscar..." />
            )}
            noOptionsText={search.trim().length < 2 ? "Escribí al menos 2 letras" : "Sin resultados"}
          />

          <TextField
            label="Comentario (opcional)"
            value={form.notes}
            onChange={event => setForm({ ...form, notes: event.target.value })}
            inputProps={{ maxLength: 150 }}
            helperText={`${form.notes.length}/150`}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        {reminder && canManage && (
          <Button color="error" onClick={handleDelete}>
            Eliminar
          </Button>
        )}
        <Typography sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !canManage || !form.title.trim()}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReminderModal;
```

- [ ] **Step 3: Agregar la ruta**

En `frontend/src/routes/index.js`:

1. Import: `import Reminders from "../pages/Reminders";`
2. Dentro del bloque de rutas privadas, junto a `contacts`:

```jsx
<Route path="reminders" element={<Reminders />} />
```

- [ ] **Step 4: Agregar el ítem de menú**

En `frontend/src/layout/MainListItems.js`:

1. Import del ícono (junto a los demás de `@mui/icons-material`):

```js
import EventNoteOutlined from "@mui/icons-material/EventNoteOutlined";
```

2. Después del ítem de Contactos (`</ListItemLinkWithDropdown>`), agregar:

```jsx
      <ListItemLink
        to="/reminders"
        primary={t("mainDrawer.listItems.reminders", { defaultValue: "Recordatorios" })}
        icon={<EventNoteOutlined />}
        active={location.pathname === "/reminders"}
        drawerClose={drawerClose}
      />
```

- [ ] **Step 5: Verificar el build**

Run: `npm run build` (en `frontend/`)
Expected: compila sin errores nuevos.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Reminders/index.js frontend/src/components/ReminderModal/index.js frontend/src/routes/index.js frontend/src/layout/MainListItems.js
git commit -m "feat(recordatorios): agrega pagina, modal, ruta y menu de recordatorios"
```

---

### Task 9: Alarma global con notificación del navegador

**Files:**
- Create: `frontend/src/components/ReminderAlarm/index.js`
- Modify: `frontend/src/layout/index.js`

**Interfaces:**
- Consumes: socket `reminder`, `alarmSound`, `api`, `AuthContext`.
- Produces: `<ReminderAlarm />` montado en el layout.

- [ ] **Step 1: Escribir el componente**

`frontend/src/components/ReminderAlarm/index.js`:

```jsx
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from "@mui/material";
import { format } from "date-fns";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSound from "use-sound";
import alarmSound from "../../assets/reminder-alarm.wav";
import api from "../../services/api";
import openSocket from "../../services/socket-io";

const ReminderAlarm = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [play] = useSound(alarmSound, { volume: 0.8 });
  const playRef = useRef(play);
  const current = queue[0];

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  useEffect(() => {
    const socket = openSocket();

    const handleReminder = reminder => {
      if (!reminder || reminder.status === "done") return;

      setQueue(previous => {
        if (previous.some(item => item.id === reminder.id)) return previous;
        return [...previous, reminder];
      });

      try {
        playRef.current();
      } catch (error) {
        console.error("No se pudo reproducir la alarma", error);
      }

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        try {
          const notification = new Notification("Recordatorio", {
            body: `${format(new Date(reminder.dueAt), "HH:mm")} — ${reminder.title}`,
            tag: `reminder-${reminder.id}`,
            renotify: true
          });
          notification.onclick = event => {
            event.preventDefault();
            window.focus();
            if (reminder.ticketId) {
              navigate(`/tickets/${reminder.ticketId}`);
            } else if (reminder.contactId) {
              navigate("/contacts");
            }
          };
        } catch (error) {
          console.error("No se pudo mostrar la notificación", error);
        }
      }
    };

    socket.on("reminder", handleReminder);
    return () => socket.off("reminder", handleReminder);
  }, [navigate]);

  const removeCurrent = () => setQueue(previous => previous.slice(1));

  const openLink = () => {
    if (current?.ticketId) {
      navigate(`/tickets/${current.ticketId}`);
    } else if (current?.contactId) {
      navigate("/contacts");
    }
    removeCurrent();
  };

  const markDone = async () => {
    try {
      if (current?.id) {
        await api.patch(`/reminders/${current.id}/status`, { status: "done" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      removeCurrent();
    }
  };

  const snooze = async minutes => {
    try {
      if (current?.id) {
        await api.post(`/reminders/${current.id}/snooze`, { minutes });
      }
    } catch (error) {
      console.error(error);
    } finally {
      removeCurrent();
    }
  };

  if (!current) return null;

  return (
    <Dialog open onClose={() => {}} maxWidth="xs" fullWidth>
      <DialogTitle>Recordatorio</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <Typography variant="h6">{current.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {format(new Date(current.dueAt), "dd/MM/yyyy HH:mm")}
          </Typography>
          {current.notes && <Typography variant="body2">{current.notes}</Typography>}
          {current.ticketId && (
            <Typography variant="caption" color="text.secondary">
              Ticket #{current.ticketId}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        {(current.ticketId || current.contactId) && (
          <Button onClick={openLink}>Abrir</Button>
        )}
        <Button onClick={() => snooze(5)}>5 min</Button>
        <Button onClick={() => snooze(15)}>15 min</Button>
        <Button onClick={() => snooze(60)}>60 min</Button>
        <Button variant="contained" onClick={markDone}>
          Listo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReminderAlarm;
```

- [ ] **Step 2: Montarlo en el layout**

En `frontend/src/layout/index.js`:

1. Import: `import ReminderAlarm from "../components/ReminderAlarm";`
2. En el árbol, junto a `{user?.id && <NotificationsPopOver />}`, agregar:

```jsx
{user?.id && <ReminderAlarm />}
```

- [ ] **Step 3: Compilar**

Run: `npm run build` (en `frontend/`)
Expected: compila sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ReminderAlarm/index.js frontend/src/layout/index.js
git commit -m "feat(recordatorios): alarma global con sonido y notificacion del navegador"
```

---

### Task 10: Verificación y despliegue

**Files:**
- Modify: `docs/superpowers/specs/2026-10-21-recordatorios-design.md` (solo si cambió algo durante la implementación)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: feature en producción con migración aplicada.

- [ ] **Step 1: Correr los tests del backend**

Run: `npx jest --runInBand src/__tests__/unit/ReminderRecurrence.spec.ts src/__tests__/unit/ReminderScheduler.spec.ts src/__tests__/unit/ReminderServices.spec.ts` (en `backend/`)
Expected: 13 tests PASS.

- [ ] **Step 2: Compilar backend y frontend**

Run: `npx tsc --noEmit` (en `backend/`) y `npm run build` (en `frontend/`)
Expected: sin errores nuevos.

- [ ] **Step 3: Probar en local con el panel**

Checklist manual:
1. Crear un recordatorio suelto para dentro de 2 minutos → a la hora suena la alarma con el sonido nuevo y el diálogo.
2. Posponer 5 min → no suena de inmediato y vuelve a sonar a los 5 min.
3. Crear uno con ticket y otro con contacto → "Abrir" navega a `/tickets/:id` y `/contacts`.
4. Crear uno semanal, esperar la hora, "Listo" → aparece la ocurrencia de la semana siguiente en la agenda.
5. Con otra cuenta: ver el recordatorio, completarlo y posponerlo; intentar editarlo → no debe poder (403 en el toast).
6. Cerrar la pestaña y vencer otro recordatorio → al volver, se ve en la agenda como vencido (color de error) sin sonar.

- [ ] **Step 4: Commit final (si hubo ajustes)**

```bash
git add -A
git commit -m "chore(recordatorios): ajustes de verificacion"
```

- [ ] **Step 5: Deploy**

```bash
git push origin main
```

- [ ] **Step 6: Verificar en producción**

En Prometheus:

```bash
cd /home/deploy/Press-Ticket
git log --oneline -1
pm2 logs itn-backend --lines 40 --nostream | grep -i reminder
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Expected: commit nuevo, log `[REMINDER] Scheduler de recordatorios activo`, panel 200, y la migración aplicada sin errores (visible en el log del deploy).

