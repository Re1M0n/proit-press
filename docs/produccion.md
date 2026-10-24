# Producción (`pressticket`)

- **Última actualización:** 2026-10-24
- **Servidor:** VM `pressticket` (Ubuntu 24.04, detrás de CGNAT)
- **Panel:** https://press.professionalit.com.ar
- **API:** https://pressapi.professionalit.com.ar
- **Servidor anterior:** `prometheus` — retirado de producción el 24/10/2026

## Servicios y rutas

| Qué | Dónde |
|---|---|
| Repo | `/home/deploy/proit-press` |
| Backend (PM2) | `proit-back` → `dist/server.js`, puerto 4000 |
| Frontend (PM2) | `proit-front` → `server.js`, puerto 3000 |
| Base de datos | MySQL/MariaDB local, `press_ticket` (dialecto `mysql`) |
| Medios de tickets | `backend/public` |
| Sesiones WhatsApp | `backend/.wwebjs_auth/session-<COMPANY_NAME>_<id>` |
| Runner de GitHub Actions (PM2) | `github-runner` → `/home/deploy/actions-runner` (etiqueta `pressticket`) |
| Auto-deploy | `/home/deploy/.autodeploy/` (fuera del repo) |
| Log del auto-deploy | `/home/deploy/auto-deploy.log` |
| Backups | `/home/deploy/backups/` |

Node se instala con `nvm` (`~/.nvm`). En shells no interactivos hay que cargarlo antes
de `node`, `npm` o `pm2`:

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
```

## Variables que definen la instalación

En `backend/.env`:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `COMPANY_NAME` | `itn_press` |
| `BACKEND_URL` / `WEBHOOK` | `https://pressapi.professionalit.com.ar` |
| `FRONTEND_URL` | `https://press.professionalit.com.ar` |
| `PORT` | `4000` |
| `CHROME_BIN` | `/usr/bin/google-chrome-stable` |

⚠️ `COMPANY_NAME` no es solo branding: arma el nombre de la carpeta de sesión
(`session-itn_press_4`, `session-itn_press_9`). Cambiarlo obliga a re-escanear el QR
de cada canal.

`FRONTEND_URL` es además el origen que el backend acepta por CORS. Si el panel cambia
de dominio, hay que actualizarla o el preflight de `/auth/login` responde 500 y el
login falla en el navegador.

## Deploy

Producción sigue **`main`**, con dos disparadores que ejecutan el mismo script:

- **GitHub Actions** (`.github/workflows/deploy.yml`): al terminar bien el CI de un
  push a `main`, y también a mano con `workflow_dispatch`. Corre en el runner
  self-hosted de la propia VM.
- **Cron cada 3 minutos**: respaldo si el runner está caído o GitHub no notifica.

Como `pressticket` está bajo CGNAT, Actions no puede entrar por SSH: el runner vive
en la VM y sale por HTTPS. Por eso el workflow no hace `checkout` ni build: sólo invoca
el deploy local.

El script `/home/deploy/.autodeploy/auto-deploy.sh` es idempotente y serializa:

1. Hace `git fetch origin main` y compara `origin/main` con el SHA guardado en
   `.last-deployed`. Si coincide, termina sin hacer nada (el segundo disparador
   no redeploya lo mismo).
2. Toma un `flock`: dos disparadores a la vez no se pisan; el segundo sale.
3. Si cambió, hace `git reset --hard` en `/home/deploy/proit-press` y ejecuta
   `/home/deploy/.autodeploy/deploy.sh`.
4. Ese deploy instala dependencias, verifica los parches de `whatsapp-web.js`,
   compila el backend, **corre las migraciones**, reinicia `proit-back`, buildea el
   panel en `build-new` con swap atómico y reinicia `proit-front`.
5. Si algo falla, el SHA **no** se marca y se reintenta en el próximo ciclo; los
   procesos viejos siguen atendiendo.

| Acción | Comando |
|---|---|
| Pausar | `touch /home/deploy/proit-press/.autodeploy-off` |
| Reanudar | `rm /home/deploy/proit-press/.autodeploy-off` |
| Ver qué se desplegó | `tail -20 /home/deploy/auto-deploy.log` |
| Forzar el próximo ciclo | `rm /home/deploy/.autodeploy/.last-deployed` (o correr el script a mano) |

La entrada de cron es una sola línea, cada 3 minutos:

```cron
*/3 * * * * AUTODEPLOY_REPO=/home/deploy/proit-press AUTODEPLOY_BRANCH=main \
  AUTODEPLOY_DEPLOY=/home/deploy/.autodeploy/deploy.sh \
  /home/deploy/.autodeploy/auto-deploy.sh >/dev/null 2>&1
```

Los scripts viven fuera del repo a propósito: el `git reset --hard` del deploy no los
pisa. Hay copias de versiones anteriores en `/home/deploy/.autodeploy/*.bak-*`.

### Runner de Actions

`github-runner` corre bajo PM2 (`/home/deploy/actions-runner`, etiqueta
`pressticket`). Se registra con `scripts/instalar-runner.sh <token> pressticket`; el
token se genera en *Settings → Actions → Runners → New self-hosted runner* y dura ~1 h.

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
pm2 logs github-runner --lines 20   # tiene que decir 'Listening for Jobs'
pm2 restart github-runner
```

### Arranque tras un reinicio

Esta VM **no** usa el `pm2 startup` de sistema (`pm2-deploy` existe en `prometheus`
pero no acá, y `deploy` no tiene `sudo`). El arranque se resuelve con un **unit de
systemd de usuario** más *linger*, así el manager de usuario sube sin que nadie
inicie sesión:

| Pieza | Ruta / comando |
|---|---|
| Unit | `~/.config/systemd/user/pm2.service` (`ExecStart`: `pm2 resurrect`) |
| Habilitado | `systemctl --user enable pm2.service` → symlink en `default.target.wants` |
| Linger | `loginctl enable-linger deploy` → `Linger=yes` |
| Estado del dump | `pm2 save` (guarda `proit-back`, `proit-front` y `github-runner`) |

Verificado sin reiniciar: tras `pm2 kill`, `systemctl --user start pm2.service`
levanta los tres procesos en ~10 s (panel 200, preflight 204).

Si se actualiza la versión de Node con `nvm`, el `ExecStart` del unit queda apuntando
a la ruta vieja: hay que editarlo.

## Acceso

`pressticket` no tiene puertos entrantes: se entra por **Tailscale**.

```bash
ssh deploy@100.102.56.6
```

Desde una máquina que no está en la tailnet, usando Prometheus como salto:

```bash
ssh -i ~/.ssh/itn_servidor \
  -o ProxyCommand="ssh -o BatchMode=yes -i ~/.ssh/itn_servidor -W %h:%p deploy@prometheus" \
  deploy@100.102.56.6
```

Las IP `100.x` pueden cambiar si se recrea un nodo: `tailscale status` en cualquiera de
las dos máquinas las muestra.

> El túnel inverso por el puerto 2223 quedó obsoleto: dependía del puerto 22 público de
> Prometheus, cerrado el 20/10/2026. Ver [`tunel-testing.md`](tunel-testing.md).

## Verificación rápida

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
cd /home/deploy/proit-press/backend

pm2 list | grep proit-
curl -s -o /dev/null -w 'panel %{http_code}\n' http://localhost:3000/
curl -s -o /dev/null -w 'api   %{http_code}\n' -X OPTIONS http://localhost:4000/auth/login \
  -H 'Origin: https://press.professionalit.com.ar'

DB_U=$(grep -m1 '^DB_USER=' .env | cut -d= -f2-)
DB_P=$(grep -m1 '^DB_PASS=' .env | cut -d= -f2-)
DB_N=$(grep -m1 '^DB_NAME=' .env | cut -d= -f2-)
MYSQL_PWD="$DB_P" mysql -u"$DB_U" "$DB_N" -e 'SELECT id,name,status FROM Whatsapps;'
```

Esperado: `proit-back` y `proit-front` online, panel 200, preflight 204 y los canales en
`CONNECTED`.

## Sesiones de WhatsApp

- Viven en `backend/.wwebjs_auth/`, una carpeta por canal.
- Si Chrome queda huérfano, la sesión no llega a READY. Antes de borrar nada, verificar
  que no haya procesos `chrome` con `wwebjs_auth` colgados.
- Nunca abrir la misma sesión desde dos servidores a la vez.

## Backups

```bash
cd /home/deploy/proit-press
PROIT_APP_DIR=/home/deploy/proit-press bash backup.sh /home/deploy/backups
```

Genera `database.sql.gz`, `public.tar.gz` y `sessions.tar.gz` en
`/home/deploy/backups/<fecha>/`. `backup.sh` usa `/home/deploy/Press-Ticket` por
defecto, así que `PROIT_APP_DIR` es obligatorio acá.

## Disco

La VM tiene 40 GiB, pero la raíz quedó creada con 19 GiB y el resto sin asignar. Se
extendió a ~38 GiB; si vuelve a llenarse:

```bash
sudo vgs
sudo lvextend -l +100%FREE /dev/mapper/ubuntu--vg-ubuntu--lv
sudo resize2fs /dev/mapper/ubuntu--vg-ubuntu--lv
df -h /
```

Consume espacio, en orden: `backend/.wwebjs_auth/` (varios GiB con el tiempo),
`/home/deploy/backups/` y la caché de npm (`npm cache clean --force`).

El build de React necesita ~1–2 GiB libres. Si la raíz baja de ~2 GiB, el deploy puede
quedar a mitad de build: revisar `df -h /` después de cada deploy.

## Rollback

`prometheus` conserva la copia previa: base, `backend/public` y las carpetas
`session-itn_press_4/_9` en `/home/deploy/Press-Ticket`.

Para volver atrás:

1. Detener producción primero (`pm2 stop proit-back proit-front`).
2. Recién entonces arrancar `itn-backend` en Prometheus.

Arrancar los dos a la vez deja las mismas sesiones de WhatsApp abiertas en dos
servidores, lo que termina en desconexión o bloqueo.
