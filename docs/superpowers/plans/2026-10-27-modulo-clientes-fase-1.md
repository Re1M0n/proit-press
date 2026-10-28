# Módulo de clientes (fase 1) — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar `superpowers:executing-plans` para implementar
> esta tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** Agrupar contactos bajo una ficha de cliente con marca de abonado/no abonado,
distinguir contactos externos, y poder verlo y filtrarlo desde el ticket, los contactos y
la lista de tickets.

**Architecture:** Dos tablas nuevas (`Clients` y el enlace `ClientContacts`) más una
columna en `Contacts` (`contactType`). El backend expone un módulo CRUD con el mismo patrón
que `ClientStatus` (servicios + controller + `routeRegistry` + Socket.IO) y los filtros se
resuelven en el servidor, porque contactos y tickets paginan de a 20. El panel agrega una
página nueva con pestañas y suma el tipo de contacto y las fichas al modal del contacto y al
panel del ticket.

**Tech Stack:** Backend Express + TypeScript + Sequelize (`sequelize-typescript`) sobre
MySQL, migraciones con `sequelize-cli`, tests con Jest (mocks de modelos). Panel React 18 +
MUI 5 + CRA.

**Spec:** `docs/superpowers/specs/2026-10-27-modulo-clientes-design.md`

## Restricciones globales

- La UI va en español, y todo texto nuevo se carga en los tres idiomas
  (`frontend/src/translate/languages/es.js`, `en.js`, `pt.js`).
- No agregar dependencias nuevas.
- Los filtros se resuelven en el backend: contactos y tickets paginan de a 20 desde el
  servidor y filtrar en el frontend daría resultados incompletos.
- Las rutas nuevas van con `isAuth`, como el resto. No se agregan permisos de API
  (`isApiToken`) ni entradas en la pantalla de API Keys en esta entrega.
- Reglas de negocio que el código debe hacer cumplir:
  1. Un contacto con `contactType = "client"` está en **una sola** ficha; si se intenta
     vincularlo a otra, el backend responde el error `ERR_CONTACT_ALREADY_LINKED` (409) y
     no reasigna.
  2. Un contacto con `contactType = "external"` puede estar en **varias** fichas.
  3. "Abonado" y "No abonado" miran sólo contactos tipo cliente con ficha. Un contacto sin
     ficha no aparece bajo "No abonado"; "No abonado" es ficha con `isSubscriber` en `false`.
- La ficha guarda sólo `name`, `isSubscriber` y `notes`. Sin CUIT, sin tipo de abono, sin
  planes ni importes: eso va en `notes`.
- La página de Clientes se crea **con pestañas** desde el principio (**Clientes** y
  **Mensajes**); la segunda queda con un texto informativo y se completa en la fase 2.
- Las migraciones son aditivas y llevan `down`. `npm run migrate` compila primero
  (`tsc && sequelize-cli db:migrate`), porque el CLI apunta a `dist/`.
- Los mensajes de commit siguen el formato del repo: `tipo(scope): descripción en
  imperativo`, cuerpo corto explicando el por qué, y el pie de atribución de Codebuff.

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `backend/src/database/migrations/20261027120000-create-clients.ts` | Tablas `Clients` y `ClientContacts`, columna `Contacts.contactType` e índices |
| `backend/src/models/Client.ts` | Modelo de la ficha (tabla `Clients`) |
| `backend/src/models/ClientContact.ts` | Enlace ficha ↔ contacto (tabla `ClientContacts`) |
| `backend/src/models/Contact.ts` | `contactType` y la relación con fichas |
| `backend/src/database/index.ts` | Registro de los modelos nuevos |
| `backend/src/helpers/ClientContactRules.ts` | Reglas puras de categoría y multiplicidad |
| `backend/src/services/ClientServices/*.ts` | List, Create, Show, Update, Delete y SetClientContacts |
| `backend/src/services/ContactServices/SetContactClientsService.ts` | Fichas de un contacto, desde el modal del contacto |
| `backend/src/controllers/ClientController.ts` | Endpoints y eventos Socket.IO |
| `backend/src/routes/routeRegistry.ts` | Rutas del módulo |
| `backend/src/services/ContactServices/UpdateContactService.ts` | Acepta `contactType` y `clientIds` |
| `backend/src/services/ContactServices/ListContactsService.ts` | Filtros `contactType` y `clientId` |
| `backend/src/services/TicketServices/ListTicketsService.ts` | Filtro `clientFilter` e include de fichas |
| `backend/src/controllers/TicketController.ts` | Lee `clientFilter` de la query |
| `backend/src/controllers/ContactController.ts` | Pasa `contactType` y `clientIds` al servicio |
| `frontend/src/pages/Clients/index.js` | Página con pestañas, tabla, filtros y borrado |
| `frontend/src/components/ClientsModal/index.js` | Alta/edición de la ficha y su nómina |
| `frontend/src/components/ContactModal/index.js` | Tipo de contacto y fichas |
| `frontend/src/components/ContactDrawer/index.js` | Ficha y chips en el panel del ticket |
| `frontend/src/pages/Contacts/index.js` | Filtro por abonado/no abonado/externo |
| `frontend/src/components/TicketsList/index.js` | Filtro en la lista de tickets |
| `frontend/src/hooks/useTickets/index.js` | Envía `clientFilter` al backend |
| `frontend/src/routes/index.js`, `frontend/src/layout/MainListItems.js` | Ruta y menú |
| `frontend/src/translate/languages/{es,en,pt}.js` | Textos |
| `frontend/src/pages/Documentation/index.js` | Ficha del módulo |

---

### Task 1: Esquema y modelos

**Files:**
- Create: `backend/src/database/migrations/20261027120000-create-clients.ts`
- Create: `backend/src/models/Client.ts`
- Create: `backend/src/models/ClientContact.ts`
- Modify: `backend/src/models/Contact.ts`
- Modify: `backend/src/database/index.ts`

**Interfaces:**
- Consumes: nada.
- Produces: modelo `Client` (tabla `Clients`, campos `id`, `name`, `isSubscriber`, `notes`,
  `contacts`), modelo `ClientContact` (tabla `ClientContacts`, campos `clientId`,
  `contactId`) y columna `Contact.contactType` (`"client"` | `"external"`), con
  `Contact.clients` como `BelongsToMany`.

- [ ] **Step 1: Escribir la migración**

```ts
// backend/src/database/migrations/20261027120000-create-clients.ts
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable(
        "Clients",
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
          },
          name: { type: DataTypes.STRING, allowNull: false },
          isSubscriber: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          notes: { type: DataTypes.TEXT, allowNull: true },
          createdAt: { type: DataTypes.DATE, allowNull: false },
          updatedAt: { type: DataTypes.DATE, allowNull: false }
        },
        { transaction }
      );

      await queryInterface.createTable(
        "ClientContacts",
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
          },
          clientId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "Clients", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          contactId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "Contacts", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          createdAt: { type: DataTypes.DATE, allowNull: false },
          updatedAt: { type: DataTypes.DATE, allowNull: false }
        },
        { transaction }
      );

      await queryInterface.addIndex("ClientContacts", ["clientId", "contactId"], {
        unique: true,
        name: "client_contacts_client_contact_unique",
        transaction
      });

      await queryInterface.addIndex("ClientContacts", ["contactId"], {
        name: "client_contacts_contact",
        transaction
      });

      await queryInterface.addColumn(
        "Contacts",
        "contactType",
        {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "client"
        },
        { transaction }
      );

      await queryInterface.addIndex("Contacts", ["contactType"], {
        name: "contacts_contact_type",
        transaction
      });
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeIndex(
        "Contacts",
        "contacts_contact_type",
        { transaction }
      );
      await queryInterface.removeColumn("Contacts", "contactType", { transaction });
      await queryInterface.dropTable("ClientContacts", { transaction });
      await queryInterface.dropTable("Clients", { transaction });
    });
  }
};
```

- [ ] **Step 2: Escribir los modelos**

```ts
// backend/src/models/Client.ts
import {
  AllowNull,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  Default,
  HasMany,
  Model,
  PrimaryKey,
  AutoIncrement,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import ClientContact from "./ClientContact";
import Contact from "./Contact";

@Table({ tableName: "Clients" })
class Client extends Model<Client> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  /**
   * Abonado (true) o no abonado (false). Es el estado del cliente, no del contacto:
   * una ficha puede agrupar varios contactos.
   */
  @AllowNull(false)
  @Default(false)
  @Column
  isSubscriber: boolean;

  /** Notas libres: CUIT, tipo de abono, lo que haga falta. */
  @AllowNull(true)
  @Column(DataType.TEXT)
  notes: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsToMany(() => Contact, () => ClientContact)
  contacts: Array<Contact & { ClientContact: ClientContact }>;

  @HasMany(() => ClientContact)
  clientContacts: ClientContact[];
}

export default Client;
```

```ts
// backend/src/models/ClientContact.ts
import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  ForeignKey,
  PrimaryKey,
  AutoIncrement
} from "sequelize-typescript";
import Client from "./Client";
import Contact from "./Contact";

@Table({ tableName: "ClientContacts" })
class ClientContact extends Model<ClientContact> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Client)
  @Column
  clientId: number;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ClientContact;
```

En `backend/src/models/Contact.ts`, agregar el import y los campos, junto a
`messageHandling`:

```ts
import Client from "./Client";
import ClientContact from "./ClientContact";

  /**
   * Cómo es este contacto para nosotros:
   * "client"   -> es el cliente (el número del abonado). Va en una sola ficha.
   * "external" -> no es cliente nuestro; es alguien de la órbita (el diseñador,
   *               un técnico) y puede estar en varias fichas.
   */
  @AllowNull(false)
  @Default("client")
  @Column
  contactType: string;

  @BelongsToMany(() => Client, () => ClientContact)
  clients: Array<Client & { ClientContact: ClientContact }>;
```

- [ ] **Step 3: Registrar los modelos**

En `backend/src/database/index.ts`: importar `Client` y `ClientContact` y sumarlos al array
`models` que se pasa a `sequelize.addModels`.

```ts
import Client from "../models/Client";
import ClientContact from "../models/ClientContact";

const models = [
  // ...los existentes
  Client,
  ClientContact
];

sequelize.addModels(models);
```

- [ ] **Step 4: Aplicar la migración y comprobar**

Run:

```bash
cd backend && npm run migrate && npx sequelize-cli db:migrate:status | tail -3
```

Expected: la migración `20261027120000-create-clients.ts` figura como `up`.

Comprobar las columnas con el cliente MySQL del proyecto:

```sql
DESCRIBE Clients;
DESCRIBE ClientContacts;
SHOW COLUMNS FROM Contacts LIKE 'contactType';
SHOW INDEX FROM Contacts WHERE Key_name = 'contacts_contact_type';
```

Expected: `Clients` con `name`, `isSubscriber`, `notes`; `ClientContacts` con `clientId`,
`contactId` y el índice único; `contactType` con default `client` y el índice presente.

- [ ] **Step 5: Comprobar que la migración revierte**

Run:

```bash
cd backend && npm run migrate:undo && npx sequelize-cli db:migrate:status | tail -3 && npm run migrate
```

Expected: la migración queda `down` y vuelve a `up` sin error. `down` no borra datos de
`Contacts` (sólo la columna y las tablas nuevas).

- [ ] **Step 6: Compilar**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add backend/src/database/migrations/20261027120000-create-clients.ts \
  backend/src/models/Client.ts backend/src/models/ClientContact.ts \
  backend/src/models/Contact.ts backend/src/database/index.ts
git commit -m "$(cat <<'EOF'
feat(clientes): agrega fichas de cliente y categoría del contacto

Las fichas agrupan varios contactos de un mismo cliente (un abonado con dos
números hoy son dos filas sin relación) y la columna contactType distingue al
contacto que es cliente del que sólo es alguien de la órbita, que además puede
estar en varias fichas. La tablas son nuevas y la columna tiene default, así que
la migración no toca los datos existentes.

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
EOF
)"
```

---

### Task 2: Servicios de fichas

**Files:**
- Create: `backend/src/services/ClientServices/ListClientsService.ts`
- Create: `backend/src/services/ClientServices/CreateClientService.ts`
- Create: `backend/src/services/ClientServices/ShowClientService.ts`
- Create: `backend/src/services/ClientServices/UpdateClientService.ts`
- Create: `backend/src/services/ClientServices/DeleteClientService.ts`
- Test: `backend/src/__tests__/unit/Clients/CreateClientService.spec.ts`

**Interfaces:**
- Consumes: modelo `Client` (Task 1).
- Produces:
  - `ListClientsService({ searchParam?, isSubscriber?, pageNumber? }): Promise<{ clients: Client[]; count: number; hasMore: boolean }>`, con `contactsCount` y `externalContactsCount` por ficha.
  - `CreateClientService({ name, isSubscriber?, notes? }): Promise<Client>`
  - `ShowClientService(id: string | number): Promise<Client>` (con `contacts`)
  - `UpdateClientService({ clientData, id }): Promise<Client>`
  - `DeleteClientService(id: string | number): Promise<void>`

- [ ] **Step 1: Escribir el test que falla**

```ts
// backend/src/__tests__/unit/Clients/CreateClientService.spec.ts
import Client from "../../../models/Client";
import CreateClientService from "../../../services/ClientServices/CreateClientService";

describe("CreateClientService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("crea la ficha abonada cuando el nombre es nuevo", async () => {
    jest.spyOn(Client, "findOne").mockResolvedValue(null);
    const reload = jest.fn().mockResolvedValue(undefined);
    const creada = {
      id: 1,
      name: "Acme",
      isSubscriber: true,
      notes: "CUIT 30-12345678-9",
      reload
    } as unknown as Client;
    jest.spyOn(Client, "create").mockResolvedValue(creada);

    const client = await CreateClientService({
      name: "Acme",
      isSubscriber: true,
      notes: "CUIT 30-12345678-9"
    });

    expect(client.isSubscriber).toBe(true);
    expect(Client.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Acme", isSubscriber: true })
    );
  });

  it("rechaza un nombre repetido", async () => {
    jest
      .spyOn(Client, "findOne")
      .mockResolvedValue({ id: 2, name: "Acme" } as unknown as Client);

    await expect(CreateClientService({ name: "Acme" })).rejects.toThrow(
      "ERR_CLIENT_NAME_ALREADY_EXISTS"
    );
  });

  it("rechaza un nombre vacío", async () => {
    await expect(CreateClientService({ name: "  " })).rejects.toThrow(
      "ERR_CLIENT_NAME_REQUIRED"
    );
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd backend && npx jest src/__tests__/unit/Clients/CreateClientService.spec.ts`
Expected: FAIL — no existe `services/ClientServices/CreateClientService`.

- [ ] **Step 3: Escribir los servicios**

```ts
// backend/src/services/ClientServices/CreateClientService.ts
import AppError from "../../errors/AppError";
import Client from "../../models/Client";

interface Request {
  name: string;
  isSubscriber?: boolean | string;
  notes?: string;
}

const CreateClientService = async ({
  name,
  isSubscriber = false,
  notes
}: Request): Promise<Client> => {
  const nombre = String(name || "").trim();

  if (!nombre) {
    throw new AppError("ERR_CLIENT_NAME_REQUIRED", 400);
  }

  const repetido = await Client.findOne({ where: { name: nombre } });

  if (repetido) {
    throw new AppError("ERR_CLIENT_NAME_ALREADY_EXISTS", 409);
  }

  const client = await Client.create({
    name: nombre,
    isSubscriber: isSubscriber === true || isSubscriber === "true",
    notes: notes?.trim() || null
  });

  await client.reload();

  return client;
};

export default CreateClientService;
```

```ts
// backend/src/services/ClientServices/ListClientsService.ts
import { Op, Sequelize } from "sequelize";
import Client from "../../models/Client";
import Contact from "../../models/Contact";

interface Request {
  searchParam?: string;
  /** "true" | "false" (texto, como llega por query string) */
  isSubscriber?: string;
  pageNumber?: string | number;
}

interface Response {
  clients: Client[];
  count: number;
  hasMore: boolean;
}

const ListClientsService = async ({
  searchParam = "",
  isSubscriber,
  pageNumber = "1"
}: Request): Promise<Response> => {
  const whereCondition: any = {};

  if (searchParam.trim()) {
    whereCondition.name = Sequelize.where(
      Sequelize.fn("LOWER", Sequelize.col("Client.name")),
      "LIKE",
      `%${searchParam.toLowerCase().trim()}%`
    );
  }

  if (isSubscriber === "true" || isSubscriber === "false") {
    whereCondition.isSubscriber = isSubscriber === "true";
  }

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: clients } = await Client.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["name", "ASC"]],
    attributes: {
      include: [
        [
          Sequelize.literal(`(
            SELECT COUNT(*)
            FROM ClientContacts AS cc
            WHERE cc.clientId = Client.id
          )`),
          "contactsCount"
        ],
        [
          Sequelize.literal(`(
            SELECT COUNT(*)
            FROM ClientContacts AS cc
            INNER JOIN Contacts AS contact ON contact.id = cc.contactId
            WHERE cc.clientId = Client.id AND contact.contactType = 'external'
          )`),
          "externalContactsCount"
        ]
      ]
    }
  });

  const hasMore = count > offset + clients.length;

  return { clients, count, hasMore };
};

export default ListClientsService;
```

```ts
// backend/src/services/ClientServices/ShowClientService.ts
import AppError from "../../errors/AppError";
import Client from "../../models/Client";
import Contact from "../../models/Contact";

const ShowClientService = async (id: string | number): Promise<Client> => {
  const client = await Client.findByPk(id, {
    include: [
      {
        model: Contact,
        as: "contacts",
        attributes: [
          "id",
          "name",
          "number",
          "profilePicUrl",
          "status",
          "contactType"
        ],
        through: { attributes: [] }
      }
    ]
  });

  if (!client) {
    throw new AppError("ERR_NO_CLIENT_FOUND", 404);
  }

  return client;
};

export default ShowClientService;
```

```ts
// backend/src/services/ClientServices/UpdateClientService.ts
import AppError from "../../errors/AppError";
import Client from "../../models/Client";
import ShowClientService from "./ShowClientService";

interface ClientData {
  name?: string;
  isSubscriber?: boolean | string;
  notes?: string;
}

interface Request {
  clientData: ClientData;
  id: string | number;
}

const UpdateClientService = async ({
  clientData,
  id
}: Request): Promise<Client> => {
  const client = await ShowClientService(id);
  const { name, isSubscriber, notes } = clientData;

  const updateData: ClientData = {};

  if (name !== undefined) {
    const nombre = String(name).trim();

    if (!nombre) {
      throw new AppError("ERR_CLIENT_NAME_REQUIRED", 400);
    }

    const repetido = await Client.findOne({ where: { name: nombre } });

    if (repetido && repetido.id !== client.id) {
      throw new AppError("ERR_CLIENT_NAME_ALREADY_EXISTS", 409);
    }

    updateData.name = nombre;
  }

  if (isSubscriber !== undefined) {
    updateData.isSubscriber =
      isSubscriber === true || isSubscriber === "true";
  }

  if (notes !== undefined) {
    updateData.notes = String(notes).trim() || null;
  }

  await client.update(updateData);
  await client.reload();

  return client;
};

export default UpdateClientService;
```

```ts
// backend/src/services/ClientServices/DeleteClientService.ts
import AppError from "../../errors/AppError";
import Client from "../../models/Client";
import ClientContact from "../../models/ClientContact";

const DeleteClientService = async (id: string | number): Promise<void> => {
  const client = await Client.findByPk(id);

  if (!client) {
    throw new AppError("ERR_NO_CLIENT_FOUND", 404);
  }

  // Los enlaces se van con la ficha; los contactos quedan intactos y sin ficha.
  await ClientContact.destroy({ where: { clientId: id } });
  await client.destroy();
};

export default DeleteClientService;
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `cd backend && npx jest src/__tests__/unit/Clients/CreateClientService.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Compilar**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/ClientServices backend/src/__tests__/unit/Clients
git commit -m "$(cat <<'EOF'
feat(clientes): servicios de alta, listado y edición de fichas

El listado filtra por nombre y por estado de abono en el servidor, y trae por
ficha cuántos contactos tiene y cuántos son externos, con la misma subconsulta
que ya usa Estado de clientes. El alta valida nombre obligatorio y nombre
repetido; borrar una ficha no borra contactos, sólo sus enlaces.

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
EOF
)"
```

---

### Task 3: Reglas de vínculo y nómina de la ficha

**Files:**
- Create: `backend/src/helpers/ClientContactRules.ts`
- Create: `backend/src/services/ClientServices/SetClientContactsService.ts`
- Test: `backend/src/__tests__/unit/Clients/ClientContactRules.spec.ts`

**Interfaces:**
- Consumes: modelos `Client`, `ClientContact`, `Contact` (Task 1).
- Produces:
  - `CONTACT_TYPE_CLIENT = "client"`, `CONTACT_TYPE_EXTERNAL = "external"`.
  - `normalizarContactType(valor?: string): string`
  - `puedeVincularse(contactType: string, otrasFichas: number[]): boolean`
  - `SetClientContactsService({ clientId, contacts }): Promise<Client>`, donde
    `contacts: Array<{ id: number; contactType: string }>`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// backend/src/__tests__/unit/Clients/ClientContactRules.spec.ts
import {
  CONTACT_TYPE_CLIENT,
  CONTACT_TYPE_EXTERNAL,
  normalizarContactType,
  puedeVincularse
} from "../../../helpers/ClientContactRules";

describe("ClientContactRules", () => {
  it("normaliza cualquier valor desconocido a cliente", () => {
    expect(normalizarContactType(undefined)).toBe(CONTACT_TYPE_CLIENT);
    expect(normalizarContactType("cualquiera")).toBe(CONTACT_TYPE_CLIENT);
    expect(normalizarContactType(CONTACT_TYPE_EXTERNAL)).toBe(
      CONTACT_TYPE_EXTERNAL
    );
  });

  it("un contacto tipo cliente no se vincula si ya está en otra ficha", () => {
    expect(puedeVincularse(CONTACT_TYPE_CLIENT, [7])).toBe(false);
    expect(puedeVincularse(CONTACT_TYPE_CLIENT, [])).toBe(true);
  });

  it("un contacto externo se vincula aunque esté en otras fichas", () => {
    expect(puedeVincularse(CONTACT_TYPE_EXTERNAL, [7, 9])).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd backend && npx jest src/__tests__/unit/Clients/ClientContactRules.spec.ts`
Expected: FAIL — no existe `helpers/ClientContactRules`.

- [ ] **Step 3: Escribir el helper y el servicio**

```ts
// backend/src/helpers/ClientContactRules.ts
export const CONTACT_TYPE_CLIENT = "client";
export const CONTACT_TYPE_EXTERNAL = "external";

/** Cualquier valor que no sea "external" se trata como cliente. */
export const normalizarContactType = (valor?: string): string =>
  String(valor || "").trim().toLowerCase() === CONTACT_TYPE_EXTERNAL
    ? CONTACT_TYPE_EXTERNAL
    : CONTACT_TYPE_CLIENT;

/**
 * Un contacto tipo cliente sólo puede estar en una ficha: si ya está en otra, no
 * se vincula (se avisa con error en vez de reasignarlo en silencio). Un externo
 * puede estar en las fichas que haga falta.
 *
 * `otrasFichas` son los ids de las fichas distintas a la que se está editando.
 */
export const puedeVincularse = (
  contactType: string,
  otrasFichas: number[]
): boolean => {
  if (normalizarContactType(contactType) === CONTACT_TYPE_EXTERNAL) {
    return true;
  }

  return otrasFichas.length === 0;
};
```

```ts
// backend/src/services/ClientServices/SetClientContactsService.ts
import { Op } from "sequelize";
import sequelize from "../../database";
import AppError from "../../errors/AppError";
import {
  normalizarContactType,
  puedeVincularse
} from "../../helpers/ClientContactRules";
import Client from "../../models/Client";
import ClientContact from "../../models/ClientContact";
import Contact from "../../models/Contact";

interface ContactoDeNomina {
  id: number | string;
  contactType?: string;
}

interface Request {
  clientId: string | number;
  contacts: ContactoDeNomina[];
}

const SetClientContactsService = async ({
  clientId,
  contacts = []
}: Request): Promise<Client> => {
  const client = await Client.findByPk(clientId);

  if (!client) {
    throw new AppError("ERR_NO_CLIENT_FOUND", 404);
  }

  const nomina = contacts.map(contact => ({
    id: Number(contact.id),
    contactType: normalizarContactType(contact.contactType)
  }));

  // Validación antes de escribir: si algo no cumple la regla, no se toca nada.
  for (const deseado of nomina) {
    const contact = await Contact.findByPk(deseado.id);

    if (!contact) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }

    const vinculos = await ClientContact.findAll({
      where: { contactId: deseado.id }
    });

    const otrasFichas = vinculos
      .filter(vinculo => Number(vinculo.clientId) !== Number(clientId))
      .map(vinculo => Number(vinculo.clientId));

    if (!puedeVincularse(deseado.contactType, otrasFichas)) {
      throw new AppError(
        `ERR_CONTACT_ALREADY_LINKED:${otrasFichas.join(",")}`,
        409
      );
    }
  }

  const idsDeseados = nomina.map(item => item.id);

  await sequelize.transaction(async transaction => {
    for (const deseado of nomina) {
      await Contact.update(
        { contactType: deseado.contactType },
        { where: { id: deseado.id }, transaction }
      );

      await ClientContact.findOrCreate({
        where: { clientId: client.id, contactId: deseado.id },
        defaults: { clientId: client.id, contactId: deseado.id },
        transaction
      });
    }

    await ClientContact.destroy({
      where: {
        clientId: client.id,
        ...(idsDeseados.length > 0
          ? { contactId: { [Op.notIn]: idsDeseados } }
          : {})
      },
      transaction
    });
  });

  await client.reload();

  return client;
};

export default SetClientContactsService;
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `cd backend && npx jest src/__tests__/unit/Clients/ClientContactRules.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Compilar**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add backend/src/helpers/ClientContactRules.ts \
  backend/src/services/ClientServices/SetClientContactsService.ts \
  backend/src/__tests__/unit/Clients/ClientContactRules.spec.ts
git commit -m "$(cat <<'EOF'
feat(clientes): nómina de la ficha con la regla de un solo cliente por contacto

La ficha guarda su nómina completa de una vez: vincula los contactos elegidos,
desvincula los que salieron y actualiza la categoría de cada uno. La regla de
multiplicidad queda en un helper puro y testeado, y la validación corre antes de
escribir, así que un contacto que ya es cliente de otra ficha no se reasigna en
silencio.

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
EOF
)"
```

---

### Task 4: Controller y rutas del módulo

**Files:**
- Create: `backend/src/controllers/ClientController.ts`
- Modify: `backend/src/routes/routeRegistry.ts` (junto al grupo `clientStatus`, alrededor de la línea 144)

**Interfaces:**
- Consumes: los servicios de Task 2 y Task 3, con las mismas firmas.
- Produces: rutas `GET/POST /clients`, `GET/PUT/DELETE /clients/:clientId`,
  `PUT /clients/:clientId/contacts`, y el evento Socket.IO `client` con
  `{ action: "create" | "update" | "delete", client }`.

- [ ] **Step 1: Escribir el controller**

```ts
// backend/src/controllers/ClientController.ts
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateClientService from "../services/ClientServices/CreateClientService";
import DeleteClientService from "../services/ClientServices/DeleteClientService";
import ListClientsService from "../services/ClientServices/ListClientsService";
import SetClientContactsService from "../services/ClientServices/SetClientContactsService";
import ShowClientService from "../services/ClientServices/ShowClientService";
import UpdateClientService from "../services/ClientServices/UpdateClientService";

type IndexQuery = {
  searchParam?: string;
  isSubscriber?: string;
  pageNumber?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, isSubscriber, pageNumber } = req.query as IndexQuery;

  const { clients, count, hasMore } = await ListClientsService({
    searchParam,
    isSubscriber,
    pageNumber
  });

  return res.json({ clients, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, isSubscriber, notes } = req.body;

  const client = await CreateClientService({ name, isSubscriber, notes });

  const io = getIO();
  io.emit("client", { action: "create", client });

  return res.status(200).json(client);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { clientId } = req.params;

  const client = await ShowClientService(clientId);

  return res.status(200).json(client);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { clientId } = req.params;
  const { name, isSubscriber, notes } = req.body;

  const client = await UpdateClientService({
    clientData: { name, isSubscriber, notes },
    id: clientId
  });

  const io = getIO();
  io.emit("client", { action: "update", client });

  return res.status(200).json(client);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { clientId } = req.params;

  await DeleteClientService(clientId);

  const io = getIO();
  io.emit("client", { action: "delete", client: { id: Number(clientId) } });

  return res.status(200).json({ message: "Client deleted" });
};

export const setContacts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { clientId } = req.params;
  const { contacts } = req.body;

  const client = await SetClientContactsService({ clientId, contacts });

  const io = getIO();
  io.emit("client", { action: "update", client });

  return res.status(200).json(client);
};
```

- [ ] **Step 2: Registrar las rutas**

En `backend/src/routes/routeRegistry.ts`, importar el controller junto a los demás y
agregar el grupo antes de `// clientStatus`:

```ts
import * as ClientController from "../controllers/ClientController";

  // clients
  {
    routes: [
    { method: "get", path: "/clients", middlewares: [isAuth], handler: ClientController.index },
    { method: "post", path: "/clients", middlewares: [isAuth], handler: ClientController.store },
    { method: "get", path: "/clients/:clientId", middlewares: [isAuth], handler: ClientController.show },
    { method: "put", path: "/clients/:clientId", middlewares: [isAuth], handler: ClientController.update },
    { method: "delete", path: "/clients/:clientId", middlewares: [isAuth], handler: ClientController.remove },
    { method: "put", path: "/clients/:clientId/contacts", middlewares: [isAuth], handler: ClientController.setContacts }
    ]
  },
```

- [ ] **Step 3: Compilar y comprobar contra el backend levantado**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

Con el backend de desarrollo levantado (`npm run dev`), y el token de la sesión:

```bash
curl -s -X POST http://localhost:4000/clients \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Cliente de prueba","isSubscriber":true,"notes":"CUIT en nota"}'
```

Expected: 200 con la ficha creada. Sin token, 401.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/ClientController.ts backend/src/routes/routeRegistry.ts
git commit -m "$(cat <<'EOF'
feat(clientes): expone el módulo de fichas por la API

Cinco rutas CRUD más la que guarda la nómina de contactos, todas con isAuth como
el resto del panel. El controller avisa por Socket.IO para que otra pestaña
abierta vea los cambios sin recargar.

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
EOF
)"
```

---

### Task 5: Contactos: categoría y filtros en el backend

**Files:**
- Create: `backend/src/helpers/ClientFilter.ts`
- Create: `backend/src/services/ContactServices/SetContactClientsService.ts`
- Modify: `backend/src/services/ContactServices/UpdateContactService.ts`
- Modify: `backend/src/services/ContactServices/ListContactsService.ts`
- Modify: `backend/src/controllers/ContactController.ts`
- Test: `backend/src/__tests__/unit/Clients/ClientFilter.spec.ts`
- Test: `backend/src/__tests__/unit/Contact/SetContactClientsService.spec.ts`

**Interfaces:**
- Consumes: `normalizarContactType`, `puedeVincularse` (Task 3); modelos `Client`,
  `ClientContact` y `Contact` (Task 1).
- Produces:
  - `resolverFiltroDeCliente(clientFilter?: string): Promise<{ contactType?: string; contactIds?: number[] }>` — traduce `"subscriber"`, `"nonSubscriber"` o `"external"` a condiciones ya resueltas (o `{}` sin filtro). Lo usan contactos (esta tarea) y tickets (Task 6).
  - `SetContactClientsService({ contactId, clientIds }): Promise<Contact>`
  - `UpdateContactService` acepta `contactType?: string` y `clientIds?: number[]` en `contactData`.
  - `ListContactsService` acepta `contactType?: string`, `clientId?: string` y `clientFilter?: string`.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// backend/src/__tests__/unit/Clients/ClientFilter.spec.ts
import Client from "../../../models/Client";
import ClientContact from "../../../models/ClientContact";
import { resolverFiltroDeCliente } from "../../../helpers/ClientFilter";

describe("resolverFiltroDeCliente", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sin filtro no agrega condiciones", async () => {
    await expect(resolverFiltroDeCliente(undefined)).resolves.toEqual({});
  });

  it("externo se resuelve por el tipo del contacto", async () => {
    await expect(resolverFiltroDeCliente("external")).resolves.toEqual({
      contactType: "external"
    });
  });

  it("abonado trae los contactos de las fichas abonadas", async () => {
    jest.spyOn(Client, "findAll").mockResolvedValue([{ id: 3 }] as any);
    jest
      .spyOn(ClientContact, "findAll")
      .mockResolvedValue([{ contactId: 11 }, { contactId: 12 }] as any);

    await expect(resolverFiltroDeCliente("subscriber")).resolves.toEqual({
      contactType: "client",
      contactIds: [11, 12]
    });
  });

  it("no abonado sale de las fichas no abonadas, no de los contactos sin ficha", async () => {
    jest.spyOn(Client, "findAll").mockResolvedValue([{ id: 5 }] as any);
    jest
      .spyOn(ClientContact, "findAll")
      .mockResolvedValue([{ contactId: 21 }] as any);

    await expect(resolverFiltroDeCliente("nonSubscriber")).resolves.toEqual({
      contactType: "client",
      contactIds: [21]
    });

    expect(Client.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isSubscriber: false } })
    );
  });

  it("sin fichas que cumplan, la lista de contactos queda vacía", async () => {
    jest.spyOn(Client, "findAll").mockResolvedValue([] as any);
    const vinculos = jest.spyOn(ClientContact, "findAll");

    await expect(resolverFiltroDeCliente("subscriber")).resolves.toEqual({
      contactType: "client",
      contactIds: []
    });

    expect(vinculos).not.toHaveBeenCalled();
  });
});
```

```ts
// backend/src/__tests__/unit/Contact/SetContactClientsService.spec.ts
// ts-jest eleva las llamadas a jest.mock, así que el mock se aplica antes de que el
// servicio importe la conexión real.
jest.mock("../../../database", () => ({
  __esModule: true,
  default: { transaction: jest.fn(async callback => callback({})) }
}));

import AppError from "../../../errors/AppError";
import Client from "../../../models/Client";
import ClientContact from "../../../models/ClientContact";
import Contact from "../../../models/Contact";
import SetContactClientsService from "../../../services/ContactServices/SetContactClientsService";

describe("SetContactClientsService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rechaza más de una ficha para un contacto tipo cliente", async () => {
    const contacto = {
      id: 1,
      contactType: "client",
      update: jest.fn(),
      reload: jest.fn()
    };
    jest.spyOn(Contact, "findByPk").mockResolvedValue(contacto as any);

    await expect(
      SetContactClientsService({ contactId: "1", clientIds: [3, 4] })
    ).rejects.toThrow(AppError);

    expect(contacto.update).not.toHaveBeenCalled();
  });

  it("acepta varias fichas para un contacto externo", async () => {
    const contacto = {
      id: 2,
      contactType: "external",
      update: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockResolvedValue(undefined)
    };
    jest.spyOn(Contact, "findByPk").mockResolvedValue(contacto as any);
    jest.spyOn(Client, "findAll").mockResolvedValue([{ id: 3 }, { id: 4 }] as any);
    jest.spyOn(ClientContact, "destroy").mockResolvedValue(0 as any);
    jest.spyOn(ClientContact, "create").mockResolvedValue({} as any);

    await SetContactClientsService({ contactId: "2", clientIds: [3, 4] });

    expect(contacto.update).toHaveBeenCalledWith(
      expect.objectContaining({ contactType: "external" }),
      expect.anything()
    );
  });
});
```

- [ ] **Step 2: Correr los tests y ver que fallan**

Run:

```bash
cd backend && npx jest src/__tests__/unit/Clients/ClientFilter.spec.ts \
  src/__tests__/unit/Contact/SetContactClientsService.spec.ts
```

Expected: FAIL — no existen el helper ni el servicio.

- [ ] **Step 3: Escribir el helper, el servicio y engancharlos**

```ts
// backend/src/helpers/ClientFilter.ts
import { Op } from "sequelize";
import Client from "../models/Client";
import ClientContact from "../models/ClientContact";
import {
  CONTACT_TYPE_CLIENT,
  CONTACT_TYPE_EXTERNAL
} from "./ClientContactRules";

interface FiltroResuelto {
  contactType?: string;
  contactIds?: number[];
}

/**
 * Traduce el filtro del panel a condiciones ya resueltas.
 *
 * Los ids se resuelven acá y no con una condición anidada sobre el include
 * porque una condición anidada desincroniza el count de findAndCountAll y rompe
 * la paginación de las listas.
 *
 * "No abonado" es una decisión explícita: son los contactos que son el cliente
 * de una ficha con isSubscriber en false. Un contacto sin ficha no cae acá.
 */
export const resolverFiltroDeCliente = async (
  clientFilter?: string
): Promise<FiltroResuelto> => {
  if (clientFilter === CONTACT_TYPE_EXTERNAL) {
    return { contactType: CONTACT_TYPE_EXTERNAL };
  }

  if (clientFilter !== "subscriber" && clientFilter !== "nonSubscriber") {
    return {};
  }

  const fichas = await Client.findAll({
    where: { isSubscriber: clientFilter === "subscriber" },
    attributes: ["id"]
  });

  const idsFichas = fichas.map(ficha => Number(ficha.id));

  if (idsFichas.length === 0) {
    return { contactType: CONTACT_TYPE_CLIENT, contactIds: [] };
  }

  const vinculos = await ClientContact.findAll({
    where: { clientId: { [Op.in]: idsFichas } },
    attributes: ["contactId"]
  });

  return {
    contactType: CONTACT_TYPE_CLIENT,
    contactIds: [...new Set(vinculos.map(vinculo => Number(vinculo.contactId)))]
  };
};

export default resolverFiltroDeCliente;
```

```ts
// backend/src/services/ContactServices/SetContactClientsService.ts
import { Op } from "sequelize";
import sequelize from "../../database";
import AppError from "../../errors/AppError";
import {
  CONTACT_TYPE_CLIENT,
  CONTACT_TYPE_EXTERNAL,
  normalizarContactType,
  puedeVincularse
} from "../../helpers/ClientContactRules";
import Client from "../../models/Client";
import ClientContact from "../../models/ClientContact";
import Contact from "../../models/Contact";

interface Request {
  contactId: string | number;
  clientIds: Array<number | string>;
}

const SetContactClientsService = async ({
  contactId,
  clientIds = []
}: Request): Promise<Contact> => {
  const contact = await Contact.findByPk(contactId);

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  const ids = [...new Set(clientIds.map(id => Number(id)))];

  const contactType =
    ids.length > 1
      ? CONTACT_TYPE_EXTERNAL
      : normalizarContactType(contact.contactType);

  if (!puedeVincularse(contactType, [])) {
    throw new AppError("ERR_CONTACT_ALREADY_LINKED", 409);
  }

  const fichas = await Client.findAll({ where: { id: { [Op.in]: ids } } });

  if (fichas.length !== ids.length) {
    throw new AppError("ERR_NO_CLIENT_FOUND", 404);
  }

  // Un contacto tipo cliente con más de una ficha contradice la regla: sólo un
  // externo puede estar en varias.
  if (contactType === CONTACT_TYPE_CLIENT && ids.length > 1) {
    throw new AppError("ERR_CONTACT_ALREADY_LINKED", 409);
  }

  await sequelize.transaction(async transaction => {
    await contact.update({ contactType }, { transaction });

    await ClientContact.destroy({ where: { contactId: contact.id }, transaction });

    for (const clientId of ids) {
      await ClientContact.create(
        { clientId, contactId: contact.id },
        { transaction }
      );
    }
  });

  await contact.reload();

  return contact;
};

export default SetContactClientsService;
```

En `UpdateContactService`, sumar los campos al interface `ContactData` y aplicarlos después
del resto de los cambios (el archivo actual tiene el `update` principal más abajo):

```ts
  contactType?: string;
  clientIds?: Array<number | string>;
```

```ts
  const contactTypeNormalizado =
    contactType !== undefined ? normalizarContactType(contactType) : undefined;

  if (contactTypeNormalizado !== undefined) {
    await contact.update({ contactType: contactTypeNormalizado });
  }

  if (clientIds !== undefined) {
    const vinculos = await SetContactClientsService({
      contactId: contact.id,
      clientIds
    });

    return vinculos;
  }
```

Con los imports:

```ts
import { normalizarContactType } from "../../helpers/ClientContactRules";
import SetContactClientsService from "./SetContactClientsService";
```

En `ListContactsService`, sumar los filtros a la firma y a las condiciones (el archivo ya
arma `whereCondition[Op.and]` para `isGroup` y `status`):

```ts
  contactType?: string;
  clientId?: string;
  /** "subscriber" | "nonSubscriber" | "external" */
  clientFilter?: string;
```

```ts
  if (contactType === CONTACT_TYPE_CLIENT || contactType === CONTACT_TYPE_EXTERNAL) {
    whereCondition[Op.and].push({ contactType });
  }

  if (clientId) {
    whereCondition[Op.and].push({
      id: {
        [Op.in]: Sequelize.literal(`(
          SELECT cc.contactId FROM ClientContacts AS cc
          WHERE cc.clientId = ${Number(clientId)}
        )`)
      }
    });
  }

  const filtroDeCliente = await resolverFiltroDeCliente(clientFilter);

  if (filtroDeCliente.contactType) {
    whereCondition[Op.and].push({ contactType: filtroDeCliente.contactType });
  }

  if (filtroDeCliente.contactIds) {
    whereCondition[Op.and].push({ id: { [Op.in]: filtroDeCliente.contactIds } });
  }
```

Con los imports:

```ts
import {
  CONTACT_TYPE_CLIENT,
  CONTACT_TYPE_EXTERNAL
} from "../../helpers/ClientContactRules";
import resolverFiltroDeCliente from "../../helpers/ClientFilter";
```

En `ContactController.index`, leer el parámetro y pasarlo:

```ts
    const clientFilter = req.query.clientFilter as string;

    const { contacts, count, hasMore } = await ListContactsService({
      // ...lo que ya pasa hoy
      clientFilter
    });
```

En `ContactController.update`, pasar los campos nuevos al servicio:

```ts
    const { contactType, clientIds } = req.body;

    const contact = await UpdateContactService({
      contactData: { /* ...lo que ya pasa hoy */, contactType, clientIds },
      contactId
    });
```

- [ ] **Step 4: Correr los tests y ver que pasan**

Run: `cd backend && npx jest src/__tests__/unit/Contact src/__tests__/unit/Clients`
Expected: PASS: los tests nuevos del helper y del servicio, más los que ya existían de
`UpdateContactService`.

- [ ] **Step 5: Compilar**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/ContactServices backend/src/controllers/ContactController.ts \
  backend/src/helpers/ClientFilter.ts backend/src/__tests__/unit
git commit -m "$(cat <<'EOF'
feat(contactos): tipo de contacto, fichas y filtros en el backend

El contacto puede marcarse como cliente o externo y elegir sus fichas desde su
propio modal: un cliente va en una sola ficha y un externo en varias, y el
servicio lo valida antes de escribir. El listado suma los filtros por tipo y por
ficha, resueltos en el servidor para no romper la paginación de a 20.

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
EOF
)"
```

---

### Task 6: Tickets: filtro por estado de abono en el backend

**Files:**
- Modify: `backend/src/services/TicketServices/ListTicketsService.ts`
- Modify: `backend/src/controllers/TicketController.ts:37-60`
- Test: `backend/src/__tests__/unit/Tickets/ListTicketsClientFilter.spec.ts`

**Interfaces:**
- Consumes: `resolverFiltroDeCliente` (Task 5), que ya traduce el filtro a condiciones
  resueltas.
- Produces: `ListTicketsService` acepta `clientFilter?: string` con los valores
  `"subscriber"`, `"nonSubscriber"` o `"external"`; el include de `contact` trae
  `contactType` y la ficha del contacto.

- [ ] **Step 1: Escribir el test que falla**

```ts
// backend/src/__tests__/unit/Tickets/ListTicketsClientFilter.spec.ts
// El servicio lee un ajuste al empezar: se mockea para que el test no toque la base.
jest.mock("../../../services/SettingServices/ListSettingsServiceOne", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null)
}));

import { Op } from "sequelize";
import Client from "../../../models/Client";
import ClientContact from "../../../models/ClientContact";
import Ticket from "../../../models/Ticket";
import ListTicketsService from "../../../services/TicketServices/ListTicketsService";

describe("ListTicketsService - filtro por estado de abono", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("filtra por externos sin consultar fichas", async () => {
    const findAndCountAll = jest
      .spyOn(Ticket, "findAndCountAll")
      .mockResolvedValue({ count: 0, rows: [] } as any);
    const fichas = jest.spyOn(Client, "findAll");

    await ListTicketsService({ clientFilter: "external", queueIds: [] });

    const condiciones = findAndCountAll.mock.calls[0][0].where as any;
    expect(condiciones.contactType).toBe("external");
    expect(fichas).not.toHaveBeenCalled();
  });

  it("filtra por abonados resolviendo los contactos de las fichas abonadas", async () => {
    jest.spyOn(Client, "findAll").mockResolvedValue([{ id: 3 }] as any);
    jest
      .spyOn(ClientContact, "findAll")
      .mockResolvedValue([{ contactId: 11 }, { contactId: 12 }] as any);
    const findAndCountAll = jest
      .spyOn(Ticket, "findAndCountAll")
      .mockResolvedValue({ count: 0, rows: [] } as any);

    await ListTicketsService({ clientFilter: "subscriber", queueIds: [] });

    const condiciones = findAndCountAll.mock.calls[0][0].where as any;
    expect(condiciones.contactType).toBe("client");
    expect(condiciones.contactId).toEqual({ [Op.in]: [11, 12] });
  });

  it("sin filtro no agrega condiciones de contacto", async () => {
    const findAndCountAll = jest
      .spyOn(Ticket, "findAndCountAll")
      .mockResolvedValue({ count: 0, rows: [] } as any);

    await ListTicketsService({ queueIds: [] });

    const condiciones = findAndCountAll.mock.calls[0][0].where as any;
    expect(condiciones.contactId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd backend && npx jest src/__tests__/unit/Tickets/ListTicketsClientFilter.spec.ts`
Expected: FAIL — el parámetro `clientFilter` todavía no existe.

- [ ] **Step 3: Implementar el filtro**

En `ListTicketsService`, sumar al interface `Request` y a la desestructuración:

```ts
  /** "subscriber" | "nonSubscriber" | "external" */
  clientFilter?: string;
```

Y el include de la ficha dentro del include de `contact`:

```ts
    {
      model: Contact,
      as: "contact",
      attributes: [
        // ...los que ya están
        "contactType"
      ],
      include: [
        {
          model: Client,
          as: "clients",
          attributes: ["id", "name", "isSubscriber"],
          through: { attributes: [] }
        }
      ]
    },
```

Después de la condición de `status` (línea ~94) y antes de la de `searchParam`, agregar:

```ts
  if (clientFilter) {
    // El filtro se resuelve antes y termina siendo un IN de contactos: una condición
    // anidada sobre el include desincroniza el count de findAndCountAll.
    const filtroDeCliente = await resolverFiltroDeCliente(clientFilter);

    if (filtroDeCliente.contactType) {
      whereCondition.contactType = filtroDeCliente.contactType;
    }

    if (filtroDeCliente.contactIds) {
      whereCondition.contactId = { [Op.in]: filtroDeCliente.contactIds };
    }
  }
```

Imports nuevos:

```ts
import resolverFiltroDeCliente from "../../helpers/ClientFilter";
```

En `TicketController.index`, leer el parámetro y pasarlo:

```ts
    const clientFilter = req.query.clientFilter as string;

    const { tickets, count, hasMore } = await ListTicketsService({
      // ...lo que ya pasa hoy
      clientFilter
    });
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `cd backend && npx jest src/__tests__/unit/Tickets/ListTicketsClientFilter.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Compilar**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/TicketServices/ListTicketsService.ts \
  backend/src/controllers/TicketController.ts \
  backend/src/__tests__/unit/Tickets/ListTicketsClientFilter.spec.ts
git commit -m "$(cat <<'EOF'
feat(tickets): filtra la lista por abonados, no abonados y externos

El filtro resuelve primero los ids de contactos que cumplen y después consulta
los tickets con un IN: una condición anidada sobre el include del contacto
desincronizaba el count de findAndCountAll y rompía la paginación. La ficha del
contacto viaja en el include para que el panel del ticket la muestre sin otra
consulta.

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
EOF
)"
```

---

### Task 7: Página Clientes con pestañas

**Files:**
- Create: `frontend/src/pages/Clients/index.js`
- Modify: `frontend/src/routes/index.js` (junto a la ruta de `ClientStatus`, línea ~94)
- Modify: `frontend/src/layout/MainListItems.js` (después del ítem de Estado de clientes, línea ~379)
- Modify: `frontend/src/translate/languages/es.js`, `en.js`, `pt.js`
- Modify: `frontend/src/pages/Documentation/index.js`

**Interfaces:**
- Consumes: `GET /clients` (Task 4) con `searchParam`, `isSubscriber`, `pageNumber`;
  `DELETE /clients/:clientId`; evento Socket.IO `client`.
- Produces: la página `/clients` con las pestañas **Clientes** y **Mensajes**, y la
  exportación por defecto del componente `Clients`.

- [ ] **Step 1: Escribir la página**

```jsx
// frontend/src/pages/Clients/index.js
import React, { useCallback, useEffect, useReducer, useState } from "react";
import {
  Box,
  Chip,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  IconButton
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import openSocket from "../../services/socket-io";
import ClientsModal from "../../components/ClientsModal";

const useStyles = makeStyles(() => ({
  root: { display: "flex", flexDirection: "column", gap: 12, padding: 12 },
  filters: { display: "flex", gap: 12, alignItems: "center" },
  tableWrapper: { overflowY: "auto" }
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_CLIENTS") {
    const clients = action.payload;

    clients.forEach(client => {
      const indice = state.findIndex(item => item.id === client.id);

      if (indice > -1) {
        state[indice] = client;
      } else {
        state.push(client);
      }
    });

    return [...state];
  }

  if (action.type === "UPDATE_CLIENTS") {
    const client = action.payload;
    const indice = state.findIndex(item => item.id === client.id);

    if (indice > -1) {
      state[indice] = client;
      return [...state];
    }

    return [...state, client];
  }

  if (action.type === "DELETE_CLIENT") {
    return state.filter(client => client.id !== action.payload);
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

const Clients = () => {
  const classes = useStyles();
  const { t } = useTranslation();

  const [tab, setTab] = useState(0);
  const [clients, dispatch] = useReducer(reducer, []);
  const [searchParam, setSearchParam] = useState("");
  const [subscriberFilter, setSubscriberFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam, subscriberFilter]);

  useEffect(() => {
    setLoading(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const { data } = await api.get("/clients", {
          params: {
            searchParam,
            pageNumber,
            ...(subscriberFilter ? { isSubscriber: subscriberFilter } : {})
          }
        });

        dispatch({ type: "LOAD_CLIENTS", payload: data.clients });
        setHasMore(data.hasMore);
        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, subscriberFilter, pageNumber]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("client", data => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CLIENTS", payload: data.client });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CLIENT", payload: +data.client.id });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleScroll = useCallback(e => {
    if (!hasMore || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    if (scrollHeight - scrollTop === clientHeight) {
      setPageNumber(prevState => prevState + 1);
    }
  }, [hasMore, loading]);

  const handleDeleteClient = async clientId => {
    try {
      await api.delete(`/clients/${clientId}`);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Box className={classes.root}>
      <Tabs
        value={tab}
        onChange={(e, value) => setTab(value)}
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label={t("clients.tabs.clients")} />
        <Tab label={t("clients.tabs.messages")} />
      </Tabs>

      {tab === 0 && (
        <>
          <Box className={classes.filters}>
            <TextField
              size="small"
              placeholder={t("clients.searchPlaceholder")}
              value={searchParam}
              onChange={e => setSearchParam(e.target.value)}
            />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <Select
                value={subscriberFilter}
                displayEmpty
                onChange={e => setSubscriberFilter(e.target.value)}
              >
                <MenuItem value="">{t("clients.filters.all")}</MenuItem>
                <MenuItem value="true">{t("clients.filters.subscribers")}</MenuItem>
                <MenuItem value="false">{t("clients.filters.nonSubscribers")}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Paper className={classes.tableWrapper} onScroll={handleScroll} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("clients.table.name")}</TableCell>
                  <TableCell>{t("clients.table.subscriber")}</TableCell>
                  <TableCell>{t("clients.table.contacts")}</TableCell>
                  <TableCell>{t("clients.table.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={client.isSubscriber ? "primary" : "default"}
                        label={
                          client.isSubscriber
                            ? t("clients.filters.subscribers")
                            : t("clients.filters.nonSubscribers")
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {t("clients.table.contactsCount", {
                        count: client.contactsCount || 0,
                        external: client.externalContactsCount || 0
                      })}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setClientModalOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteClient(client.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <ClientsModal
            open={clientModalOpen}
            clientId={selectedClientId}
            onClose={() => {
              setSelectedClientId(null);
              setClientModalOpen(false);
            }}
          />
        </>
      )}

      {tab === 1 && (
        <Paper variant="outlined" sx={{ padding: 2 }}>
          <Typography variant="body2">
            {t("clients.messages.comingSoon")}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Clients;
```

- [ ] **Step 2: Registrar ruta, menú, textos y documentación**

En `frontend/src/routes/index.js`: importar la página junto a `ClientStatus` y agregar la
ruta dentro del mismo bloque de rutas autenticadas:

```jsx
<Route path="clients" element={<Clients />} />
```

En `frontend/src/layout/MainListItems.js`, después del `ListItemLink` de `/ClientStatus`:

```jsx
      <ListItemLink
        to="/clients"
        primary={t("mainDrawer.listItems.clients")}
        icon={<BusinessIcon />}
        active={location.pathname === '/clients'}
        drawerClose={drawerClose}
      />
```

(importar `BusinessIcon` de `@mui/icons-material/Business`).

En los tres idiomas, dentro de `mainDrawer.listItems` y en la raíz `clients`:

```js
// es.js
clients: "Clientes",
// y en la raíz del archivo, junto a otras páginas:
clients: {
  title: "Clientes",
  searchPlaceholder: "Buscar por nombre",
  tabs: { clients: "Clientes", messages: "Mensajes" },
  filters: {
    all: "Todas",
    subscribers: "Abonado",
    nonSubscribers: "No abonado",
    external: "Externo"
  },
  table: {
    name: "Nombre",
    subscriber: "Estado",
    contacts: "Contactos",
    contactsCount: "{{count}} contactos ({{external}} externos)",
    actions: "Acciones"
  },
  messages: {
    comingSoon: "Acá se configuran el horario de atención y los mensajes automáticos de cada conexión."
  }
}
```

(En `en.js` y `pt.js`, las mismas claves con su idioma; `pt.js` usa las claves ya
existentes como patrón.)

En `frontend/src/pages/Documentation/index.js`, agregar la ficha del módulo junto a la de
Estado de clientes: nombre `t("mainDrawer.listItems.clients")`, descripción
`t("documentation.general.clients")` y `path: "/clients"`, sumando esa clave a los tres
idiomas:

```js
// es.js, dentro de documentation.general
clients: "En Clientes agrupás los contactos de un mismo cliente bajo una ficha, marcás si está abonado o no y distinguís los contactos externos, como el diseñador que trabaja con ese cliente. Desde acá también se ve cuántos contactos tiene cada ficha."
```

- [ ] **Step 3: Compilar y verificar en el panel**

Run: `cd frontend && CI=false GENERATE_SOURCEMAP=false npm run build`
Expected: `Compiled successfully`.

Checklist con el backend levantado:
1. El menú muestra **Clientes** y abre `/clients`.
2. La pestaña **Mensajes** existe y muestra el texto informativo.
3. El buscador filtra por nombre; el filtro Abonado/No abonado/Todas filtra en el servidor
   (con más de 20 fichas, la paginación sigue funcionando al bajar con el scroll).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Clients/index.js frontend/src/routes/index.js \
  frontend/src/layout/MainListItems.js frontend/src/translate/languages \
  frontend/src/pages/Documentation/index.js
git commit -m "$(cat <<'EOF'
feat(panel): página de Clientes con listado y filtros

La página se arma con pestañas (Clientes y Mensajes) desde el vamos para que la
fase de mensajes por estado de abono no obligue a rearmarla. El listado filtra en
el servidor y trae por ficha cuántos contactos tiene y cuántos son externos.

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
EOF
)"
```

---

### Task 8: Modal de ficha con su nómina de contactos

**Files:**
- Create: `frontend/src/components/ClientsModal/index.js`
- Modify: `frontend/src/translate/languages/{es,en,pt}.js`

**Interfaces:**
- Consumes: `POST /clients`, `PUT /clients/:clientId`, `GET /clients/:clientId`,
  `PUT /clients/:clientId/contacts`, `GET /contacts?searchParam=`.
- Produces: componente `ClientsModal({ open, clientId, onClose })`.

- [ ] **Step 1: Escribir el modal**

```jsx
// frontend/src/components/ClientsModal/index.js
import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const ClientsModal = ({ open, clientId, onClose }) => {
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [notes, setNotes] = useState("");
  const [nomina, setNomina] = useState([]);
  const [opciones, setOpciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName("");
    setIsSubscriber(false);
    setNotes("");
    setNomina([]);
    setBusqueda("");

    if (!clientId) return;

    const fetchClient = async () => {
      try {
        const { data } = await api.get(`/clients/${clientId}`);
        setName(data.name || "");
        setIsSubscriber(Boolean(data.isSubscriber));
        setNotes(data.notes || "");
        setNomina(
          (data.contacts || []).map(contact => ({
            id: contact.id,
            name: contact.name,
            number: contact.number,
            contactType: contact.contactType || "client"
          }))
        );
      } catch (err) {
        toastError(err);
      }
    };

    fetchClient();
  }, [open, clientId]);

  useEffect(() => {
    if (!open || busqueda.trim().length < 2) {
      setOpciones([]);
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.get("/contacts", {
          params: { searchParam: busqueda, pageNumber: 1 }
        });

        setOpciones(
          (data.contacts || [])
            .filter(contact => !nomina.some(item => item.id === contact.id))
            .map(contact => ({
              id: contact.id,
              name: contact.name,
              number: contact.number,
              contactType: contact.contactType || "client"
            }))
        );
      } catch (err) {
        toastError(err);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [busqueda, open, nomina]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("clientsModal.errors.nameRequired"));
      return;
    }

    setSaving(true);

    try {
      const payload = { name, isSubscriber, notes };

      const { data } = clientId
        ? await api.put(`/clients/${clientId}`, payload)
        : await api.post("/clients", payload);

      await api.put(`/clients/${data.id}/contacts`, {
        contacts: nomina.map(contact => ({
          id: contact.id,
          contactType: contact.contactType
        }))
      });

      toast.success(t("clientsModal.success"));
      onClose();
    } catch (err) {
      // El backend avisa cuando un contacto tipo cliente ya está en otra ficha.
      if (String(err?.response?.data?.error || "").startsWith("ERR_CONTACT_ALREADY_LINKED")) {
        toast.error(t("clientsModal.errors.alreadyLinked"));
      } else {
        toastError(err);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {clientId ? t("clientsModal.title.edit") : t("clientsModal.title.add")}
      </DialogTitle>

      <DialogContent dividers>
        <TextField
          label={t("clientsModal.form.name")}
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
          margin="normal"
        />

        <FormControlLabel
          control={
            <Switch
              checked={isSubscriber}
              onChange={e => setIsSubscriber(e.target.checked)}
            />
          }
          label={t("clientsModal.form.subscriber")}
        />

        <TextField
          label={t("clientsModal.form.notes")}
          helperText={t("clientsModal.form.notesHelp")}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          margin="normal"
        />

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {t("clientsModal.form.contactsTitle")}
        </Typography>

        <Autocomplete
          options={opciones}
          getOptionLabel={option => `${option.name} — ${option.number}`}
          value={null}
          inputValue={busqueda}
          onInputChange={(e, value) => setBusqueda(value)}
          onChange={(e, option) => {
            if (!option) return;

            setNomina(prevState => [...prevState, option]);
            setBusqueda("");
          }}
          renderInput={params => (
            <TextField
              {...params}
              size="small"
              placeholder={t("clientsModal.form.addContact")}
            />
          )}
        />

        <List dense>
          {nomina.map(contact => (
            <ListItem
              key={contact.id}
              secondaryAction={
                <IconButton
                  size="small"
                  onClick={() =>
                    setNomina(prevState =>
                      prevState.filter(item => item.id !== contact.id)
                    )
                  }
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={contact.name}
                secondary={contact.number}
              />
              <Select
                size="small"
                value={contact.contactType}
                onChange={e =>
                  setNomina(prevState =>
                    prevState.map(item =>
                      item.id === contact.id
                        ? { ...item, contactType: e.target.value }
                        : item
                    )
                  )
                }
              >
                <MenuItem value="client">
                  {t("clientsModal.contactType.client")}
                </MenuItem>
                <MenuItem value="external">
                  {t("clientsModal.contactType.external")}
                </MenuItem>
              </Select>
            </ListItem>
          ))}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t("clientsModal.buttons.cancel")}</Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={saving}
        >
          {t("clientsModal.buttons.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientsModal;
```

- [ ] **Step 2: Sumar los textos**

En los tres idiomas, con las claves usadas arriba (`clientsModal.title.add`,
`title.edit`, `form.name`, `form.subscriber`, `form.notes`, `form.notesHelp`,
`form.contactsTitle`, `form.addContact`, `contactType.client`, `contactType.external`,
`buttons.cancel`, `buttons.save`, `success`, `errors.nameRequired`,
`errors.alreadyLinked`). En español:

```js
clientsModal: {
  title: { add: "Nuevo cliente", edit: "Editar cliente" },
  form: {
    name: "Nombre o razón social",
    subscriber: "Abonado",
    notes: "Notas",
    notesHelp: "CUIT, tipo de abono y todo lo demás va acá.",
    contactsTitle: "Contactos de este cliente",
    addContact: "Buscar contacto por nombre o número"
  },
  contactType: { client: "Cliente", external: "Externo" },
  buttons: { cancel: "Cancelar", save: "Guardar" },
  success: "Cliente guardado",
  errors: {
    nameRequired: "El nombre es obligatorio",
    alreadyLinked: "Ese contacto ya es cliente de otra ficha: marcalo como externo para vincularlo a esta."
  }
}
```

- [ ] **Step 3: Compilar y verificar**

Run: `cd frontend && CI=false GENERATE_SOURCEMAP=false npm run build`
Expected: `Compiled successfully`.

Checklist:
1. Alta de una ficha abonada con dos contactos, elegidos con el buscador.
2. Editar la ficha: la nómina se carga con cada contacto y su tipo.
3. Quitar un contacto de la nómina y guardar: desaparece de la ficha.
4. Vincular a esta ficha un contacto tipo cliente que ya está en otra: aparece el mensaje
   que explica que hay que marcarlo como externo.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ClientsModal frontend/src/translate/languages
git commit -m "$(cat <<'EOF'
feat(panel): modal de la ficha con su nómina de contactos

Se cargan los datos del cliente, se buscan contactos por nombre o número y cada
uno entra con su tipo (cliente o externo). Al guardar se manda la nómina completa
en una sola llamada, así el backend resuelve altas, bajas y cambios de tipo sin
que el panel tenga que calcular diferencias.

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
EOF
)"
```

---

### Task 9: Tipo y fichas en el modal del contacto, y el panel del ticket

**Files:**
- Modify: `frontend/src/components/ContactModal/index.js`
- Modify: `frontend/src/components/ContactDrawer/index.js`
- Modify: `backend/src/services/ContactServices/ShowContactService.ts`
- Modify: `frontend/src/translate/languages/{es,en,pt}.js`

**Interfaces:**
- Consumes: `GET /clients?searchParam=`, `PUT /contacts/:contactId` con `contactType` y
  `clientIds` (Task 5), y el include de `clients` que ya viene en `GET /tickets/:id`.
- Produces: en el modal del contacto, los campos **Tipo** y **Clientes**; en el panel del
  ticket, la ficha y los chips de estado.

- [ ] **Step 1: Agregar los campos al modal del contacto**

En `frontend/src/components/ContactModal/index.js`, dentro del formulario y junto a los
campos que ya existen (el modal se guarda con un `PUT /contacts/:id`, alrededor de la línea
330):

```jsx
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    {t("contactModal.clientSection.title")}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <FormControl fullWidth size="small" margin="normal">
                    <InputLabel>{t("contactModal.clientSection.type")}</InputLabel>
                    <Select
                      value={contactType}
                      label={t("contactModal.clientSection.type")}
                      onChange={e => {
                        const valor = e.target.value;
                        setContactType(valor);

                        if (valor === "client") {
                          setSelectedClients(prevState => prevState.slice(0, 1));
                        }
                      }}
                    >
                      <MenuItem value="client">
                        {t("contactModal.clientSection.typeClient")}
                      </MenuItem>
                      <MenuItem value="external">
                        {t("contactModal.clientSection.typeExternal")}
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <Autocomplete
                    multiple
                    options={clientsOptions}
                    value={selectedClients}
                    onChange={(e, value) => setSelectedClients(value)}
                    getOptionLabel={option => option.name}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={params => (
                      <TextField
                        {...params}
                        margin="normal"
                        size="small"
                        label={t("contactModal.clientSection.clients")}
                        helperText={
                          contactType === "client"
                            ? t("contactModal.clientSection.clientsHelpSingle")
                            : t("contactModal.clientSection.clientsHelpMultiple")
                        }
                      />
                    )}
                  />
                </Box>
```

Con el estado y la búsqueda:

```js
  const [contactType, setContactType] = useState("client");
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientsOptions, setClientsOptions] = useState([]);
  const [clientsSearch, setClientsSearch] = useState("");

  useEffect(() => {
    setContactType(contact?.contactType || "client");
    setSelectedClients(
      (contact?.clients || []).map(client => ({
        id: client.id,
        name: client.name,
        isSubscriber: client.isSubscriber
      }))
    );
  }, [contact]);

  useEffect(() => {
    if (!contactModalOpen || clientsSearch.trim().length < 2) {
      setClientsOptions([]);
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.get("/clients", {
          params: { searchParam: clientsSearch, pageNumber: 1 }
        });

        setClientsOptions(
          (data.clients || []).map(client => ({
            id: client.id,
            name: client.name,
            isSubscriber: client.isSubscriber
          }))
        );
      } catch (err) {
        toastError(err);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [clientsSearch, contactModalOpen]);
```

Y en el armado del cuerpo del `PUT`, sumar los dos campos:

```js
        contactType,
        clientIds: selectedClients.map(client => client.id),
```

El `GET /contacts/:id` del panel no trae las fichas hoy: para que la edición cargue la
nómina, el backend debe incluir `clients` en `ShowContactService` con
`attributes: ["id", "name", "isSubscriber"]` y `through: { attributes: [] }`, igual que en
`ListTicketsService` (Task 6). Agregar ese include, o si ya existe el include de `tags`,
sumar `clients` a la lista.

- [ ] **Step 2: Mostrar la ficha en el panel del ticket**

En `frontend/src/components/ContactDrawer/index.js`, después del bloque de detalles del
contacto (el que ya muestra número, correo y etiquetas), agregar:

```jsx
        {displayContact?.clients?.length > 0 && (
          <ContactDetails elevation={0}>
            <Typography variant="subtitle2" color="text.secondary">
              {displayContact.contactType === "external"
                ? t("contactDrawer.contactTypeExternal")
                : t("contactDrawer.client")}
            </Typography>

            {displayContact.clients.map(client => (
              <Box key={client.id} sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}>
                <Link
                  component="button"
                  onClick={() => navigate(`/clients?searchParam=${encodeURIComponent(client.name)}`)}
                  sx={{ textAlign: "left" }}
                >
                  {client.name}
                </Link>

                <Chip
                  size="small"
                  color={client.isSubscriber ? "primary" : "default"}
                  label={
                    client.isSubscriber
                      ? t("clients.filters.subscribers")
                      : t("clients.filters.nonSubscribers")
                  }
                />
              </Box>
            ))}
          </ContactDetails>
        )}
```

(importar `Chip`, `Box` y `useNavigate` si no están; el archivo ya usa `Link` de MUI y
`ContactDetails`.)

- [ ] **Step 3: Sumar los textos**

En los tres idiomas:

```js
// es.js
contactModal: {
  // ...lo existente
  clientSection: {
    title: "Cliente",
    type: "Tipo de contacto",
    typeClient: "Cliente",
    typeExternal: "Externo",
    clients: "Clientes",
    clientsHelpSingle: "Un contacto tipo cliente pertenece a una sola ficha.",
    clientsHelpMultiple: "Un contacto externo puede estar en varias fichas."
  }
},
contactDrawer: {
  // ...lo existente
  client: "Cliente",
  contactTypeExternal: "Externo"
}
```

- [ ] **Step 4: Compilar y verificar**

Run: `cd frontend && CI=false GENERATE_SOURCEMAP=false npm run build`
Expected: `Compiled successfully`.

Checklist:
1. Abrir el ticket de un contacto con ficha: el panel derecho muestra el nombre del cliente
   y el chip Abonado o No abonado.
2. Marcar un contacto como Externo y darle dos fichas: el panel muestra las dos.
3. Al reabrir el modal del contacto, el tipo y las fichas quedan cargados como se guardaron.
4. Un contacto sin ficha no muestra el bloque de cliente.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ContactModal frontend/src/components/ContactDrawer \
  frontend/src/translate/languages backend/src/services/ContactServices/ShowContactService.ts
git commit -m "$(cat <<'EOF'
feat(panel): el contacto se marca como cliente o externo y muestra su ficha en el ticket

Desde el modal del contacto se elige el tipo y las fichas (una sola si es cliente,
varias si es externo), y el panel del ticket muestra de qué cliente es y si está
abonado, con enlace a la ficha. El drawer ya no obliga a ir a Contactos para
averiguarlo.

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
EOF
)"
```

---

### Task 10: Filtro por estado de abono en Contactos y en Tickets

**Files:**
- Modify: `frontend/src/pages/Contacts/index.js:193-215,248-282,799-816` (el filtro, con el
  mismo patrón que `statusFilter`, que ya está en ese archivo)
- Modify: `frontend/src/components/TicketsList/index.js:225,486`
- Modify: `frontend/src/hooks/useTickets/index.js:39-60`
- Modify: `frontend/src/translate/languages/{es,en,pt}.js`

**Interfaces:**
- Consumes: `clientFilter` en `GET /tickets` (Task 6) y en `GET /contacts` (Task 5).
- Produces: en ambas pantallas, un selector con **Todos / Abonado / No abonado / Externo**.

- [ ] **Step 1: Agregar el filtro en Contactos**

En `frontend/src/pages/Contacts/index.js`, junto al estado actual (`statusFilter`, línea
193), agregar `clientFilter` con el mismo patrón: un `useState("")`, incluirlo en el efecto
que resetea la página (línea 248) y en la dependencia del fetch (línea 282), mandarlo en los
params (línea 266) y sumar el `Select` debajo del de estado (línea 801):

```js
  const [clientFilter, setClientFilter] = useState("");
```

```js
              ...(clientFilter ? { clientFilter } : {})
```

```jsx
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={clientFilter}
            displayEmpty
            onChange={e => setClientFilter(e.target.value)}
          >
            <MenuItem value="">{t("clients.filters.all")}</MenuItem>
            <MenuItem value="subscriber">{t("clients.filters.subscribers")}</MenuItem>
            <MenuItem value="nonSubscriber">{t("clients.filters.nonSubscribers")}</MenuItem>
            <MenuItem value="external">{t("clients.filters.external")}</MenuItem>
          </Select>
        </FormControl>
```

El backend ya acepta `clientFilter` en `GET /contacts` (Task 5), así que el panel sólo
manda el valor.

- [ ] **Step 2: Agregar el filtro en la lista de tickets**

En `frontend/src/components/TicketsList/index.js`, junto al `TagsFilter` (línea 486),
agregar el mismo `Select` con los tres valores, guardando el estado en la lista y pasándolo
al hook. En `frontend/src/hooks/useTickets/index.js`, sumar el parámetro:

```js
        const { data } = await api.get("/tickets", {
          params: {
            // ...los que ya están
            clientFilter
          }
        });
```

- [ ] **Step 3: Textos**

Las claves `clients.filters.*` ya se cargaron en Task 7; no hace falta más.

- [ ] **Step 4: Compilar y verificar**

Run: `cd frontend && CI=false GENERATE_SOURCEMAP=false npm run build`
Expected: `Compiled successfully`.

Checklist, con datos reales:
1. Filtrar contactos por Abonado, No abonado y Externo: los resultados coinciden con lo
   asignado y la lista sigue paginando.
2. Filtrar tickets por Abonado: sólo aparecen tickets de contactos de fichas abonadas.
3. Filtrar tickets por Externo: aparecen los del diseñador y no los de los clientes.
4. Un contacto sin ficha no aparece ni en Abonado ni en No abonado.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Contacts/index.js frontend/src/components/TicketsList/index.js \
  frontend/src/hooks/useTickets
git commit -m "$(cat <<'EOF'
feat(panel): filtra contactos y tickets por abonado, no abonado y externo

Los dos filtros se resuelven en el servidor por la misma razón que el resto: las
listas paginan de a 20. "No abonado" es una decisión explícita (ficha con
isSubscriber en false), así que un contacto sin ficha no cae ahí.

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
EOF
)"
```

---

## Verificación final de la fase

Con el backend y el panel levantados, y una copia de la base de producción para las
pruebas:

1. `cd backend && npx tsc --noEmit` sin errores y `npx jest src/__tests__/unit` en verde.
2. `cd frontend && CI=false npm run build` con `Compiled successfully`.
3. Alta de un cliente abonado con dos contactos propios: sus dos tickets muestran la misma
   ficha y el chip Abonado.
4. Alta de un externo vinculado a dos clientes distintos (uno abonado y otro no): figura en
   las dos fichas y su ticket muestra las dos.
5. Intentar vincular un contacto tipo cliente a una segunda ficha: error
   `ERR_CONTACT_ALREADY_LINKED`, sin reasignación.
6. Borrar una ficha: los contactos siguen existiendo y sin ficha, y sus tickets dejan de
   mostrar cliente.
7. Los filtros de contactos y de tickets, en los tres valores.
8. Dos pestañas abiertas: crear, editar y borrar una ficha actualiza la otra por Socket.IO.
