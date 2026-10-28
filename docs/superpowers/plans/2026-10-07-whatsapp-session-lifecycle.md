# Ciclo de vida de sesiones WhatsApp — Implementation Plan

> **Para quien implemente:** ejecutar inline, una tarea por vez, revisando cada punto de control. No delegar ni hacer commits sin pedido explícito del usuario.

**Goal:** Garantizar como máximo un cliente Chromium por ID de WhatsApp, manteniendo las sesiones 4 y 9 y su reconexión automática.

**Architecture:** Añadir un coordinador en memoria por `whatsappId` para compartir inicios concurrentes, serializar stop/restart y deduplicar temporizadores. Todas las rutas de inicio, reinicio, eliminación y reconexión usarán el coordinador. La recuperación tras una caída abrupta identificará procesos huérfanos por perfil exacto y propiedad verificable; si no puede demostrar que son huérfanos, no los terminará.

**Tech Stack:** Node.js, TypeScript, Jest 26, `whatsapp-web.js` 1.34.7, Puppeteer/Chromium, PM2 en modo `fork`.

**Spec:** [`../specs/2026-10-07-whatsapp-chromium-lifecycle-design.md`](../specs/2026-10-07-whatsapp-chromium-lifecycle-design.md)

## Restricciones globales

- Mantener las sesiones WhatsApp 4 y 9, así como la reconexión automática.
- Garantizar como máximo un inicio en curso y un cliente operativo por ID de WhatsApp dentro del proceso del backend.
- No cambiar base de datos, esquema, autenticación, contratos HTTP o comportamiento funcional de los mensajes.
- Las pruebas no conectarán a WhatsApp ni usarán cuentas reales; el cliente Chromium se sustituirá por un doble controlable.
- No detener, desconectar ni modificar las sesiones de producción durante la implementación o las pruebas.
- No leer, registrar ni copiar credenciales, QR, tokens o contenido de mensajes.
- No ejecutar `npm test` sin confirmar antes el aislamiento de su base de datos: sus hooks `pretest` y `posttest` corren migraciones y seeds.
- El workspace tiene cambios locales no relacionados (`AGENTS.md` y `docs/NOTIFICACIONES_PUSH.md` sin trackear); preservarlos y no incluirlos en un stage.
- No hacer commit, push ni deploy hasta recibir una instrucción explícita.

---

## Mapa de archivos

| Archivo | Responsabilidad del cambio |
|---|---|
| `backend/src/services/WbotServices/WbotSessionCoordinator.ts` | Registro por ID, single-flight start, operaciones stop/restart serializadas y timers de reconexión. No depende directamente de Puppeteer. |
| `backend/src/services/WbotServices/StartWhatsAppSession.ts` | Adaptar el inicio existente al coordinador, conservar `OPENING`, eventos/socket y listeners. |
| `backend/src/services/WbotServices/wbotMonitor.ts` | Notificar desconexiones al coordinador mediante callback; no crear timers ni iniciar sesiones por su cuenta. |
| `backend/src/libs/wbot.ts` | Fábrica y registro de clientes; cierres asíncronos esperables; retirar el reinicio que evade el coordinador. |
| `backend/src/libs/ChromeOrphanRecovery.ts` | Inspeccionar y terminar únicamente un Chromium huérfano con perfil exacto y propietario comprobado. |
| `backend/src/services/WbotServices/StartAllWhatsAppsSessions.ts` | Usar el coordinador al iniciar y limpiar un intento fallido antes del retry. Mantener orden secuencial y backoff actuales. |
| `backend/src/controllers/WhatsAppController.ts` | Quitar el inicio directo con `initWbot`; esperar stop antes de eliminar el registro. |
| `backend/src/controllers/WhatsAppSessionController.ts` | Enviar start/reconnect/remove al coordinador y esperar el stop. |
| `backend/src/services/WhatsappService/RestartWhatsAppService.ts` | Usar el restart coordinado. |
| `backend/src/services/MessageServices/MarkMessagesAsReadService.ts` | Usar el restart coordinado cuando la sesión no esté lista. |
| `backend/src/server.ts` | Cancelar timers de reconexión y destruir sesiones en el shutdown graceful existente. |
| `backend/src/__tests__/unit/WbotSessionCoordinator.spec.ts` | Pruebas deterministas de single-flight, stop/restart y reconexiones. |
| `backend/src/__tests__/unit/ChromeOrphanRecovery.spec.ts` | Pruebas de coincidencia de perfil, propietario y señales al proceso. |
| `backend/src/__tests__/unit/WbotInitLifecycle.spec.ts` | Prueba con `Client` simulado: QR completa init, y stop antes de QR destruye/desbloquea el inicio. |

## Plan de tareas

### Task 1: Fijar el contrato del coordinador con tests unitarios

**Archivos:**
- Crear: `backend/src/__tests__/unit/WbotSessionCoordinator.spec.ts`
- Crear: `backend/src/services/WbotServices/WbotSessionCoordinator.ts`

**Interfaz pública del coordinador:**

```ts
export interface WbotSessionCoordinatorHooks<TSession> {
  getReady: (whatsappId: number) => TSession | undefined;
  stopClient: (whatsappId: number) => Promise<void>;
}

export class WbotSessionCoordinator<TSession> {
  constructor(hooks: WbotSessionCoordinatorHooks<TSession>);
  start(whatsappId: number, create: () => Promise<TSession>): Promise<TSession>;
  restart(whatsappId: number, create: () => Promise<TSession>): Promise<TSession>;
  waitForReady(whatsappId: number): Promise<TSession>;
  stop(whatsappId: number): Promise<void>;
  scheduleReconnect(whatsappId: number, reconnect: () => void): void;
  cancelReconnect(whatsappId: number): void;
  markConnected(whatsappId: number): void;
  cancelAllReconnects(): void;
}
```

- [ ] Escribir tests donde dos llamadas simultáneas a `start(4, create)` compartan una sola llamada a `create` y resuelvan con el mismo objeto de sesión.
- [ ] Escribir un test donde llamadas para `start(4, create4)` y `start(9, create9)` creen una sesión independiente para cada ID.
- [ ] Escribir un test donde `hooks.getReady(4)` devuelva una sesión y `start(4, create)` no llame a `create`.
- [ ] Escribir un test donde un cliente creado en estado QR quede administrado y una segunda llamada a `start(4, anotherCreate)` devuelva ese mismo cliente sin crear otro.
- [ ] Escribir un test donde `scheduleReconnect(4, ...)` invalide el cliente anterior y el callback inicie un único restart, incluso si llega un start manual antes de que venza el timer.
- [ ] Ejecutar el archivo antes de implementar y confirmar que falla por comportamiento ausente, no por Jest/configuración.

```powershell
cd proit-press/backend
npx jest src/__tests__/unit/WbotSessionCoordinator.spec.ts --runInBand --coverage=false
```

Expected: FAIL en las expectativas de single-flight/readiness; ningún hook de base de datos se ejecuta porque se invoca Jest directamente, no `npm test`.

- [ ] Implementar los mapas por ID para sesión en curso y operación de stop/restart. La entrada se elimina en `finally` solo si todavía apunta a la misma promesa.
- [ ] Añadir el caso de operación pendiente: un start solicitado mientras termina un stop espera ese stop y solo después crea un cliente.
- [ ] Repetir el comando Jest del paso anterior.

Expected: PASS; IDs iguales comparten un inicio y distintos no se bloquean entre sí.

### Task 2: Unificar las entradas de inicio de sesión

**Archivos:**
- Modificar: `backend/src/services/WbotServices/StartWhatsAppSession.ts`
- Modificar: `backend/src/controllers/WhatsAppController.ts`
- Modificar: `backend/src/controllers/WhatsAppSessionController.ts`
- Modificar: `backend/src/services/WbotServices/StartAllWhatsAppsSessions.ts`
- Test: `backend/src/__tests__/unit/WbotSessionCoordinator.spec.ts`

**Tipos/APIs que expone el flujo de sesión:**

```ts
export const StartWhatsAppSession = (whatsapp: Whatsapp): Promise<void>;
export const RestartWhatsAppSession = (whatsappId: number): Promise<Session>;
export const StopWhatsAppSession = (whatsappId: number): Promise<void>;
export const StopAllWhatsAppSessions = (): Promise<void>;
```

Exportar además el tipo `Session` de `libs/wbot.ts` para compartir el resultado
tipado entre el coordinador y los servicios que reinician sesiones.
`RestartWhatsAppSession` primero espera el resultado de `coordinator.restart`
(que puede quedar en QR) y después espera `coordinator.waitForReady`; así los
consumidores que usan `wbot.info` siguen recibiendo una sesión conectada.

- [ ] Adaptar la inicialización actual a un closure `create(): Promise<Session>` pasado a `coordinator.start(whatsapp.id, create)`; conservar updates de estado, socket events, listeners y `GroupEventsService` exactamente una vez por cliente.
- [ ] Cambiar `initWbot` para resolver su promesa una sola vez al recibir `qr` o `ready`; el coordinador retiene como administrado el cliente QR hasta stop, restart, desconexión o ready.
- [ ] Instanciar el coordinador una sola vez con `getReady` conectado a `isSessionReady/getWbot` y `stopClient` conectado a `removeWbot`; cada llamada `StartWhatsAppSession(whatsapp)` pasará un closure que inicializa y conecta listeners para ese `whatsapp`.
- [ ] Hacer que `WhatsAppController.start`, `WhatsAppController.create`, `WhatsAppSessionController.store/update` y el startup masivo llamen a `StartWhatsAppSession`; eliminar el camino del controller que llama a `initWbot` directamente.
- [ ] Hacer que `RestartWhatsAppService` y `MarkMessagesAsReadService` llamen a `RestartWhatsAppSession` en vez de `restartWbot` de `libs/wbot.ts`.
- [ ] Añadir un test que invoque el start desde dos callers distintos para el mismo ID y verifique que se ejecuta una inicialización y se instalan listeners una sola vez.
- [ ] Ejecutar el test coordinador.

Expected: PASS; el arranque API, el arranque automático y el restart convergen en el mismo coordinador.

### Task 3: Deduplicar reconexión y cancelar timers al cerrar

**Archivos:**
- Modificar: `backend/src/services/WbotServices/WbotSessionCoordinator.ts`
- Modificar: `backend/src/services/WbotServices/wbotMonitor.ts`
- Modificar: `backend/src/services/WbotServices/StartWhatsAppSession.ts`
- Test: `backend/src/__tests__/unit/WbotSessionCoordinator.spec.ts`

- [ ] Añadir un único timer por `whatsappId`; una segunda llamada a `scheduleReconnect(4)` deja vigente el timer existente.
- [ ] Cambiar `wbotMonitor` para recibir un callback de desconexión y eliminar su import directo de `StartWhatsAppSession`; esto evita que el monitor pueda iniciar sesiones fuera del coordinador.
- [ ] Al evento `ready`, cancelar el timer del ID antes de marcar la sesión operativa.
- [ ] Al recibir `ready` o `change_state` CONNECTED, usar `markConnected(whatsappId)` para restaurar el cliente activo y cancelar reconexión pendiente.
- [ ] En stop, delete y shutdown, cancelar el timer antes de destruir el cliente.
- [ ] Usar timers falsos de Jest para probar que dos eventos `disconnected` del ID 4 generan un solo restart; verificar que el ID 9 conserva su propio timer.
- [ ] Probar que un stop manual cancela el timer y no causa reinicio tras avanzar el reloj falso.
- [ ] Ejecutar el test coordinador.

Expected: PASS; reconexión automática preservada, un timer máximo por sesión y cero reinicios después de stop/delete.

### Task 4: Hacer stop/restart y destrucción esperables

**Archivos:**
- Modificar: `backend/src/libs/wbot.ts`
- Modificar: `backend/src/services/WbotSessionCoordinator.ts`
- Modificar: `backend/src/controllers/WhatsAppController.ts`
- Modificar: `backend/src/controllers/WhatsAppSessionController.ts`
- Modificar: `backend/src/services/WbotServices/StartAllWhatsAppsSessions.ts`
- Modificar: `backend/src/server.ts`
- Test: `backend/src/__tests__/unit/WbotSessionCoordinator.spec.ts`

- [ ] Cambiar `removeWbot(whatsappId)` para retornar `Promise<void>` y esperar `Client.destroy()` tanto para sesiones ready como pendientes.
- [ ] Mover la operación de reinicio al coordinador; destruir el cliente previo antes de llamar a `initWbot` para el reemplazo. Eliminar `restartWbot` de `libs/wbot.ts` luego de migrar sus callers.
- [ ] En eliminación, cambiar el orden a `await StopWhatsAppSession(id)` antes de borrar el registro con `DeleteWhatsAppService`; mantener después el log y evento socket existentes.
- [ ] En retry por timeout de `StartAllWhatsAppsSessions`, esperar `StopWhatsAppSession(id)` antes del backoff y del intento siguiente.
- [ ] En el shutdown graceful, llamar a `StopAllWhatsAppSessions()` para cancelar timers y destruir sesiones; conservar la detención de Telegram.
- [ ] Probar que restart espera el `destroy` diferido antes de invocar el closure `create`, y que dos requests simultáneos de restart producen una sola secuencia stop/start.
- [ ] Ejecutar el test coordinador.

Expected: PASS; no hay reemplazos solapados, referencias viejas ni reconexiones pendientes tras eliminar o apagar.

### Task 5: Reemplazar `pkill -f` por recuperación verificable de huérfanos

**Archivos:**
- Crear: `backend/src/libs/ChromeOrphanRecovery.ts`
- Modificar: `backend/src/libs/wbot.ts`
- Crear: `backend/src/__tests__/unit/ChromeOrphanRecovery.spec.ts`

**Contrato del helper:**

```ts
export interface ChromiumProcessInfo {
  pid: number;
  parentPid: number;
  uid: number;
  startTime: string;
  command: string;
  userDataDir: string | undefined;
}

export interface ChromiumProcessInspector {
  listByUserDataDir: (path: string) => Promise<ChromiumProcessInfo[]>;
  inspect: (pid: number) => Promise<ChromiumProcessInfo | undefined>;
  hasLivePressTicketOwner: (pid: number) => Promise<boolean>;
  signal: (pid: number, signal: "SIGTERM" | "SIGKILL") => void;
  waitForExit: (pid: number, timeoutMs: number) => Promise<boolean>;
}

export const cleanupOrphanChromium = async (
  expectedUserDataDir: string,
  expectedUid: number,
  inspector: ChromiumProcessInspector
): Promise<"clean" | "terminated" | "ambiguous">;
```

- [ ] Inyectar el inspector de procesos y el emisor de señales para que el test no lea `/proc` ni mate procesos reales.
- [ ] Escribir tests: perfil distinto → no señal; proceso cuyo árbol lleva a `server.js` vivo → no señal; perfil exacto, UID de servicio y owner muerto → `SIGTERM`; PID/start time/profile cambian antes del escalamiento → no `SIGKILL`; fallo de lectura → error y ninguna señal.
- [ ] Ejecutar `npx jest src/__tests__/unit/ChromeOrphanRecovery.spec.ts --runInBand --coverage=false` y confirmar FAIL antes de implementar.
- [ ] Implementar inspección Linux de `/proc`, igualdad exacta de `--user-data-dir`, UID esperado y validación de PID/start time antes de cada señal.
- [ ] Ante propiedad ambigua en Linux, devolver `ambiguous`, no terminar procesos y dejar que el inicio falle con log de ID solamente. En plataformas que no exponen `/proc`, omitir solo la recuperación de huérfanos y permitir el inicio normal; el coordinador sigue evitando duplicados dentro del proceso.
- [ ] Reemplazar `execFileSync("pkill", ...)` por el helper; el coordinador debe garantizar que no hay otro cliente activo de ese ID antes de invocarlo.
- [ ] Repetir el test del helper y el del coordinador.

Expected: PASS; ningún proceso se termina sin perfil exacto y evidencia de que el backend propietario ya no vive.

### Task 6: Verificación final local

**Archivos:**
- Verificar: todos los archivos de las tareas 1–5.
- No modificar: archivos ajenos ni recursos de producción.

- [ ] Ejecutar ambos tests aislados sin hooks de base de datos:

```powershell
cd proit-press/backend
npx jest src/__tests__/unit/WbotSessionCoordinator.spec.ts src/__tests__/unit/ChromeOrphanRecovery.spec.ts src/__tests__/unit/WbotInitLifecycle.spec.ts --runInBand --coverage=false
```

Expected: PASS.

- [ ] Ejecutar el build TypeScript:

```powershell
npm run build
```

Expected: PASS; no hay errores de tipos ni imports circulares nuevos.

- [ ] Buscar usos restantes que evadan el coordinador:

```powershell
rg -n "initWbot\(|restartWbot\(|setTimeout\(\(\) => StartWhatsAppSession" backend/src
```

Expected: `initWbot` solo se invoca desde el coordinador/fábrica prevista; no queda `restartWbot` antiguo ni retry directo desde `wbotMonitor`.

- [ ] Revisar `git diff` y `git status --short`; preservar `AGENTS.md` y `docs/NOTIFICACIONES_PUSH.md` sin stagearlos.
- [ ] Entregar reporte de tests/build y dejar el deploy para una instrucción explícita posterior.

## Criterio de cierre

El cambio queda listo para revisión cuando el coordinador impide un segundo start
por ID, los timers y destrucciones están cubiertos por tests, el helper de
huérfanos falla seguro ante ambigüedad, Jest focalizado y build pasan, y no se
tocaron las sesiones ni servicios de producción.
