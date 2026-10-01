# Secretos centralizados con Infisical (producción)

Guía para dejar de guardar los secretos del backend en `backend/.env` del
servidor y pasarlos a **Infisical**. Es el caso de producción: el servidor
`prometheus`, con el backend y el frontend corriendo bajo PM2 detrás de Nginx.

La aplicación **no cambia**: sigue leyendo `process.env` igual que siempre. Lo
único distinto es de dónde salen esos valores.

> El **frontend no lo necesita**. Sus variables (`REACT_APP_BACKEND_URL`,
> `REACT_APP_HOURS_CLOSE_TICKETS_AUTO`, `REACT_APP_MASTERADMIN`, `PORT`) son
> configuración pública y se hornean en el build de React, no son secretos.

## Qué variables maneja hoy el backend

Se leen con `process.env` desde `backend/src`. Las sensibles son las que
justifican la migración:

| Variable | Sensible |
|---|---|
| `DB_PASS` | sí |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | sí |
| `FIREBASE_SERVICE_ACCOUNT` / `GOOGLE_APPLICATION_CREDENTIALS` | sí |
| `GITHUB_TOKEN`, `SENTRY_DSN` | sí |
| `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PORT`, `DB_DIALECT`, `DB_TIMEZONE` | no |
| `BACKEND_URL`, `FRONTEND_URL`, `WEBHOOK`, `PORT`, `PROXY_PORT`, `CHROME_BIN`, `CHROME_WS` | no |
| `COMPANY_NAME`, `DEVICE_NAME`, `DEMO`, `USER_LIMIT`, `CONNECTIONS_LIMIT`, `RATE_LIMIT_STRICT`, `BACKUP_DIR` | no |
| `PM2_FRONTEND`, `PM2_BACKEND`, `NODE_ENV` | no |

Conviene subir **todas** al proyecto de Infisical: así el `.env` del servidor se
puede borrar entero en vez de quedar a medias.

## 1. Crear el proyecto en Infisical

1. Entrá a <https://app.infisical.com> y creá la cuenta de la organización.
2. **Secrets Management → + Add New Project**, con el nombre del servicio
   (por ejemplo `proit-press`).
3. El proyecto arranca con los entornos **Development**, **Staging** y
   **Production**.
4. En el entorno **Production**, arrastrá el `backend/.env` del servidor sobre
   la pantalla de Secrets Overview: Infisical lo parsea y muestra las claves
   detectadas para importarlas de una sola vez.

## 2. Instalar el CLI en el servidor

Seguí el método vigente en <https://infisical.com/docs/cli/overview>. Ojo con
un detalle de esa página: **Cloudsmith dejó de servir el CLI el 16/09/2026**, así
que si el servidor todavía apunta al repositorio viejo hay que moverlo a
`artifacts-cli.infisical.com` o el `apt upgrade` no instala nada.

## 3. Autenticar

**En la PC de trabajo (interactivo):** `infisical login`.
En WSL 2, Codespaces o SSH sin navegador: `infisical login -i`.

**En el servidor, no uses login interactivo.** Ahí va una **machine identity**
con **Universal Auth**:

1. En la organización: **Access Control → Machine Identities → Create**. Dale un
   rol de organización mínimo.
2. Configurá **Universal Auth** y agregá un **Client Secret**.
3. Entrá al proyecto `proit-press` → **Access Control → Machine Identities →
   Add Machine Identity to Project → Assign Existing**, y asignale acceso
   **solo al entorno Production** (mínimo privilegio).
4. Guardá el Client ID y el Client Secret en el **almacén de secretos del
   propio servidor**, nunca en el repo. En este proyecto el lugar es un archivo
   sólo-root:

   ```bash
   sudo install -d -m 750 -o deploy -g deploy /etc/proit-press
   sudo tee /etc/proit-press/infisical.env >/dev/null <<'EOF'
   INFISICAL_PROJECT_ID=<el id del proyecto>
   INFISICAL_ENV=prod
   # Universal Auth (opciones: token de sesión o login previo, ver abajo)
   INFISICAL_TOKEN=<token de la machine identity>
   EOF
   sudo chown deploy:deploy /etc/proit-press/infisical.env
   sudo chmod 600 /etc/proit-press/infisical.env
   ```

   El wrapper `scripts/start-backend-infisical.sh` lee ese archivo.

   Referencias: [Machine Identities](https://infisical.com/docs/documentation/platform/identities/machine-identities)
   y [Universal Auth](https://infisical.com/docs/documentation/platform/identities/universal-auth).
   Si preferís autenticar con Client ID/Secret en vez de un token, corré una vez
   como `deploy` el login no interactivo (confirmá los flags con
   `infisical login --help`):

   ```bash
   infisical login --method=universal-auth \
     --client-id=... --client-secret=...
   ```

## 4. Vincular el código

En `backend/`:

```bash
cd ~/Press-Ticket/backend
infisical init
```

Eso escribe `backend/.infisical.json`: solo identifica el proyecto y el entorno
por defecto, **no contiene secretos** y es seguro commitearlo. Conviene hacerlo,
porque el deploy corre `git reset --hard origin/main` y cualquier archivo sin
commitear se pierde en cada actualización.

## 5. Inyectar los secretos al arrancar

Con el CLI autenticado, el backend se arranca envuelto:

```bash
cd ~/Press-Ticket/backend
infisical run --env=prod -- node dist/server.js
```

Quedó también como script de npm, en `backend/package.json`:

- `npm run start:infisical` → producción (`--env=prod`)
- `npm run dev:infisical` → desarrollo local (`--env=dev`)

## 6. Cambiar PM2 al comando envuelto

Hoy el backend está en PM2 como `node dist/server.js`. Para que tome los
secretos de Infisical, se lo recrea una sola vez con el wrapper:

```bash
cd ~/Press-Ticket
pm2 delete itn-backend
pm2 start scripts/start-backend-infisical.sh --name itn-backend --interpreter bash
pm2 save          # para que sobreviva un reinicio del servidor
pm2 logs itn-backend --lines 30
```

A partir de ahí, `scripts/deploy.sh` sigue haciendo su `pm2 restart itn-backend
--update-env` y PM2 vuelve a ejecutar el mismo comando envuelto, así que no hay
que tocar el deploy.

## 7. Verificar

Sin imprimir valores, comprobá que un secreto resuelve y que además **ya no
depende del archivo en disco**:

```bash
cd ~/Press-Ticket/backend
node -e 'console.log("DB_PASS length:", (process.env.DB_PASS||"").length)'      # sin Infisical: 0
infisical run --env=prod -- node -e 'console.log("DB_PASS length:", (process.env.DB_PASS||"").length)'

# y ahora sacá el .env del medio
mv .env .env.backup
pm2 restart itn-backend --update-env
curl -s http://localhost:4000/personalizations | head -c 80     # debe responder
```

Si la app arranca con el `.env` renombrado, los secretos están viniendo de
Infisical. Para volver atrás: `mv .env.backup .env`.

## 8. Limpieza

- `backend/.gitignore` y el `.gitignore` raíz **ya ignoran** `.env` y `.env.*`,
  así que los secretos no se suben. Verificalo con
  `git check-ignore -v backend/.env`.
- Si algún valor estuvo commiteado alguna vez, **hay que rotarlo**: el historial
  de git lo conserva para siempre. Cambiá la clave en el motor, regenerá
  `JWT_SECRET` / `JWT_REFRESH_SECRET` (`openssl rand -base64 32`), etc.
- Para buscar filtraciones: <https://infisical.com/docs/cli/scanning-overview>
  (`infisical scan`).
