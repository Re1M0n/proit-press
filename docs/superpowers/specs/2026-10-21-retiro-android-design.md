# Retiro del cliente Android y su soporte

- **Fecha:** 2026-10-21
- **Proyecto:** `proit-press` / Press-Ticket
- **Estado:** diseño aprobado por el usuario; retiro de datos push autorizado
- **Alcance:** eliminar el cliente Capacitor Android y su soporte runtime en frontend/backend

## Contexto

El frontend se empaqueta actualmente como APK mediante Capacitor. El código
asociado incluye `frontend/android/`, scripts/configuración de build, adaptadores
Capacitor para preferencias y refresh tokens, y notificaciones FCM para Android.
El backend conserva además `PushTokens` y `Users.mobileNotificationsEnabled`.
El usuario confirmó que la app Android es obsoleta y autorizó borrar los tokens
registrados y la preferencia móvil en una migración.

El refresh token web continúa funcionando mediante la cookie `jrt` HttpOnly,
`withCredentials` y el endpoint `/auth/refresh_token`; ese flujo no debe cambiar.
Las notificaciones del navegador de la agenda de recordatorios tampoco dependen
de Android y deben permanecer.

## Objetivos

1. Retirar del repositorio el proyecto Gradle/Capacitor y la generación del APK.
2. Eliminar las dependencias npm y el código frontend exclusivo de Capacitor,
   FCM, modo móvil y preferencias nativas.
3. Eliminar los endpoints/servicios FCM del backend, sus callers y la dependencia
   `firebase-admin`.
4. Eliminar los encabezados de refresh nativo, conservando íntegra la sesión web
   con cookies.
5. Aplicar una migración nueva que borra `PushTokens` y
   `Users.mobileNotificationsEnabled`.
6. Retirar las instrucciones versionadas para compilar el APK.

## Decisión

Se elimina todo el soporte de ejecución Android, no solo el wrapper Capacitor.
Se quitan el directorio Gradle versionado, `capacitor.config.ts`, el script
`build-android-apk.bat`, dependencias y código de runtime. También se elimina la
UI de modo móvil, las traducciones de esa UI, el registro FCM y las notificaciones
FCM de mensajes/canales.

Backend: eliminar rutas/controlador/servicio push, modelo `PushToken` de la
instancia Sequelize, propiedad `mobileNotificationsEnabled`, llamadas a los
servicios push, `firebase-admin`, headers CORS nativos y el header
`X-Refresh-Token`. `SessionController` recibirá el refresh token solo desde la
cookie `jrt`; el helper seguirá escribiendo esa cookie web.

Se agrega la migración `20261021020000-remove-android-push-support.ts` que elimina
la tabla `PushTokens` y la columna `Users.mobileNotificationsEnabled`. Su `down`
recrea el esquema vacío; **no puede recuperar los tokens ni los valores previos**.
Las migraciones históricas `20260930010000-create-push-tokens.ts` y
`20260930020000-add-mobile-notifications-to-users.ts` se conservan para mantener
el historial de Sequelize.

Los archivos de build del cliente que no están versionados, las credenciales
externas de Firebase/Infisical y la publicación existente en Google Play no se
alteran. El APK instalado previamente deja de recibir soporte del servidor; no
se intenta desinstalarlo ni retirar el listado de Play Store.

## Fuera de alcance

- Eliminar el soporte web o el formulario web de configuración del backend.
- Cambiar el refresh token web por cookie.
- Retirar las notificaciones nativas del navegador usadas por recordatorios.
- Borrar credenciales externas, archivos de `IA/` o logs locales.
- Modificar/eliminar archivos de documentación push locales no versionados.
- Despublicar la aplicación en Google Play.

## Pruebas y aceptación

1. `frontend/package.json` y `package-lock.json` no incluyen paquetes `@capacitor/*`.
2. No hay imports/runtime references a Capacitor, Preferences, PushNotifications,
   `X-Client-App`, `X-Refresh-Token`, `PushToken` ni `mobileNotificationsEnabled`,
   fuera de migraciones históricas.
3. El frontend web compila y mantiene la configuración del servidor en
   `localStorage`.
4. Los tests de sesión verifican login/refresh web por cookie y que no se emite un
   header nativo.
5. El backend compila y los tests relevantes pasan.
6. La migración sube eliminando la tabla/columna y su rollback recrea las
   estructuras vacías.
7. La página Recordatorios sigue generando `Notification` web y su alarma interna.

## Despliegue y rollback

- La migración corre con `deploy.sh` antes del reinicio del backend.
- Confirmar el resultado `up` de la nueva migración y verificar panel/sesiones.
- Para rollback, aplicar `db:migrate:undo` de la nueva migración antes de volver a
  código que use esos campos. El esquema se recupera vacío; los tokens push y las
  preferencias borradas no se restauran.
