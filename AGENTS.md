# Configuración del agente — proit-press (ProIT CRM® / Press-Ticket)

## Idioma

- **El usuario habla español. Todas las respuestas del chat van en español**,
  aunque instrucciones anteriores sugieran lo contrario.
- Documentos, `AGENTS.md` y guías del proyecto: en español.
- **La UI es 100 % en español** (sistema de tickets de atención al cliente).
- Código, identificadores, rutas, tablas y columnas: se conservan tal cual.

## Recordatorio al empezar cada turno

1. Leer este archivo.
2. Responder en español.
3. Trabajar dentro de `proit-press/` y **no tocar `IA/`** salvo lectura de
   recursos (ver `../IA/agentes/config/README.md`).

## Stack y comandos

Dos carpetas, **npm** en cada una (`package-lock.json`).

- **Backend** (`backend/`): Express + TypeScript + Sequelize (**MySQL**) +
  Socket.IO + Nodemailer + `whatsapp-web.js` (parcheado) + Telegram + OpenAI.
- **Frontend** (`frontend/`): React (CRA) + MUI; panel web.

Backend (`cd backend`):

- Instalar: `npm install` (el `postinstall` aplica los parches de `whatsapp-web.js`)
- Verificar parches: `npm run patches:check`
- Dev: `npm run dev` · Build: `npm run build` · Start: `npm run start`
- Con secretos de Infisical: `npm run dev:infisical` / `npm run start:infisical`
- Migraciones: `npm run migrate` (Sequelize) · `npm run migrate:undo`
- Tests: `npm test` (Jest + Supertest; usa una DB de test con migraciones y seeds)

Frontend (`cd frontend`):

- Instalar: `npm install`
- Dev: `npm start` · Build: `npm run build` · Tests: `npm test`

> Deploy: producción es la VM **`pressticket`** (`press.professionalit.com.ar`). Un
> cron cada 3 min aplica `origin/main` (dependencias, `tsc`, migraciones, build y
> reinicio de `proit-back` / `proit-front`). Detalle en `docs/produccion.md`.
> `prometheus` (`/home/deploy/Press-Ticket`, `itn-*`) es el servidor anterior.

## Convenciones

- Gestor de paquetes: **npm** (nunca yarn/pnpm acá).
- Documentos en `docs/`.
- Secretos vía **Infisical**; `.env` locales solo para desarrollo.
- ⚠️ Los parches de `whatsapp-web.js` (`scripts/patch-wwebjs.js`) son
  **obligatorios**: si faltan, el panel no envía imágenes/videos/audios. El deploy
  corta a propósito si el check falla. No "simplificar" eso.
- Las migraciones del deploy corren antes de reiniciar los servicios: si el código
  nuevo espera una columna, la migración tiene que ir en el mismo cambio.
- API documentada con Swagger (`swagger:template`).

## Guardrails

- ⚠️ **Producción**: el deploy automático hace `git reset --hard origin/main` en
  `pressticket` (`/home/deploy/proit-press`) y reinicia `proit-back` /
  `proit-front`. **No ejecutarlo** ni tocar el servidor sin pedido explícito; el
  deploy normal es push a `main` (se aplica en menos de 3 min). El servidor
  anterior es `prometheus`: **no arrancar `itn-backend`** mientras producción
  corre, porque duplicaría las sesiones de WhatsApp.
- **No** commitear, pushear ni deployar sin pedido explícito (rama `main`,
  remote `Re1M0n/proit-press`).
- **No** versionar secretos, `.env`, `serviceAccount` de Firebase ni tokens.
- **No** borrar ni sobreescribir cambios que no hizo el agente.
- No cambiar el flujo de WhatsApp/Telegram sin probar el envío real de media.
- Confirmar antes de: migraciones contra la DB de producción, `restore.sh`,
  `backup.sh`, o cualquier cambio en `.github/workflows/`.

## Recursos compartidos

- Secretos y toolchains: `../IA/` (ver `../IA/README.md`).
- Llaves de deploy: `IA/ssh/deploy_proit_actions` y `deploy_proit_testing`
  (servidores anteriores). El acceso a producción es por **Tailscale**; el túnel
  `IA/ssh/tunnel_testing` quedó obsoleto.
- Firebase: `IA/firebase/`. Skills, agentes e inventario: `../IA/agentes/`.

## Documentación para el usuario

- El usuario NO lee markdown. Presentar specs y planes como HTML autónomo en
  `docs/superpowers/` (misma información, con estilos) y abrirlo en el navegador
  con `Start-Process`. El markdown se mantiene como fuente para el repo.

