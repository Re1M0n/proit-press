# Recordatorios compartidos con agenda y alarma

- **Fecha:** 2026-10-21
- **Proyecto:** `proit-press` / Press-Ticket
- **Estado:** diseño aprobado por el usuario
- **Alcance:** recordatorios con fecha/hora, agenda mensual y alarma en el panel web

## Contexto

El panel no tiene forma de agendar tareas a futuro. Los usuarios necesitan
recordar acciones ligadas a un ticket, a un contacto o sin vínculo (por ejemplo,
"llamar al cliente a las 15:00"), y que el aviso llegue a tiempo a todo el equipo,
no solo a quien lo creó: si el creador está ocupado, cualquiera puede tomar la
tarea.

El backend ya tiene Socket.IO con un room por usuario, un servicio de push móvil
(Firebase, sin configurar en producción) y el frontend usa `use-sound` para el
sonido de tickets. No hay scheduler ni librería de cron en el backend.

## Objetivos

1. Crear, editar, completar y posponer recordatorios con fecha y hora.
2. Repetición opcional diaria, semanal o mensual, o sin repetición.
3. Vincular el recordatorio a un ticket, a un contacto o a ninguno.
4. Que **todos los usuarios** vean todos los recordatorios y cualquiera pueda
   completarlos o posponerlos.
5. Agenda mensual estilo Google Calendar con panel del día.
6. Alarma sonora y popup en el panel, más notificación del navegador, con sonido
   distinto al de tickets.
7. Mostrar los recordatorios vencidos en la agenda sin sonido.

## Fuera de alcance

- Push móvil y cualquier dependencia de la app Android.
- Avisos por email o por WhatsApp.
- Repetición por días de semana personalizados o rangos de fin.
- Notas largas, prioridades, etiquetas o adjuntos.
- Calendario compartido con Google/Outlook.
- Edición o borrado por usuarios que no sean el creador o un admin.

## Decisiones

### Modelo de datos

Tabla `Reminders`:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | integer PK | autoincremental |
| `userId` | integer FK `Users` | creador; `onDelete: CASCADE` |
| `title` | varchar(120) | obligatorio, no vacío |
| `notes` | varchar(150) | opcional |
| `dueAt` | datetime | obligatorio, se guarda en UTC |
| `status` | enum `pending`, `done` | default `pending` |
| `recurrence` | enum `none`, `daily`, `weekly`, `monthly` | default `none` |
| `ticketId` | integer FK `Tickets` | opcional, `onDelete: SET NULL` |
| `contactId` | integer FK `Contacts` | opcional, `onDelete: SET NULL` |
| `notifiedAt` | datetime | null hasta que el scheduler avisa |
| `createdAt`, `updatedAt` | datetime | Sequelize |

Índices: `(status, dueAt)` para el scheduler y `(dueAt)` para el rango mensual.

### Permisos

- **Ver:** todos los usuarios autenticados ven todos los recordatorios.
- **Completar y posponer:** cualquier usuario autenticado.
- **Crear:** cualquier usuario autenticado; queda como creador.
- **Editar y eliminar:** solo el creador o un usuario con perfil `admin`
  (comparación sin distinguir mayúsculas, como el resto del backend).

### Recurrencia

- Completar un recordatorio con repetición distinta de `none` crea una nueva
  ocurrencia `pending` con el mismo creador, título, notas, vínculo y repetición.
- La siguiente fecha se calcula desde el `dueAt` vigente al completar: `+1 día`,
  `+7 días` o `+1 mes` con `date-fns` (`addMonths` recorta fin de mes: 31/01 →
  28/02).
- Si se pospuso y luego se completa, la siguiente ocurrencia parte de la fecha
  pospuesta (puede haber un corrimiento menor; se acepta).
- Las ocurrencias no tienen fin: se crean de a una al completar, nunca por lote.

### API

Router `/reminders`, todas las rutas autenticadas:

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/reminders?from&to` | lista en rango ISO; incluye creador, ticket y contacto resumidos |
| POST | `/reminders` | crea (`title`, `dueAt`, `notes?`, `recurrence?`, `ticketId?`, `contactId?`) |
| PUT | `/reminders/:id` | edita campos; solo creador o admin |
| PATCH | `/reminders/:id/status` | `{ "status": "done" }`; cualquier usuario |
| POST | `/reminders/:id/snooze` | `{ "minutes": 5 \| 15 \| 60 }`; cualquier usuario |
| DELETE | `/reminders/:id` | solo creador o admin |

Respuesta de un recordatorio:

```json
{
  "id": 12,
  "title": "Llamar a Marcelo",
  "notes": "Presupuesto de octubre",
  "dueAt": "2026-10-21T18:00:00.000Z",
  "status": "pending",
  "recurrence": "weekly",
  "notifiedAt": null,
  "createdBy": { "id": 3, "name": "Rei" },
  "ticket": { "id": 2058, "contactName": "Marcelo" },
  "contact": null
}
```

`status: done` sobre una ocurrencia recurrente devuelve además `nextReminder`
con la ocurrencia creada.

### Scheduler y eventos

- `ReminderScheduler` inicia en `server.ts` después de `initIO()` y corre cada
  30 segundos.
- Consulta `status = pending AND dueAt <= now AND notifiedAt IS NULL`.
- Para cada fila: guarda `notifiedAt = now` y emite `reminder` a **todos** los
  sockets conectados (`io.emit`), con el recordatorio serializado.
- Un mismo recordatorio se emite una sola vez aunque haya varias pestañas. Todas
  las pestañas que lo reciban suenan.
- El aviso puede llegar hasta 30 segundos tarde; es aceptable.
- `snooze` reprograma desde el momento del clic (ahora + minutos) y pone
  `notifiedAt = null`, por lo que vuelve a sonar.
- CRUD y cambios de estado emiten `reminderUpdate` a todos con
  `{ action: "create" | "update" | "delete", reminder }` para refrescar la agenda
  sin recargar.
- Los recordatorios vencidos que se cargan por HTTP (panel recién abierto) se
  muestran como vencidos y **no** suenan.

### Frontend

- Ruta `/reminders` y entrada **Recordatorios** en la sección General del menú,
  visible para todos los perfiles.
- Grilla mensual de 7 columnas (lunes a domingo), navegación `‹ mes ›` y botón
  **Hoy**. Cada día muestra hasta 3 chips `HH:mm título` y `+N más`; los vencidos
  pendientes se distinguen con color de error. Clic en un día abre el panel
  derecho con la lista de ese día; clic en un chip abre la edición. En pantallas
  angostas la lista va debajo de la grilla.
- Modal crear/editar: título, fecha (`DatePicker`), hora, repetición, vínculo
  opcional con pestañas **Ticket** / **Contacto** (buscador con resultados
  existentes de `/tickets` y `/contacts`), comentario con contador de 150 y
  botones Guardar / Eliminar según permisos.
- Alarma global en el layout: escucha `reminder`, reproduce un sonido propio de
  alarma (asset distinto de `sound.mp3`) y abre un diálogo con título, hora,
  vínculo y acciones **Abrir**, **Posponer** (5/15/60 min) y **Listo**.
- **Abrir** navega a `/tickets/:id` si tiene ticket; si solo tiene contacto va a
  `/contacts` (la página no soporta seleccionar un contacto por URL); si no tiene
  vínculo, solo cierra el diálogo.
- Volver a `pending` un recordatorio completado no está permitido: `done` es
  final para esa ocurrencia. Si se completó por error, se crea uno nuevo.
- Notificación del navegador: si el permiso está concedido y `document.hidden` es
  verdadero, dispara `new Notification(...)`; al hacer clic enfoca el panel y
  navega al vínculo. El permiso se pide con un botón en la página de
  recordatorios (Chrome exige gesto del usuario).
- Si el permiso está denegado o el navegador no lo soporta, la alarma interna
  sigue funcionando.

## Manejo de errores

- Validación: `title` requerido y ≤120, `notes` ≤150, `dueAt` ISO válido,
  `recurrence` dentro del enum, `minutes` en {5, 15, 60}, ids numéricos.
- `404` si el recordatorio no existe; `403` al editar/borrar sin permiso.
- Si falla la emisión por socket, el scheduler registra el error pero no revierte
  `notifiedAt` (se prioriza no repetir la alarma).
- En el frontend, todo error de API usa `toastError` como el resto del panel.

## Pruebas

Backend (Jest, unitarias con modelos mockeados):

1. El scheduler emite una vez y no re-emite lo ya notificado.
2. Completar una recurrencia diaria/semanal/mensual crea la siguiente ocurrencia
   con la fecha esperada, incluido el recorte de fin de mes.
3. `snooze` mueve `dueAt` y limpia `notifiedAt`; rechaza minutos inválidos.
4. Editar/borrar sin ser creador ni admin devuelve 403; completar y posponer lo
   permite cualquier usuario.
5. El rango `from`/`to` filtra por `dueAt` inclusivo.

Frontend: verificación manual de la grilla, el modal, el diálogo de alarma, la
notificación del navegador y el refresco por socket.

## Despliegue

- Migración nueva (`create-reminders`) y modelo Sequelize.
- `deploy.sh` ya ejecuta `db:migrate` antes de reiniciar el backend.
- Sin backfill: la tabla arranca vacía.
- El scheduler no requiere configuración ni variables de entorno.

## Riesgos

- **Zona horaria:** se guarda UTC y se muestra en hora local del navegador; si el
  navegador está en otra zona que la oficina, la hora visible cambia.
- **Alarma duplicada por pestaña:** intencional; el estado del recordatorio es
  único, pero cada pestaña conectada suena.
- **Notificaciones del navegador:** dependen del permiso y de HTTPS (el panel ya
  se sirve por HTTPS); no reemplazan la alarma interna.
- **Crecimiento por recurrencia:** se crea una fila por ocurrencia al completar;
  no hay ocurrencias infinitas creadas por adelantado.
