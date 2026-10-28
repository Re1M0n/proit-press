# Cierre inmediato de tickets desde la lista

- **Fecha:** 2026-10-21
- **Proyecto:** `proit-press` / Press-Ticket
- **Estado:** diseño aprobado por el usuario
- **Alcance:** sincronización inmediata de la lista de tickets después de cerrarlos

## Contexto

Al cerrar un ticket desde `TicketListItem`, el frontend envía `PUT /tickets/:id`
y después navega a `/tickets`. La fila no se elimina directamente del estado de
`TicketsList`; depende del evento Socket.IO del backend. Si el evento no llega a
esa instancia de la lista, el ticket cerrado sigue visible hasta cambiar de
pestaña o recargar.

El backend ya persiste el estado `closed`, emite la salida del room del estado
anterior, avisa al room `closed` y actualiza los contadores. No se requiere
cambiar el contrato del backend.

## Objetivos

1. Quitar la fila del listado actual inmediatamente después de que el cierre
   responda exitosamente.
2. Mantener al usuario en la pestaña actual, sin navegación ni recarga.
3. Mantener el estado de base de datos, los contadores y los eventos para otras
   pestañas/usuarios.
4. Si el API falla, conservar la fila y mostrar el error habitual.

## Decisión

`TicketsList` pasa a `TicketListItem` un callback opcional `onTicketClosed(id)`.
Después de que `api.put` completa con éxito, `TicketListItem` lo invoca; el padre
despacha `DELETE_TICKET` al reducer local. El efecto existente sobre
`ticketsList.length` actualiza el contador de la pestaña sin lógica duplicada.

Cuando `TicketListItem` se usa fuera de `TicketsList` (por ejemplo, en
`NotificationsPopOver`) no recibe callback y conserva la navegación actual a
`/tickets`.

El Socket.IO existente se mantiene como sincronización para otros clientes. Si
su evento `delete` llega después de la eliminación optimista local, el reducer
no-op porque la fila ya no existe.

## Fuera de alcance

- Cambiar el estado `closed` o el endpoint de cierre.
- Cambiar automáticamente a la pestaña **Cerrados**.
- Cambiar el botón de cierre de tickets cerrados, que permite reabrirlos.
- Modificar el cierre masivo del menú de TicketsManager.

## Verificación

1. Cerrar un ticket abierto desde la lista: la fila desaparece en esa respuesta,
   sin cambiar de pestaña; el contador de abiertos baja.
2. Abrir **Cerrados**: el ticket aparece con estado cerrado.
3. Cerrar un ticket pendiente: desaparece de pendientes y no cambia de pestaña.
4. Simular/revisar un error del `PUT`: la fila permanece y se muestra el toast.
5. Cerrar desde NotificationsPopOver: conserva el comportamiento actual.
