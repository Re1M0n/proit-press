# Retiro del cliente Android — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar `superpowers:executing-plans` para implementar esta tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** Eliminar el cliente APK/Capacitor y todo el código de ejecución que solo soporta Android, FCM y refresh tokens nativos, conservando el acceso web por cookie.

**Architecture:** Se retira el shell Android/adaptadores nativos del frontend, el sistema FCM del backend y los headers de refresh nativos. Una migración nueva elimina las registraciones push y la preferencia móvil. Las migraciones históricas permanecen en el repo.

**Tech Stack:** React 18 + CRA + npm; Express/TypeScript + Sequelize/MySQL; Jest + Supertest; GitHub Actions self-hosted runner de Prometheus.

**Spec:** `docs/superpowers/specs/2026-10-21-retiro-android-design.md`

## Restricciones globales

- No tocar `IA/`, `.env`, credenciales Firebase externas ni keystores.
- Mantener el refresh web con cookie `jrt` HttpOnly y `withCredentials: true`.
- Mantener la URL del backend en `localStorage` para el navegador y las notificaciones web de Recordatorios.
- Eliminar de la base `PushTokens` y `Users.mobileNotificationsEnabled`; el usuario autorizó la pérdida de esos datos.
- Conservar las migraciones históricas de creación: `20260930010000-create-push-tokens.ts` y `20260930020000-add-mobile-notifications-to-users.ts`.
- No publicar ni despublicar la app en Google Play.
- `npm test` del backend usa la DB local de test: no apuntarlo a producción.

## Estructura de archivos

| Área | Archivos principales |
| --- | --- |
| Android/Capacitor | `frontend/android/`, `frontend/capacitor.config.ts`, `frontend/build-android-apk.bat`, dependencias del frontend |
| Adaptador web/native | `frontend/src/utils/nativeApp.js`, `services/serverConfig.js`, `services/api.js`, `services/pushNotifications.js`, `src/index.js` |
| UI móvil | `frontend/src/components/MobileModeControl/index.js`, `frontend/src/layout/index.js`, traducciones es/pt |
| Sesión web | `backend/src/helpers/SendRefreshToken.ts`, `controllers/SessionController.ts`, `backend/src/app.ts` |
| Push backend | `PushNotificationController.ts`, `PushNotificationService/`, `PushToken.ts`, `User.ts`, `database/index.ts`, llamadores |
| Smoke test deploy | `scripts/smoke-test.sh`, `scripts/deploy.sh` |
| Smoke test | `scripts/smoke-test.sh` pasa a verificar CORS web y refresh por cookie; `scripts/deploy.sh` queda sin comentarios Android |
| Datos/versionado | nueva migración de retiro; README; pruebas de sesión y de los servicios WhatsApp |

---

### Task 1: Quitar las ramas nativas del frontend y preservar el navegador

**Files:**
- Modify: `frontend/src/services/serverConfig.js`, `serverConfig.test.js`, `services/api.js`, `hooks/useAuth.js`, `components/ServerSettingsModal/index.js`, `components/NotificationsPopOver/index.js`, `index.js`, `layout/index.js`
- Delete: `frontend/src/utils/nativeApp.js`, `frontend/src/services/pushNotifications.js`, `frontend/src/components/MobileModeControl/index.js`
- Modify: `frontend/src/translate/languages/es.js`, `pt.js`

**Interfaces:** Se mantienen `getBackendUrl`, `normalizeBackendUrl`, `saveBackendUrl`, `setApiBaseUrl`, login web y refresh por cookie. Desaparecen `loadSavedServerUrl`, `initializeNativeApp` y `isNativeApp`.

- [ ] **Step 1: Simplificar serverConfig al navegador**

Quitar imports de `@capacitor/core` y `@capacitor/preferences`, condiciones
`Capacitor.isNativePlatform()` y export `loadSavedServerUrl`. La lectura/escritura
de `SERVER_URL_KEY` se queda en `window.localStorage`; fallback:

```js
return process.env.REACT_APP_BACKEND_URL || "";
```

En `serverConfig.test.js`, quitar mocks de Capacitor/Preferences y probar que la
URL guardada en localStorage se recupera y normaliza.

- [ ] **Step 2: Renderizar la web sin bootstrap nativo**

En `frontend/src/index.js`, quitar import/llamada `initializeNativeApp` y
renderizar directamente:

```jsx
root.render(
  <CssBaseline>
    <ErrorBoundary componentName="App">
      <App />
    </ErrorBoundary>
  </CssBaseline>
);
setTimeout(finishLoading, 1000);
```

Quitar `MobileModeControl` de `layout/index.js`, borrar `nativeApp.js`,
`pushNotifications.js` y `MobileModeControl/index.js`, y borrar las claves
`mobileNotifications` de `es.js` y `pt.js`.

Stagear estas eliminaciones explícitamente:

```bash
git rm frontend/src/utils/nativeApp.js frontend/src/services/pushNotifications.js frontend/src/components/MobileModeControl/index.js
```

- [ ] **Step 3: Simplificar api.js, useAuth y ServerSettingsModal**

En `api.js`, quitar `import { Capacitor }`, el header `X-Client-App`, lectura/envío
de `X-Refresh-Token` y almacenamiento de `localStorage.refreshToken`. Mantener el
Authorization bearer, refresh por cookie, `withCredentials` y manejo de cola
concurrente. Eliminar `removeItem("refreshToken")` de `handleLogout`,
`useAuth.js` y `ServerSettingsModal/index.js`.

En `NotificationsPopOver/index.js`, quitar solo el comentario que atribuye la
guardia de `Notification` al WebView; mantener `typeof Notification !==
"undefined"` porque es una protección válida también para navegadores sin esa
API.

- [ ] **Step 4: Tests y build frontend**

Run: `CI=true npm test -- --watchAll=false` y `npm run build` (en `frontend/`).

Expected: tests pasan; build compilado.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/serverConfig.js frontend/src/services/serverConfig.test.js frontend/src/services/api.js frontend/src/hooks/useAuth.js frontend/src/components/ServerSettingsModal/index.js frontend/src/components/NotificationsPopOver/index.js frontend/src/index.js frontend/src/layout/index.js frontend/src/translate/languages/es.js frontend/src/translate/languages/pt.js
git commit -m "refactor(frontend): elimina soporte nativo Android"
```

---

### Task 2: Mantener autenticación web con cookie y eliminar refresh nativo

**Files:**
- Modify: `backend/src/helpers/SendRefreshToken.ts`, `controllers/SessionController.ts`, `app.ts`
- Replace: `backend/src/__tests__/unit/Session/RefreshTokenNativo.spec.ts`

- [ ] **Step 1: Quitar emisión de header nativo**

Dejar `SendRefreshToken(res, token)` como única firma. El helper mantiene la
cookie `jrt` con `httpOnly: true`, `sameSite: "strict"`, path
`/auth/refresh_token`, `maxAge: 8 * 60 * 60 * 1000` y `secure` en producción; no
llama `res.setHeader`.

- [ ] **Step 2: Leer refresh solamente de cookie**

En `SessionController.store` y `.update`, llamar `SendRefreshToken(res,
refreshToken)`. `.update` toma `req.cookies.jrt`; si falta, sigue lanzando
`ERR_SESSION_EXPIRED` con 401.

- [ ] **Step 3: Limpiar CORS nativo**

En `backend/src/app.ts`, quitar los esquemas `capacitor`/`ionic` de la regex de
orígenes; mantener `http(s)://localhost` para desarrollo y
`process.env.FRONTEND_URL`. Quitar `X-Refresh-Token` y `X-Client-App` de
`allowedHeaders`/`exposedHeaders`.

- [ ] **Step 4: Reemplazar las pruebas nativas por pruebas web**

Renombrar el archivo con `git mv`:

```bash
git mv backend/src/__tests__/unit/Session/RefreshTokenNativo.spec.ts backend/src/__tests__/unit/Session/RefreshToken.spec.ts
```

En `RefreshToken.spec.ts`, conservar y verificar:
1. `SendRefreshToken` crea la cookie web segura y nunca envía headers.
2. `SessionController.update` lee `jrt`, rota el refresh por cookie y devuelve
   `{ token, user }`.
3. Sin cookie responde `ERR_SESSION_EXPIRED` y no llama `RefreshTokenService`.
4. `SessionController.store` crea cookie y devuelve token/user sin header.
5. `ERR_USER_INACTIVE` se sigue propagando.

- [ ] **Step 5: Tests y tipos**

Run: `npx jest --runInBand --coverage=false
src/__tests__/unit/Session/RefreshToken.spec.ts` y `npx tsc --noEmit` (en
`backend/`).

- [ ] **Step 6: Commit**

```bash
git add backend/src/helpers/SendRefreshToken.ts backend/src/controllers/SessionController.ts backend/src/app.ts backend/src/__tests__/unit/Session/RefreshToken.spec.ts
git commit -m "refactor(auth): conserva refresh web y elimina header nativo"
```

---

### Task 3: Eliminar FCM backend y datos asociados

**Files:**
- Modify: `backend/src/database/index.ts`, `models/User.ts`, `routes/routeRegistry.ts`, callers de push
- Delete: `backend/src/controllers/PushNotificationController.ts`, `models/PushToken.ts`, `services/PushNotificationService/index.ts`
- Create: `backend/src/database/migrations/20261021020000-remove-android-push-support.ts`
- Modify: `backend/package.json`, `backend/package-lock.json`

- [ ] **Step 1: Eliminar API/modelo/runtime push**

Quitar el grupo `/push-notifications` de `routeRegistry.ts`, el import/entrada
`PushToken` en `database/index.ts`, la propiedad `mobileNotificationsEnabled`
de `User.ts`, el controlador, servicio y modelo FCM. Quitar únicamente imports y
llamadas `notifyIncomingTicketMessage`/`notifyChannelDisconnected` de
`CreateMessageService.ts`, `wbot.ts`, `telegram.ts`, `wbotMonitor.ts` y
`WhatsAppSessionController.ts`; conservar el resto del procesamiento de mensajes,
sesiones y logs. Retirar los `jest.mock` de PushNotificationService en
`WbotMonitor.spec.ts` y `WbotInitLifecycle.spec.ts`.

Stagear las eliminaciones runtime con:

```bash
git rm backend/src/controllers/PushNotificationController.ts backend/src/models/PushToken.ts backend/src/services/PushNotificationService/index.ts
```

- [ ] **Step 2: Crear migración reversible de esquema**

Crear `20261021020000-remove-android-push-support.ts`. `up` debe ejecutar en este
orden:

```ts
await queryInterface.dropTable("PushTokens");
await queryInterface.removeColumn("Users", "mobileNotificationsEnabled");
```

`down` añade primero `mobileNotificationsEnabled` (`BOOLEAN NOT NULL DEFAULT
false`) y recrea `PushTokens` con las columnas `id`, `userId` FK a `Users` con
`CASCADE`, `token VARCHAR(512) UNIQUE`, `platform VARCHAR(20) NOT NULL DEFAULT
'android'`, `createdAt` y `updatedAt`. No editar ni borrar las dos migraciones
históricas. El rollback no recupera valores ni tokens borrados.

- [ ] **Step 3: Retirar Firebase Admin**

Verificar que `firebase-admin` no tenga imports fuera de PushNotificationService y
ejecutar en `backend/`:

```bash
npm uninstall firebase-admin --no-audit --no-fund
```

- [ ] **Step 4: Correr pruebas backend y compilar**

Run: `npm test` y `npx tsc --noEmit` (en `backend/`). `npm test` usa la DB de
test, aplica todas las migraciones y luego las deshace; comprobar que la nueva
migración sube y su `down` restaura las estructuras.

- [ ] **Step 5: Commit**

```bash
git add backend/src/database/index.ts backend/src/models/User.ts backend/src/routes/routeRegistry.ts backend/src/database/migrations/20261021020000-remove-android-push-support.ts backend/src/services/MessageServices/CreateMessageService.ts backend/src/libs/wbot.ts backend/src/libs/telegram.ts backend/src/services/WbotServices/wbotMonitor.ts backend/src/controllers/WhatsAppSessionController.ts backend/src/__tests__/unit/WbotMonitor.spec.ts backend/src/__tests__/unit/WbotInitLifecycle.spec.ts backend/package.json backend/package-lock.json
git commit -m "refactor(backend): elimina soporte push de Android"
```

---

### Task 4: Eliminar el proyecto APK y dependencias Capacitor

**Files:**
- Delete: `frontend/android/`, `frontend/capacitor.config.ts`, `frontend/build-android-apk.bat`
- Modify: `frontend/package.json`, `frontend/package-lock.json`, `README.md`

- [ ] **Step 1: Quitar dependencias npm**

En `frontend/`:

```bash
npm uninstall @capacitor/android @capacitor/core @capacitor/preferences @capacitor/push-notifications @capacitor/cli --no-audit --no-fund
```

- [ ] **Step 2: Eliminar archivos Android versionados**

```bash
git rm -r frontend/android
git rm frontend/capacitor.config.ts frontend/build-android-apk.bat
```

No borrar `.toolchain`, `IA/`, credenciales externas ni logs locales no versionados.

- [ ] **Step 3: Retirar las instrucciones de APK**

Quitar la sección `## Compilar la app Android (APK)` de `README.md`; conservar
instalación web, despliegue, créditos y documentación restante.

Actualizar `scripts/smoke-test.sh`: probar CORS de la API/socket para el panel web
y, si se configuran `SMOKE_EMAIL`/`SMOKE_PASSWORD`, validar cookie `jrt` en login
y refresh. Quitar checks de `X-Client-App`, `X-Refresh-Token` y `/push-notifications`.
Actualizar el comentario de smoke test en `scripts/deploy.sh` para reflejar los
checks web.

- [ ] **Step 4: Buscar referencias runtime restantes**

Run en la raíz:

```bash
git grep -n -i -E "@capacitor|Capacitor|capacitor://|ionic://|proit-press-android|X-Client-App|X-Refresh-Token|PushNotificationService|PushToken|mobileNotificationsEnabled|build-android-apk|push móvil|refresh nativo|app Android" -- backend/src/controllers backend/src/helpers backend/src/libs backend/src/models backend/src/routes backend/src/services backend/src/__tests__ frontend/src frontend/package.json frontend/package-lock.json backend/package.json backend/package-lock.json README.md scripts
```

Expected: sin referencias runtime. Las referencias de las migraciones históricas
se conservan intencionalmente.

- [ ] **Step 5: Build frontend**

Run: `npm run build` (en `frontend/`, `CI=false`).

Expected: `Compiled successfully` sin resolver paquetes Capacitor.

Verificar la sintaxis de `scripts/smoke-test.sh` con `bash -n` y su salida web en
el deploy; el smoke test no debe exigir Firebase ni headers nativos.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json README.md frontend/src/index.js frontend/src/services/serverConfig.js frontend/src/services/serverConfig.test.js frontend/src/services/api.js frontend/src/hooks/useAuth.js frontend/src/components/ServerSettingsModal/index.js frontend/src/components/NotificationsPopOver/index.js frontend/src/layout/index.js frontend/src/translate/languages/es.js frontend/src/translate/languages/pt.js
git commit -m "refactor(mobile): elimina cliente Android y Capacitor"
```

---

### Task 5: Verificación final y despliegue

**Files:** toda la implementación anterior.

- [ ] **Step 1: Verificación local completa**

Run:

```bash
cd backend && npm test && npx tsc --noEmit
cd ../frontend && CI=true npm test -- --watchAll=false && npm run build
```

Expected: las pruebas y builds web/backend pasan. No ejecutar Gradle ni generar
APK: esa plataforma se retiró.

Verificar además `bash -n scripts/smoke-test.sh`; el smoke test ahora comprueba
CORS del panel web y refresh por cookie jrt, sin consultar endpoints push ni
probar headers nativos.

- [ ] **Step 2: Revisar diff y secretos**

Run: `git diff --check`, `git status --short`, `git diff --stat`; confirmar que
no se stagean `.env`, `google-services.json`, `IA/` ni artefactos de Android no
versionados.

- [ ] **Step 3: Pushear y monitorear Actions**

```bash
git push origin main
```

Esperar CI y Deploy en el runner self-hosted. `deploy.sh` aplica la migración
antes del reinicio; no ejecutar manualmente contra producción.

- [ ] **Step 4: Verificación post-deploy**

Confirmar en Prometheus: migración `20261021020000-remove-android-push-support`
en estado `up`, `itn-backend`/`itn-frontend` online, panel HTTP 200, sesiones
WhatsApp conectadas. Desde navegador web, iniciar sesión, confirmar refresh por
cookie y cerrar un ticket desde la lista; debe desaparecer sin cambio de pestaña.

### Rollback

El rollback de aplicación requiere volver al commit anterior y hacer `db:migrate:undo`
de la migración de retiro antes de arrancar ese código. La migración `down`
recrea tabla/columna vacías; los registros PushTokens borrados no se recuperan.
