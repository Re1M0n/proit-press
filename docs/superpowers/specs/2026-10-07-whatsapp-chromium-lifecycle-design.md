# Ciclo de vida idempotente de sesiones WhatsApp y Chromium

- **Fecha:** 2026-10-07
- **Proyecto:** `proit-press` / Press-Ticket
- **Estado:** diseño aprobado por el usuario, incluida la gestión de QR pendiente
- **Alcance:** sesiones `whatsapp-web.js` gestionadas por el backend

## Contexto

En Prometheus se observaron dos procesos raíz de Chromium, cada uno con sus
subprocesos, hijos de `itn-backend`. Sus perfiles LocalAuth son distintos
(`session-itn_press_4` y `session-itn_press_9`), por lo que corresponden a las dos
sesiones WhatsApp que el usuario confirmó como necesarias; no son duplicados que
deban detenerse. El consumo de varios procesos por sesión es el modelo normal de
Chromium y no se intenta reducirlo desconectando esos canales.

El backend ya inicia las sesiones persistidas de forma secuencial y tiene cierre
graceful que destruye los clientes. El riesgo a corregir está en el ciclo de vida:
hay varios puntos de entrada que pueden iniciar una sesión, `initWbot` crea un
cliente sin una exclusión mutua por ID, y el monitor programa reconexión desde el
evento `disconnected` sin registrar un único temporizador por sesión. Además,
`removeWbot` inicia destrucciones asíncronas sin que sus llamadores esperen a que
terminen, `restartWbot` no espera el cierre anterior y existe una limpieza con
`pkill -f` basada en el perfil. También, `initWbot` no resuelve cuando WhatsApp
emite `qr`: la instancia queda esperando hasta `READY`, incluso si el usuario
debe escanear el código, lo que puede dejar operaciones de inicio/stop esperando.

## Problema

Una carrera entre arranque, reconexión, reinicio manual o solicitud de API puede
crear más de un cliente `whatsapp-web.js` para el mismo ID. Cada cliente puede
lanzar su propio Chromium con el mismo perfil LocalAuth. Esto puede elevar el uso
de memoria, competir por el perfil de sesión y provocar desconexiones. Una
limpieza amplia por nombre de proceso también puede cerrar una instancia válida
si coincide con un arranque concurrente.

## Objetivos

1. Mantener las sesiones WhatsApp 4 y 9, así como la reconexión automática.
2. Garantizar como máximo un inicio en curso y un cliente operativo por ID de
   WhatsApp dentro del proceso del backend.
3. Deduplicar reconexiones y esperar el cierre del cliente anterior antes de
   reemplazarlo o eliminar su sesión.
4. No terminar un Chromium activo que pertenezca a una sesión válida.
5. Hacer observable el ciclo de vida con logs por ID y estado, sin registrar QR,
   tokens ni contenido de mensajes.
6. Tratar una sesión que espera el escaneo de QR como una instancia administrada:
   el inicio debe completar ese estado y stop/restart deben poder cerrarla.

## Fuera de alcance

- Reducir las dos instancias Chromium necesarias para las sesiones confirmadas.
- Migrar de `whatsapp-web.js` a Meta Cloud API u otro proveedor.
- Cambiar base de datos, esquema, autenticación, contratos HTTP o comportamiento
  funcional de los mensajes.
- Cambiar la política actual de reintentos salvo deduplicar los temporizadores.
- Detener, desconectar o modificar las sesiones de producción durante la
  implementación o las pruebas.

## Decisión

Implementar un coordinador de ciclo de vida en memoria, indexado por
`whatsappId`. Todos los caminos de inicio deberán pasar por él: arranque general,
creación/reconexión desde controladores, reinicio y reconexión automática.

El coordinador reutiliza una sesión administrada (lista o esperando QR) o la
promesa de arranque existente para el mismo ID. Solo crea un `Client` nuevo si no
existe una sesión administrada ni un arranque en curso. IDs distintos siguen
siendo independientes, así que las dos sesiones necesarias pueden operar en
paralelo una vez iniciado cada cliente.

El ciclo de inicio de `initWbot` se considera establecido cuando recibe `qr` o
`ready`, no solo cuando recibe `ready`. Una sesión en estado QR queda registrada
como cliente administrado y se reutiliza en solicitudes de inicio repetidas. Al
escanear el QR y recibir `ready`, pasa al estado conectado sin crear otro cliente.
La API de inicio puede devolver al llegar a QR; el servicio de reinicio que usan
las operaciones dependientes de una conexión activa conserva su contrato de
esperar hasta `READY` mediante un waiter cancelable del coordinador.

Se mantendrá como máximo un temporizador de reconexión por ID. Un evento de
desconexión repetido no programa temporizadores adicionales. `ready`,
desconexión manual, eliminación de la sesión y apagado del backend cancelan el
temporizador correspondiente.

La destrucción será asíncrona y esperada. El reemplazo seguirá este orden:

1. impedir nuevos arranques para ese ID mientras se reemplaza;
2. cancelar el temporizador de reconexión;
3. destruir y esperar al cliente anterior;
4. retirar sus referencias del registro;
5. iniciar el reemplazo a través del coordinador;
6. liberar el bloqueo al finalizar, también ante error.

La eliminación de una conexión cancelará y cerrará su cliente antes de borrar el
registro persistido, para que un temporizador retrasado no intente recrearlo.

## Recuperación de Chromium huérfano

Se retirará el `pkill -f` indiscriminado. Para cubrir un cierre no graceful, el
arranque podrá inspeccionar únicamente el proceso raíz de Chromium asociado al
`--user-data-dir` exacto de esa sesión, ejecutado por el usuario de servicio
esperado. Se considerará huérfano solo si su árbol de padres ya no conduce a un
proceso vivo de `server.js` de Press-Ticket ni coincide con un cliente registrado
por el coordinador. Antes de enviar una señal se guardará la identidad del proceso
(PID y hora de inicio); se enviará `SIGTERM` y se esperará el cierre. Si se requiere
escalamiento, se volverá a comprobar PID, hora de inicio y perfil para evitar
actuar sobre un PID reutilizado. Si la propiedad del proceso es ambigua, no se lo
terminará: el arranque fallará de forma controlada y registrará el ID para
diagnóstico.

El cierre graceful existente se conserva y sigue siendo la ruta normal para
`SIGTERM`/`SIGINT`; la recuperación de huérfanos es una salvaguarda para fallos
abruptos, no el mecanismo habitual de apagado.

## Componentes afectados

- `backend/src/libs/wbot.ts`: fábrica/registro de clientes, inicio, reinicio,
  eliminación y destrucción total.
- `backend/src/services/WbotServices/StartWhatsAppSession.ts`: punto común de
  inicio idempotente.
- `backend/src/services/WbotServices/wbotMonitor.ts`: programación y cancelación
  de reconexiones sin duplicados.
- `backend/src/services/WbotServices/StartAllWhatsAppsSessions.ts`: arranque
  secuencial existente, pasando por el coordinador.
- `backend/src/controllers/WhatsAppController.ts` y
  `backend/src/controllers/WhatsAppSessionController.ts`: quitar los caminos que
  crean o destruyen clientes saltándose el coordinador y esperar la limpieza.
- `backend/src/server.ts`: conservar y verificar el cierre graceful actual.

## Manejo de errores y concurrencia

- Si el arranque falla, cerrar el cliente parcial, retirar la promesa y permitir
  un intento posterior.
- Un evento `qr` resuelve el inicio con el cliente administrado aunque todavía no
  esté conectado; `ready` actualiza su estado, no vuelve a resolver con otro
  cliente.
- Stop/restart mientras espera QR cancelan el estado pendiente, esperan el cierre
  del browser y liberan la operación para que un futuro inicio sea posible.
- El `finally` de una operación solo elimina la entrada del mapa si todavía
  apunta a esa misma operación; así una finalización vieja no borra un arranque
  nuevo.
- La destrucción es idempotente: llamadas repetidas esperan el mismo cierre y no
  crean nuevos clientes.
- Una eliminación manual cancela reconexiones pendientes y no vuelve a iniciar
  la sesión.
- La reconexión automática existente permanece activa para desconexiones no
  manuales.
- Las pruebas no conectarán a WhatsApp ni usarán cuentas reales; el cliente
  Chromium se sustituirá por un doble controlable.

## Criterios de aceptación

1. Varias solicitudes simultáneas de inicio para el mismo ID ejecutan una sola
   inicialización de `Client` y reciben la misma sesión.
2. Un inicio simultáneo para dos IDs distintos crea exactamente un cliente por
   ID, conservando perfiles LocalAuth independientes.
3. Solicitar el inicio de una sesión ya lista no crea otro Chromium.
4. Al recibir `qr`, la promesa de inicio termina y las solicitudes siguientes
   reutilizan el mismo cliente mientras espera el escaneo.
5. Stop y restart mientras espera QR terminan sin quedar bloqueados, destruyen el
   cliente pendiente y no dejan un inicio huérfano en el coordinador.
6. Escanear el QR y recibir `ready` conserva el mismo cliente y marca la sesión
   operativa.
7. `RestartWhatsAppSession` no devuelve una sesión QR como operativa; espera a
   `READY` y se cancela si la sesión se detiene o desconecta.
8. Varios eventos `disconnected` del mismo ID producen un solo temporizador y un
   solo nuevo intento.
9. El evento `ready` cancela cualquier reconexión pendiente.
10. Desconectar o eliminar una sesión cancela su temporizador y espera la
   destrucción del navegador antes de completar la operación.
11. Un fallo de inicialización o timeout destruye el cliente parcial y permite
   reintentar sin dejar referencias ni procesos gestionados vivos.
12. La recuperación de un proceso huérfano requiere coincidencia exacta del
   perfil y evidencia de que su backend propietario ya no está vivo; ante duda,
   no termina el proceso.
13. El cierre graceful destruye sesiones listas y pendientes.
14. Las pruebas comprueban que sesiones 4 y 9 pueden permanecer activas a la vez
    y que ninguna obtiene un cliente duplicado.

## Riesgos y supuestos

- El coordinador en memoria protege la ejecución actual en modo PM2 `fork`; si el
  backend se despliega en cluster o con varias réplicas, se necesitará un lock
  distribuido o una única instancia propietaria de WhatsApp.
- La recuperación de procesos huérfanos depende de capacidades Linux de
  inspección de `/proc`; se ejecuta solo en Linux cuando se lanza un navegador
  local. En sistemas no Linux o con `CHROME_WS`, se omite esa recuperación sin
  terminar procesos; el coordinador sigue protegiendo duplicados dentro del
  proceso. El inspector queda aislado detrás de una interfaz testeable.
- Chromium seguirá consumiendo memoria por cada sesión activa. Este diseño evita
  instancias duplicadas; no promete bajar el consumo base de dos sesiones.
- La biblioteca `whatsapp-web.js` y su versión instalada determinan qué eventos
  y garantías de `destroy()` están disponibles; se verificarán en la
  implementación contra la dependencia fijada por el proyecto.

## Verificación prevista

- Tests unitarios Jest con `Client` y reloj/timers simulados.
- Build TypeScript del backend y suite de tests relevante.
- Revisión estática de todos los puntos de inicio, desconexión, reinicio,
  eliminación y apagado.
- En producción, después de un deploy autorizado: comprobar una sola instancia
  Chromium por cada perfil 4 y 9, reconexión normal y ausencia de nuevos perfiles
  duplicados; nunca matar procesos manualmente como prueba.
