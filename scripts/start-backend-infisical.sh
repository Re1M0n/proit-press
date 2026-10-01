#!/bin/bash
# Arranca el backend de ProIT Press con los secretos inyectados por Infisical.
#
# Pensado para el servidor (PM2). La aplicación NO cambia: sigue leyendo
# process.env igual que siempre (DB_PASS, JWT_SECRET, FIREBASE_SERVICE_ACCOUNT,
# etc.); lo único distinto es de dónde salen esos valores.
#
# Las credenciales de la machine identity NO viven en el repo. Se leen de un
# archivo sólo-root del servidor (por defecto /etc/proit-press/infisical.env):
#
#   INFISICAL_PROJECT_ID=<id del proyecto>
#   INFISICAL_ENV=prod                 # opcional (default: prod)
#   INFISICAL_DOMAIN=                  # opcional (Cloud EU o self-hosted)
#   INFISICAL_TOKEN=                   # opcional: sesión no interactiva
#
# Ver docs/INFISICAL.md para el alta completa.
#
# Uso con PM2:
#   pm2 start scripts/start-backend-infisical.sh --name itn-backend --interpreter bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO/backend"

AUTH_FILE="${INFISICAL_AUTH_FILE:-/etc/proit-press/infisical.env}"
if [ -f "$AUTH_FILE" ]; then
	# shellcheck disable=SC1090
	set -a
	. "$AUTH_FILE"
	set +a
fi

if ! command -v infisical >/dev/null 2>&1; then
	echo "ERROR: no está instalado el CLI de Infisical. Ver docs/INFISICAL.md." >&2
	exit 1
fi

if [ -z "${INFISICAL_PROJECT_ID:-}" ]; then
	echo "ERROR: falta INFISICAL_PROJECT_ID (ver docs/INFISICAL.md)." >&2
	exit 1
fi

ARGS=(run "--projectId=$INFISICAL_PROJECT_ID" "--env=${INFISICAL_ENV:-prod}")
if [ -n "${INFISICAL_DOMAIN:-}" ]; then
	ARGS+=("--domain=$INFISICAL_DOMAIN")
fi

cd "$BACKEND_DIR"
exec infisical "${ARGS[@]}" -- node dist/server.js
