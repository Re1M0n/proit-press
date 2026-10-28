# Módulo de Clientes: agrupar contactos, marcar abonados y distinguir externos

- **Fecha:** 2026-10-27
- **Proyecto:** `proit-press` / Press-Ticket
- **Estado:** diseño propuesto, pendiente de revisión del usuario
- **Alcance:** alta de clientes, agrupación de contactos, marca de abonado/no abonado,
  categoría cliente/externo por contacto, y uso de todo eso en tickets y contactos

## Contexto

Hoy la unidad de todo el sistema es el **Contacto**: nombre, número (único), etiquetas
y un estado (`Contact.status`, que apunta por nombre a `ClientStatus`). Ese modelo no
permite representar un abonado que escribe desde dos o tres números distintos: cada
teléfono es una fila separada, sin nada que los relacione, así que no hay dónde poner
"este abonado está al día" ni dónde ver todo lo que nos escribió esa empresa.

Tampoco distingue a quien nos escribe por otro motivo. El caso concreto que motivó esta
parte: el diseñador web de un cliente nos escribe por diversos temas. No es un cliente
nuestro, pero sí un contacto que pertenece a la órbita de ese cliente —y puede
pertenecer a más de uno.

Lo que ya existe y **no se toca**:

- **Estado de clientes** (`ClientStatus`): estados configurables con color, aplicados al
  contacto, con permisos, gráficos y pantalla propia. Es una clasificación de *contactos*;
  el estado de abono que se agrega acá es del *cliente* (que puede agrupar varios
  contactos) y no lo reemplaza.
- **Etiquetas** (`Tag`): clasifican contactos, pero no agrupan números ni dan ficha, por
  eso se descartan como solución.

Restricciones reales del código que condicionan el diseño:

- Contactos y tickets **paginan en el servidor** (20 por página); filtrar en el frontend
  daría resultados incompletos.
- El panel ya tiene un patrón de módulo CRUD (modelo → `Services/*` → controller →
  `routeRegistry` → página + modal + textos + menú) que conviene copiar en vez de
  inventar uno nuevo.
- Ya existen tablas de enlace con este mismo patrón (`ContactTags` con `Tag` y `Contact`),
  así que el vínculo muchos-a-muchos no es un mecanismo nuevo en el proyecto.
- El deploy de producción corre las migraciones automáticamente en cada push a `main`
  (ver `docs/produccion.md`), así que la migración tiene que ser chica, aditiva y
  reversible.

## Decisiones tomadas con el usuario

| Tema | Decisión |
|---|---|
| Qué es un cliente | Ficha comercial que agrupa varios contactos |
| Abonado / no abonado | Campo fijo en la ficha: `isSubscriber` (sí/no) |
| Datos de la ficha | Mínimos: nombre, abonado y notas. Sin CUIT, sin tipo de abono: eso va en la nota |
| Primeras funciones | Ver la ficha y su estado en el ticket · listado de fichas con filtros y búsqueda · filtrar tickets y contactos por estado de cliente |
| Asignación de contactos | Desde la ficha **y** desde el modal del contacto |
| Categoría del contacto | Dos valores: **Cliente** o **Externo** |
| Alcance del externo | Un externo puede pertenecer a **más de un** cliente |

## Modelo de datos

### Tabla nueva `Clients`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK autoincrement | |
| `name` | STRING NOT NULL | Nombre o razón social |
| `isSubscriber` | BOOLEAN NOT NULL, default `false` | Abonado / no abonado |
| `notes` | TEXT NULL | Notas libres: CUIT, tipo de abono, todo lo demás |
| `createdAt` / `updatedAt` | DATETIME | |

No se modelan datos fiscales (CUIT) ni tipo de abono: se escriben en `notes`. La ficha
arranca con lo mínimo y crece sólo si aparece una necesidad concreta.

### Categoría del contacto: `Contacts.contactType`

Columna nueva STRING NOT NULL, default `"client"`, con dos valores posibles:

- `"client"`: el contacto **es** el cliente (el número del abonado).
- `"external"`: el contacto no es un cliente nuestro; es alguien de la órbita
  (el diseñador, un técnico, un proveedor que nos escribe).

Mismo estilo que `messageHandling`, que ya es una columna de valores permitidos
documentada en el modelo.

### Vínculo con clientes: tabla de enlace `ClientContacts`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK autoincrement | |
| `clientId` | INTEGER FK → `Clients.id`, NOT NULL | |
| `contactId` | INTEGER FK → `Contacts.id`, NOT NULL | |
| `createdAt` / `updatedAt` | DATETIME | |

Índice único sobre (`clientId`, `contactId`); índices por `contactId` y por `clientId`
para los filtros. Borrar una ficha borra sus enlaces y **no** borra contactos.

**Regla de multiplicidad:**

- Un contacto de tipo `client` puede estar en **una sola** ficha. Si se intenta
  vincularlo a otra, el servicio responde con error (`ERR_CONTACT_ALREADY_LINKED`,
  indicando con qué ficha está) en lugar de reasignarlo en silencio.
- Un contacto de tipo `external` puede estar en **varias** fichas, que es el caso del
  diseñador que trabaja con dos de nuestros clientes.

Por qué tabla de enlace y no un campo `clientId` en `Contacts`: con un campo simple un
contacto pertenece a lo sumo a una ficha, y el requisito de que un externo esté en varios
clientes obliga o bien a duplicar el contacto (rompe el "un contacto = un número único")
o bien a la tabla de enlace. Es además el mecanismo que el proyecto ya usa para
`ContactTags`, y dejar la categoría en el contacto mantiene el caso de los contactos sin
ninguna ficha (un proveedor suelto) bien representado.

### Migración

Un solo archivo: `backend/src/database/migrations/2026XXXXXXXXXX-create-clients.ts`
con `down` que revierte en orden inverso (tabla de enlace, columna de categoría, tabla
de fichas). Es aditiva (tablas y columnas nuevas con valor por defecto), así que no
bloquea lo que ya está en producción.

## Backend

### Modelos

- `backend/src/models/Client.ts`: clase `Client` con `@Table({ tableName: "Clients" })`,
  campos de arriba y `@BelongsToMany(() => Contact, () => ClientContact) contacts`.
- `backend/src/models/ClientContact.ts`: misma forma que `ContactTag` (FK a `Clients` y
  a `Contact`), `@Table({ tableName: "ClientContacts" })`.
- `backend/src/models/Contact.ts`: `contactType` y
  `@BelongsToMany(() => Clients, () => ClientContact) clients`.
- Registro: importar ambos en `backend/src/database/index.ts` y sumarlos al array
  `models` que se pasa a `sequelize.addModels`.

### Servicios (`backend/src/services/ClientServices/`)

| Servicio | Qué hace |
|---|---|
| `ListClientsService` | Filtros `searchParam` (nombre) y `isSubscriber` (`"true"`/`"false"`), `pageNumber`; 20 por página, `count`/`hasMore`, orden por nombre, y por ficha el total de contactos y cuántos son externos, con `Sequelize.literal` de subconsulta sobre `ClientContacts` (mismo patrón que `ClientStatusServices/ListService`). |
| `CreateClientService` / `UpdateClientService` | Nombre obligatorio; normalizan `isSubscriber` a booleano; error de negocio si el nombre ya existe. |
| `ShowClientService` | Ficha + contactos vinculados (`id`, `name`, `number`, `profilePicUrl`, `contactType`). |
| `DeleteClientService` | Borra la ficha y sus enlaces en una transacción; los contactos quedan intactos. |
| `SetClientContactsService` | Recibe `clientId` y `contacts: [{ id, contactType }]`; en una transacción deja la nómina de la ficha exactamente como se pidió —vincula los nuevos, desvincula los que salieron y actualiza la categoría de cada uno— y valida la regla de multiplicidad antes de escribir. Es lo que usa el modal de la ficha. |

### Contactos y tickets

- `UpdateContactService` / `ContactController.update`: aceptan `contactType`, y una lista
  de `clientIds` (en el modal del contacto, un contacto tipo `client` admite una sola
  ficha; uno tipo `external`, varias).
- `ListContactsService`: filtros nuevos `contactType` (`"client"`/`"external"`) y
  `clientId`.
- `ListTicketsService`: filtro nuevo `clientFilter` con cuatro valores, que es como se
  resuelve el filtro del panel sin ambigüedad:

  | Valor | Qué devuelve |
  |---|---|
  | `subscriber` | Tickets de contactos tipo cliente cuya ficha es abonada |
  | `nonSubscriber` | Tickets de contactos tipo cliente cuya ficha no es abonada |
  | `external` | Tickets de contactos tipo externo |
  | (vacío) | Todos |

  **Cómo se resuelve (decisión técnica):** primero se resuelven los ids que cumplen
  (`SELECT contactId FROM ClientContacts JOIN Clients …` para abonado/no abonado, o
  directamente `contactType` para externos) y después se filtra
  `whereCondition.contactId = { [Op.in]: ids }`. Se elige esto en lugar de una condición
  anidada sobre el include porque el `$contact.clients.isSubscriber$` dentro de un
  `findAndCountAll` puede desincronizar el `count` de las filas; con los ids resueltos, el
  conteo y la paginación son los de siempre.

### Rutas (`backend/src/routes/routeRegistry.ts`)

Grupo nuevo, con `isAuth` como los demás:

| Método | Ruta | Handler |
|---|---|---|
| GET | `/clients` | `ClientController.index` |
| POST | `/clients` | `ClientController.store` |
| GET | `/clients/:clientId` | `ClientController.show` |
| PUT | `/clients/:clientId` | `ClientController.update` |
| DELETE | `/clients/:clientId` | `ClientController.delete` |
| PUT | `/clients/:clientId/contacts` | `ClientController.setContacts` |

El controller emite por Socket.IO `client` con
`{ action: "create" | "update" | "delete", client }`, igual que `ClientStatusController`,
para que las otras pestañas se sincronicen.

## Frontend

| Archivo | Cambio |
|---|---|
| `frontend/src/pages/Clients/index.js` (nuevo) | Tabla con nombre, chip **Abonado/No abonado**, cantidad de contactos (y cuántos externos) y acciones (editar, eliminar). Buscador con debounce, filtro Abonado/No abonado/Todas, paginación por scroll, borrado con confirmación y escucha del evento Socket.IO `client`. Copia la estructura de `pages/ClientStatus/index.js`. La página se arma **con pestañas** desde el principio (**Clientes** y **Mensajes**); la segunda se completa en la fase 2. |
| `frontend/src/components/ClientsModal/index.js` (nuevo) | Alta/edición: nombre (obligatorio), switch **Abonado**, notas; y la nómina de contactos con buscador (`GET /contacts?searchParam=…`) donde cada contacto agregado tiene un selector **Cliente / Externo**. Al guardar, `PUT /clients/:id/contacts` con la nómina completa. Si un contacto tipo cliente ya está en otra ficha, se muestra el error del backend junto a ese contacto. |
| `frontend/src/components/ContactModal/index.js` | Selector **Tipo: Cliente / Externo** y selector **Clientes** (múltiple sólo cuando el tipo es Externo). Viajan en el mismo guardado del contacto. |
| `frontend/src/components/ContactDrawer/index.js` | Bloque con el tipo y las fichas del contacto: chip **Abonado/No abonado** si es tipo cliente con ficha, chip **Externo** con la lista de clientes vinculados si es externo, y enlace a cada ficha. Sin ficha y sin tipo externo, no se muestra nada. |
| `frontend/src/pages/Contacts/index.js` | Filtro **Abonado / No abonado / Externo** en la fila de filtros existente (junto a etiquetas y estado), enviado como `clientFilter`. |
| `frontend/src/components/TicketsList/index.js` | Mismo filtro, junto al `TagsFilter` existente. |
| `frontend/src/hooks/useTickets/index.js` | Pasar `clientFilter` en los parámetros de `GET /tickets` y reiniciar la paginación cuando cambia (el hook ya maneja `searchParam`, `status` y `queueIds`). |
| `frontend/src/routes/index.js` + `frontend/src/layout/MainListItems.js` | Ruta y entrada de menú **Clientes**, al lado de Estado de clientes. |
| `frontend/src/pages/Documentation/index.js` | Ficha del módulo, como tienen los demás. |
| `frontend/src/translate/languages/{es,en,pt}.js` | Textos del módulo, del modal, de la categoría y de los filtros. |

Orden de trabajo sugerido: migración y modelos → servicios y rutas → página y modal de
clientes → tipo y clientes en el modal del contacto y bloque en el ticket → filtros en
tickets y contactos → textos y documento.

## Fuera de alcance

- Datos de facturación (CUIT, tipo de abono, plan, importe, vencimiento): van en `notes`.
- Una tercera categoría "proveedor" separada de externo.
- Agrupar externos entre sí en una ficha propia que no sea un cliente.
- Mensajes automáticos por estado de abono y horario de atención editable: son la
  **fase 2** del módulo y tienen su propia spec,
  [`2026-10-27-mensajes-por-estado-de-cliente-design.md`](2026-10-27-mensajes-por-estado-de-cliente-design.md),
  que depende de esta.
- Importación/exportación masiva de fichas y API pública con tokens
  (`isApiToken('read:client')` y la sección de permisos de API Keys quedan para después).

## Riesgos y notas

- **Migración automática en producción:** el auto-deploy la corre sola; al ser aditiva es
  de bajo riesgo, pero conviene ensayarla antes contra una copia de la base y revisar
  `auto-deploy.log` después del deploy.
- **Filtro de tickets:** es el punto más delicado y por eso se resuelve con ids
  precalculados en lugar de condiciones anidadas (ver backend).
- **Contactos sin ficha:** siguen funcionando igual. Un contacto sin ficha y sin tipo
  externo **no** aparece bajo "No abonado": el filtro de abonados mira contactos tipo
  cliente con ficha, y "No abonado" es una decisión explícita (ficha con `isSubscriber`
  en `false`), no la ausencia de datos.
- **Contadores de tickets:** los números de abiertos/pendientes que muestra
  `TicketsManager` (`GET /tickets/count`) **no** se filtran por abonado en esta entrega;
  el filtro alcanza a la lista. Extender los contadores queda para después, para no tocar
  el conteo que ya usa el menú de filtros por sector.
- **Un contacto tipo cliente en dos fichas:** la regla lo impide y devuelve error. Si
  aparece el caso real de un número que es cliente de dos fichas, la salida es marcarlo
  externo en la segunda o convertir el vínculo en n:m con rol por vínculo.

## Verificación

Backend:

1. `npx tsc --noEmit` en `backend/` sin errores.
2. Migración arriba y abajo en la base local (`npm run migrate` y `migrate:undo`), con
   la tabla de enlace y la columna de categoría creadas y luego quitadas.
3. Borrar una ficha y confirmar que sus contactos siguen existiendo y que los enlaces
   desaparecieron.
4. Intentar vincular un contacto tipo cliente a una segunda ficha: responde
   `ERR_CONTACT_ALREADY_LINKED` y no reasigna.

Funcional (en el panel, con sesión):

5. Alta de un cliente abonado con dos contactos propios.
6. Abrir el ticket de cada uno de esos contactos: en el panel derecho figura la misma
   ficha y el chip Abonado.
7. Alta de un externo (el diseñador) vinculado a dos clientes distintos, uno abonado y
   otro no: figura en las dos fichas y su ticket muestra el chip Externo con ambas.
8. Filtrar contactos por "Abonado", "No abonado" y "Externo": los resultados coinciden
   con lo asignado y la paginación no se corta.
9. Filtrar la lista de tickets por "Abonado" y por "Externo": sólo aparecen los tickets
   que corresponden, y el conteo coincide con las filas visibles.
10. Quitar un contacto desde la ficha del cliente y comprobar que deja de figurar ahí,
    que su ticket ya no lo muestra y que el contacto sigue existiendo.
11. Cambiar un contacto de "Cliente" a "Externo" y agregarle una segunda ficha: se
    guarda y el ticket refleja las dos.
12. Abrir el panel en dos pestañas: crear, editar y borrar una ficha y ver que la otra se
    actualiza por Socket.IO.
