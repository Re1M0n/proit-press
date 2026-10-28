# Cierre inmediato de tickets desde la lista — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar `superpowers:executing-plans` para implementar esta tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** Al cerrar un ticket desde la lista, quitarlo de la pestaña actual tras el éxito del API, sin navegar ni recargar.

**Architecture:** `TicketsList` es dueño del reducer de filas y entrega a cada `TicketListItem` un callback opcional. El item invoca el callback únicamente después de que `PUT /tickets/:id` termina con éxito. El evento Socket.IO y el conteo backend siguen funcionando para otros clientes.

**Tech Stack:** React 18, React Router 6, MUI 5 y CRA.

**Spec:** `docs/superpowers/specs/2026-10-21-cierre-ticket-lista-design.md`

## Restricciones globales

- La UI permanece en español.
- No agregar dependencias.
- Mantener el estado del ticket `closed` gestionado por el backend.
- No cambiar el comportamiento del `TicketListItem` usado en NotificationsPopOver cuando no se le entrega callback.
- En error del `PUT`, conservar la fila y usar el toast existente.

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `frontend/src/components/TicketsList/index.js` | lista/reducer y ownership de la fila |
| `frontend/src/components/TicketListItem/index.js` | acción de cierre y callback opcional |

---

### Task 1: Conectar el cierre exitoso con el reducer de la lista

**Files:**
- Modify: `frontend/src/components/TicketListItem/index.js:270,480-499`
- Modify: `frontend/src/components/TicketsList/index.js:503-507`

**Interfaces:**
- `TicketListItem` consume `onTicketClosed?: (ticketId: number) => void`.
- `TicketsList` implementa el callback con `dispatch({ type: "DELETE_TICKET", payload: ticketId })`.
- No cambia el contrato REST ni el evento Socket.IO existente.

- [ ] **Step 1: Pasar callback desde la lista**

En el `.map` que renderiza `TicketListItem`:

```jsx
{ticketsList.map(ticket => (
  <TicketListItem
    key={ticket.id}
    ticket={ticket}
    filteredTags={filteredTags}
    onTicketClosed={ticketId =>
      dispatch({ type: "DELETE_TICKET", payload: ticketId })
    }
  />
))}
```

- [ ] **Step 2: Quitar la fila solo después del cierre exitoso**

Cambiar la firma del componente:

```js
const TicketListItem = ({ ticket, filteredTags, onTicketClosed }) => {
```

En `handleClosedTicket`, después del `await api.put(...)` y antes de terminar:

```js
if (onTicketClosed) {
  onTicketClosed(id);
} else {
  navigate("/tickets");
}
```

El callback queda dentro del `try`. El `catch` conserva la fila y muestra el
toast actual. NotificationsPopOver no entrega callback y conserva su navegación.

- [ ] **Step 3: Compilar y verificar manualmente**

Run: `npm run build` (en `frontend/`, `CI=false`).

Expected: `Compiled successfully`.

Checklist:
1. Cerrar un ticket abierto: desaparece en esa respuesta, sin cambiar de
   pestaña; el contador de abiertos baja.
2. Abrir **Cerrados** y confirmar que aparece el ticket.
3. Repetir el cierre desde **Pendientes**.
4. Confirmar que un fallo del `PUT` deja la fila visible y muestra el toast.
5. Confirmar que cerrar desde NotificationsPopOver conserva la navegación actual.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TicketListItem/index.js frontend/src/components/TicketsList/index.js
```
