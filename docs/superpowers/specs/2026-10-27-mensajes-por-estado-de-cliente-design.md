# Mensajes automáticos por estado de abono y horario editable

- **Fecha:** 2026-10-27
- **Proyecto:** `proit-press` / Press-Ticket
- **Estado:** diseño propuesto, pendiente de revisión del usuario
- **Alcance:** saludo distinto para clientes no abonados, silencio para contactos
  externos, sección de mensajes dentro de la página de Clientes y horario de atención
  configurable desde el panel
- **Depende de:** [`2026-10-27-modulo-clientes-design.md`](2026-10-27-modulo-clientes-design.md)
  (necesita el estado de abono de la ficha y la categoría cliente/externo del contacto)

## Contexto

Hoy el mensaje automático de una conexión es uno solo: `Whatsapp.greetingMessage` dentro
de horario y `Whatsapp.outOfHoursMessage` fuera, y `SendAutoReplyMessage` los envía a
cualquier contacto, firmados con el nombre de la conexión. Eso significa que un no
abonado recibe el mismo texto que un abonado al día.

El horario de atención está fijo en el código, en
`backend/src/helpers/HorarioComercial.ts`: lunes a viernes de 9 a 18, resuelto en zona
`America/Argentina/Buenos_Aires` porque la VM corre en UTC. No hay forma de cambiarlo
desde el panel.

Los dos campos de mensajes se editan hoy en el modal de la conexión
(`frontend/src/components/WhatsAppModal/index.js`, sección *Mensajes*). Ese modal tiene
además una validación, en `CreateWhatsAppService` y `UpdateWhatsAppService`, que **exige**
saludo cuando la conexión tiene más de un sector, porque el saludo encabeza el menú de
sectores.

## Decisiones tomadas con el usuario

| Tema | Decisión |
|---|---|
| Saludo distinto | Sí: los clientes **no abonados** reciben otro mensaje |
| Contactos externos | No reciben ningún mensaje automático: en la mayoría de los casos somos nosotros los que iniciamos el contacto |
| Dónde se editan | Sección **Mensajes** dentro de la página de Clientes, no en el modal de la conexión |
| Horario de atención | Editable desde esa misma sección (deja de estar fijo en el código) |

## Reglas del mensaje automático

Es la parte que define el comportamiento; el resto es dónde se configura.

1. **Contacto externo (`contactType = "external"`)**: no se envía nada. Ni saludo ni aviso
   fuera de horario, y tampoco el menú de sectores. `SendAutoReplyMessage` devuelve `true`
   para que el flujo viejo de sectores no tome el turno: el contacto queda en mano de los
   agentes sin ruido automático.
2. **Fuera de horario** (para el resto de los contactos): `outOfHoursMessage` de la
   conexión, sin variantes por abonado, firmado con el nombre de la conexión. Se mantiene
   la ventana de 12 h que evita repetir el aviso a la misma persona.
3. **Dentro del horario y contacto tipo cliente**:
   - si su ficha es abonada (`isSubscriber = true`) → `greetingMessage`;
   - si no (sin ficha, o ficha con `isSubscriber = false`) → el mensaje nuevo
     `greetingMessageNonSubscriber`;
   - si ese mensaje nuevo está vacío → cae en `greetingMessage`, y si ese también está
     vacío no se manda nada.
4. **Sin mensajes propios**: si la conexión no tiene ninguno de los tres cargados, sigue
   funcionando el menú de sectores de siempre (`SendAutoReplyMessage` devuelve `false`).
5. La firma `*Nombre de la conexión:*` y la lógica de "una conversación nueva cada 12 h"
   no cambian.

**Despliegue sin sorpresas:** como el mensaje nuevo arranca vacío y cae en el saludo
actual, el día que se despliega nada cambia hasta que alguien escriba el texto de no
abonados en el panel.

## Modelo de datos

- Columna nueva `Whatsapps.greetingMessageNonSubscriber` (TEXT, nullable). Aditiva.
- Ajuste nuevo `businessHours` en la tabla `Settings` (clave `businessHours`, valor JSON),
  con esta forma:

  ```json
  { "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "open": "09:00", "close": "18:00" }
  ```

  La zona horaria **no** es configurable: sigue siendo `America/Argentina/Buenos_Aires`,
  fija en el código. Si el ajuste no existe, el default es el horario actual
  (lunes a viernes de 9 a 18), así que tampoco hay cambio de comportamiento al desplegar.

- Migración: `2026XXXXXXXXXX-add-non-subscriber-greeting.ts` (columna) y una inserción del
  ajuste `businessHours` con el default, ambas con `down`.

## Backend

### Horario configurable

`helpers/HorarioComercial.ts` deja de tener las constantes como única verdad:

- `obtenerHorarioComercial()`: lee el ajuste `businessHours` (`ListSettingsServiceOne`) con
  una caché en memoria de 30 s, y cae al default si falta o si el JSON no es válido.
- `estaDentroDelHorario(horario, ahora)`: función pura, con la lógica de zona horaria y de
  fin de horario exclusivo que ya está escrita.
- `estaEnHorarioComercial()` pasa a ser `async` y devuelve `estaDentroDelHorario(await
  obtenerHorarioComercial())`.
- `HORARIO_TEXTO` pasa a ser `describirHorario(horario)`, para que los logs y los textos de
  ayuda digan el horario configurado y no el viejo texto fijo.

El único uso de `estaEnHorarioComercial` es `SendAutoReplyMessage`, así que el cambio a
`async` queda contenido ahí.

### Mensaje automático

`SendAutoReplyMessage` suma dos averiguaciones antes de elegir el texto:

- `contact.contactType`: si es `external`, no envía nada y devuelve `true` (regla 1).
- Si el contacto es tipo cliente, si alguna de sus fichas es abonada (consulta a
  `ClientContacts` → `Clients.isSubscriber`, que para un contacto tipo cliente es a lo sumo
  una ficha).

Los textos existentes y el guardado de `whatsapp.greetingMessage` /
`whatsapp.outOfHoursMessage` no cambian de nombre ni de lugar.

### Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/whatsapp/automatic-messages` | Lista las conexiones con sus tres mensajes y la cantidad de sectores de cada una |
| PUT | `/whatsapp/:whatsappId/automatic-messages` | Guarda los tres mensajes de una conexión (cuerpo: `greetingMessage`, `greetingMessageNonSubscriber`, `outOfHoursMessage`) |
| GET | `/settings` | Ya existe: se usa para leer `businessHours` |
| PUT | `/settings/businessHours` | Ya existe: se usa para guardar el horario |

Van en el grupo de rutas de conexiones (`/whatsapp/…`) con `isAuth`. La ruta
`GET /whatsapp/automatic-messages` se registra **antes** de cualquier `GET
/whatsapp/:whatsappId` que se agregue en el futuro, para que Express no la interprete como
un id.

### Validación que cambia

`CreateWhatsAppService` y `UpdateWhatsAppService` dejan de exigir saludo cuando la conexión
tiene más de un sector (el mensaje ya no viaja en ese formulario). Ese aviso se convierte
en una advertencia visible en la sección Mensajes: "esta conexión tiene más de un sector y
no tiene saludo", sin bloquear el guardado. El menú de sectores sigue funcionando: si no
hay saludo, el mensaje sale con las opciones.

## Frontend

La página de Clientes pasa a tener **pestañas** para no rearmarla después:

| Pestaña | Contenido | Fase |
|---|---|---|
| **Clientes** | Listado y edición de fichas | 1 |
| **Mensajes** | Horario de atención + mensajes por conexión | 2 (esta spec) |

| Archivo | Cambio |
|---|---|
| `frontend/src/pages/Clients/index.js` | Pestañas y pestaña **Mensajes**: tarjeta de **Horario de atención** (casillas de días, hora de apertura y cierre, la zona Argentina como texto fijo) que guarda con `PUT /settings/businessHours`; y luego, por conexión, un selector y los tres campos —bienvenida abonados, bienvenida no abonados, fuera de horario— con vista previa del mensaje tal como sale (con la firma `*Nombre:*`) y botón de guardar por conexión. |
| `frontend/src/components/WhatsAppModal/index.js` | Se quitan la sección de mensajes y sus campos: la conexión se edita sólo como canal. Revisar el esquema de validación y el estado inicial para que el guardado de la conexión siga funcionando sin esos campos. |
| `frontend/src/translate/languages/{es,en,pt}.js` | Textos de las pestañas, la tarjeta de horario, los campos nuevos y la advertencia de sectores. |
| `frontend/src/pages/Documentation/index.js` | Se documenta la sección nueva dentro de la ficha del módulo Clientes. |

## Fuera de alcance

- Horario distinto por conexión: el horario de atención es global.
- Feriados o excepciones puntuales de fecha.
- Aviso de fuera de horario con variantes por abonado.
- Saludo propio para contactos externos (hoy no reciben nada).
- Mensajes automáticos para conexiones que no son WhatsApp (`telegram`), que conservan su
  flujo actual.

## Riesgos y notas

- **Cambio de reglas sobre quién recibe el saludo:** al terminar esta fase, el saludo
  "general" (`greetingMessage`) pasa a ser el de los **abonados**, y los contactos sin
  ficha reciben el de no abonados. Con el mensaje de no abonados vacío el comportamiento es
  idéntico al de hoy, así que la carga del texto nuevo debería hacerse después del deploy y
  con una prueba real.
- **Horario async:** `estaEnHorarioComercial` deja de ser síncrona; su único consumidor es
  `SendAutoReplyMessage`, y hay que confirmarlo con una búsqueda antes de tocar la firma.
- **Zona horaria:** sigue fija en Argentina. Si algún día hay clientes en otra zona, la
  decisión es por conexión, no global.
- **El modal de la conexión pierde campos:** conviene revisar que crear y editar una conexión
  con más de un sector siga funcionando sin el saludo, porque hoy eso estaba bloqueado a
  propósito.

## Verificación

Backend:

1. `npx tsc --noEmit` en `backend/` sin errores.
2. Con el ajuste `businessHours` ausente: el horario se comporta como hoy (default).
3. Con el ajuste en `{"days":["Mon","Tue","Wed","Thu","Fri"],"open":"08:00","close":"12:00"}`:
   un mensaje a las 13:00 de Argentina recibe el aviso de fuera de horario, y uno a las
   09:00 recibe el saludo.
4. Cerrar el día sábado en el panel: el aviso de fuera de horario se envía un sábado.

Funcional (en el panel, con sesión):

5. Cargar el mensaje de no abonados y escribir desde un contacto sin ficha: recibe ese
   mensaje, firmado con el nombre de la conexión.
6. Escribir desde un contacto de una ficha abonada: recibe el saludo de abonados.
7. Escribir desde un contacto externo: no llega ningún automático y el ticket queda para
   atender a mano.
8. Dejar los tres mensajes de una conexión vacíos: vuelve el menú de sectores.
9. Una conexión con más de un sector y sin saludo: se guarda igual y la advertencia aparece
   en la pantalla.
10. Guardar el horario en el panel y ver que el texto de ayuda y los logs muestran el
    horario configurado.
