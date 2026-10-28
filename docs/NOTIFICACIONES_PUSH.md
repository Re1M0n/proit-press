# Notificaciones push de ProIT Press — guía completa

**Estado verificado el 2026-10-01:** el código está 100 % listo. Falta **una sola
credencial** en el servidor (la *service account* de Firebase). Mientras no esté,
`/push-notifications/status` responde `"configured": false` y la app se niega a
activar las notificaciones con el mensaje *"Las notificaciones todavía no están
configuradas en el servidor"*.

> **Rutas (24/10/2026):** los comandos de esta guía apuntan al servidor anterior
> (`deploy@192.168.100.22`, `/home/deploy/Press-Ticket`, PM2 `itn-backend` /
> `itn-frontend`). En producción (`pressticket`) el repo está en
> `/home/deploy/proit-press` y los procesos son `proit-back` / `proit-front`.
> Ver [`produccion.md`](produccion.md).

---

## 1. Cómo funciona (para entender qué falta)

ProIT Press usa **push real por servidor** con Firebase Cloud Messaging (FCM).
No son alarmas locales del teléfono: el backend decide qué enviar y FCM lo entrega
aunque la app esté cerrada.

```
                 ┌─────────────────────────────┐
   mensaje   ──▶ │  Backend (firebase-admin)   │
   entrante o    │  PushNotificationService     │──▶ FCM ──▶ teléfono (app cerrada)
   canal caído   └─────────────────────────────┘
                        │ necesita
                        ▼
              service account de Firebase  ◀── ESTO ES LO QUE FALTA
```

### Piezas y dónde viven

| Pieza | Archivo |
|-------|---------|
| Lógica de envío (FCM) | `backend/src/services/PushNotificationService/index.ts` |
| Endpoints REST | `backend/src/controllers/PushNotificationController.ts` (rutas en `backend/src/routes/routeRegistry.ts`, bajo `/push-notifications`) |
| Registro del dispositivo | `frontend/src/services/pushNotifications.js` |
| Botón "Notificaciones" | `frontend/src/components/MobileModeControl/index.js` |
| Cliente Android | `frontend/android/` (Capacitor) + `frontend/android/app/google-services.json` |
| Instalador de la credencial | `IA/firebase/instalar-service-account.sh` |

### Qué dispara una notificación

- **Mensaje nuevo en un ticket** (`notifyIncomingTicketMessage`): si el ticket está
  `open` avisa al usuario asignado; si está `pending` avisa a los usuarios de la
  cola. Límite: 1 aviso por ticket cada 5 minutos.
- **Canal desconectado** (`notifyChannelDisconnected`): avisa a los usuarios
  `admin`/`masteradmin`. Se dispara en `auth_failure` de WhatsApp y al desconectar
  un canal a mano. Límite: 1 aviso por canal cada 30 minutos.

En ambos casos solo llegan a usuarios **`active: true`** y con
**`mobileNotificationsEnabled: true`**.

### Cómo detecta el servidor si está configurado

`isFirebaseConfigured()` es `true` si existe **una** de estas dos:

1. `FIREBASE_SERVICE_ACCOUNT` → el JSON de la service account **inline** en el `.env`.
2. `GOOGLE_APPLICATION_CREDENTIALS` → **ruta** a un archivo JSON que exista.

En producción ya está puesta la opción 2 apuntando a
`/home/deploy/secrets/firebase-service-account.json`, pero **el archivo todavía no existe**.

> ⚠️ **No confundir** con `frontend/android/app/google-services.json`. Ese es la
> configuración pública del cliente Android (sirve para que el teléfono se registre
> en FCM). El **JSON de service account** es la clave privada del **servidor** y es
> la única que sirve para **enviar**. Son archivos distintos.

---

## 2. Checklist de requisitos

- [ ] **Service account JSON** en el servidor → `Paso 1` y `Paso 2`.
- [ ] **Backend con la credencial cargada** (reinicio) → `Paso 3`.
- [ ] **App Android nativa** compilada con `google-services.json` → `Paso 4`.
- [ ] **Permiso de notificaciones** concedido en el teléfono → `Paso 5`.
- [ ] **Modo "Notificaciones" activado** por el usuario → `Paso 5`.
- [ ] **Usuario `active` + `mobileNotificationsEnabled`** en la base → `Paso 5`.

---

## Paso 1 — Generar la service account (una sola vez)

1. Entrá a <https://console.firebase.google.com> y elegí el proyecto **`proit-press`**
   (project number `770144628934`).
2. Arriba a la izquierda, engranaje ⚙️ → **Configuración del proyecto**.
3. Pestaña **Cuentas de servicio** (Service accounts).
4. Botón **Generar nueva clave privada** → confirmar → se descarga un archivo
   `proit-press-firebase-adminsdk-xxxxx-xxxxxxxx.json`.
5. Guardá ese archivo. Contiene algo así (fijate que diga `"type": "service_account"`
   y `"project_id": "proit-press"`):

```json
{
  "type": "service_account",
  "project_id": "proit-press",
  "private_key_id": "…",
  "private_key": "-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-…@proit-press.iam.gserviceaccount.com",
  "client_id": "…",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "client_x509_cert_url": "…"
}
```

6. Guardá también una copia de respaldo en `IA/firebase/proit-press-service-account.json`
   (esa carpeta está preparada, fuera del repositorio, nunca se commitea).

> Es un **secreto**. Nunca al repositorio. Si se filtra, se revoca desde la misma
> pantalla y se genera otra.

---

## Paso 2 — Instalarla en el servidor

El instalador hace todo: valida el JSON, lo copia a `/home/deploy/secrets/` con
permisos `600`, reinicia `itn-backend` y corre el smoke test.

```bash
cd "C:\Users\Rei\Documents\.0-proyectos\IA\firebase"
bash instalar-service-account.sh /ruta/al/proit-press-firebase-adminsdk-xxxx.json
```

Qué hace por dentro (por si preferís hacerlo a mano):

```bash
scp -i ~/.ssh/itn_servidor <json> deploy@192.168.100.22:/tmp/sa.json
ssh -i ~/.ssh/itn_servidor deploy@192.168.100.22 \
  "install -m 600 /tmp/sa.json /home/deploy/secrets/firebase-service-account.json && rm /tmp/sa.json"
ssh -i ~/.ssh/itn_servidor deploy@192.168.100.22 "pm2 restart itn-backend"
```

> La carpeta `/home/deploy/secrets/` (permisos 700) ya existe. El `.env` del server
> ya apunta ahí, así que **no hay que tocar el `.env`**: alcanza con dejar el archivo.

---

## Paso 3 — Verificar que el backend quedó configurado

```bash
ssh -i ~/.ssh/itn_servidor deploy@192.168.100.22 "cd /home/deploy/Press-Ticket && bash scripts/smoke-test.sh"
```

En el bloque **Push móvil** tenés que ver:

```
  OK    push: Firebase está configurado en el servidor
```

Si en cambio dice `AVISO push: Firebase NO configurado…`, el archivo no está en la
ruta o el backend no se reinició.

También podés consultarlo a mano con el usuario de prueba (logueate en la app/API y
pegale a `GET /push-notifications/status`): debe devolver `{"enabled":<lo que tenga el usuario>,"configured":true}`.

---

## Paso 4 — Compilar e instalar la app Android

El push en segundo plano **solo funciona en la app nativa** (Android). En el panel
web el botón existe pero solo guarda la preferencia del usuario; no hay entrega en
segundo plano (es una limitación de las notificaciones web, no un bug).

Requisitos: el toolchain del proyecto (JDK 17, Android SDK). En esta máquina:

```bash
# Android SDK centralizado
export ANDROID_HOME="C:\Users\Rei\android-sdk"        # junction a IA/android-sdk
export JAVA_HOME="C:\Users\Rei\Documents\.0-proyectos\IA\toolchain\jdk"
```

Compilar (desde `frontend/`):

```bash
npm install
npm run build                 # build web (React)
npx cap sync android          # copia el build web y los plugins al proyecto Android
cd android
./gradlew assembleDebug       # o assembleRelease para distribuir
```

El APK queda en `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
Instalalo por ADB (`adb install -r <apk>`) o pasalo al teléfono.

Notas:
- El plugin `com.google.gms.google-services` se aplica automáticamente **solo si
  existe** `android/app/google-services.json` (ya está en el repo, es del proyecto
  `proit-press`). Sin ese archivo el plugin se saltea y "Push Notifications won't work".
- Verificá que el build no use un JDK viejo (hubo un `android-build.err.log` con
  JAVA_HOME apuntando a un jdk-21 inexistente).

---

## Paso 5 — Activar las notificaciones en el teléfono

1. Abrí la app **ProIT Press** e iniciá sesión.
2. Tocá el botón **Notificaciones** (campana, arriba). La primera vez Android pide
   permiso → **Permitir** (Android 13+).
3. La app registra el token FCM del teléfono (`POST /push-notifications/devices`) y
   pone el modo del usuario en `enabled`. Verás el toast de confirmación.
4. Debe quedar `mobileNotificationsEnabled = true` para ese usuario.

> Si el permiso fue denegado, el botón devuelve *"No se concedió permiso para mostrar
> notificaciones"*. Se rehabilita en Ajustes de Android → Apps → ProIT Press →
> Notificaciones, y se vuelve a tocar el botón.

---

## Paso 6 — Prueba de punta a punta

1. **Mensaje entrante:** con el canal WhatsApp conectado, mandale un mensaje a un
   ticket `open` asignado a tu usuario (o creá uno `pending` en una cola tuya).
   Tiene que llegar el push *"Nuevo mensaje en ProIT Press"* con la app cerrada.
2. **Canal caído:** desconectá un canal desde *Canales* → los admins reciben
   *"Canal desconectado: <nombre>"*.
3. **Token registrado en la base:**

```bash
ssh -i ~/.ssh/itn_servidor deploy@192.168.100.22 \
  "cd /home/deploy/Press-Ticket/backend && PW=\$(grep '^DB_PASS=' .env | cut -d= -f2-); \
   mysql -uroot -p\"\$PW\" press_ticket -e 'SELECT id,userId,platform,createdAt FROM PushTokens;'"
```

4. **Log del backend:** buscá líneas `[PUSH]`. Si Firebase no está configurado verás
   `[PUSH] Firebase no está configurado; las notificaciones push quedan deshabilitadas.`

---

## 7. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Botón dice *"…no están configuradas en el servidor"* | `configured:false` | Falta la service account → Pasos 1–3 |
| No llega nada y el token está registrado | App no es la nativa / no hay `google-services.json` | Recompilar con `cap sync` → Paso 4 |
| Android 13+ no muestra nada | Permiso `POST_NOTIFICATIONS` denegado | Ajustes → Notificaciones → Permitir |
| Llega solo con la app abierta | Estás en el panel web, no en la app | Usar el APK nativo |
| `messaging/registration-token-not-registered` | Token viejo | El backend lo borra solo; reintentá registrando de nuevo |
| No avisa a un usuario | `active:false` o `mobileNotificationsEnabled:false` | Activarlo en su perfil |

**Posible mejora pendiente:** el backend envía a Android con
`channelId: "proit-press-alerts"`, pero la app **no crea** ese canal de notificación.
En Android 8+ conviene crearlo (`PushNotifications.createChannel`) para que el aviso
tenga nombre, importancia y sonido propios y no dependa del canal por defecto de FCM.

---

## 8. Diagnóstico rápido (comandos)

```bash
# ¿Está la credencial en el server?
ssh -i ~/.ssh/itn_servidor deploy@192.168.100.22 "ls -l /home/deploy/secrets/"

# ¿El backend ve la variable?
ssh -i ~/.ssh/itn_servidor deploy@192.168.100.22 \
  "grep GOOGLE_APPLICATION_CREDENTIALS /home/deploy/Press-Ticket/backend/.env"

# Estado de los canales de WhatsApp (MCSI incluido)
ssh -i ~/.ssh/itn_servidor deploy@192.168.100.22 \
  "cd /home/deploy/Press-Ticket/backend && PW=\$(grep '^DB_PASS=' .env | cut -d= -f2-); \
   mysql -uroot -p\"\$PW\" press_ticket -e 'SELECT id,name,status,number FROM Whatsapps;'"

# Logs del backend
ssh -i ~/.ssh/itn_servidor deploy@192.168.100.22 "pm2 logs itn-backend --lines 200 --nostream"
```
