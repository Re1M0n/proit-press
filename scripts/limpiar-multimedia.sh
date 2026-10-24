#!/bin/bash
# Limpieza de multimedia de tickets en producción.
#
# Regla:
#   - Sólo borra si el disco de backend/public está por encima de UMBRAL (80%).
#   - Borra archivos con más de DIAS días (60).
#   - Empieza por los chats menos frecuentes y NO toca los chats recurrentes
#     (los que tuvieron mensajes en los últimos DIAS días).
#
# El cron corre a diario, pero el borrado efectivo es cada INTERVALO días (60):
# el intervalo se guarda en un archivo de estado, así un día con el servidor
# apagado no pierde la limpieza. Si el disco llega a CRITICO (90%) se ignora el
# intervalo, para no quedarse sin espacio esperando el turno.
#
# Uso:
#   scripts/limpiar-multimedia.sh              # según regla y cadencia
#   scripts/limpiar-multimedia.sh --dry-run    # informa, no borra
#   scripts/limpiar-multimedia.sh --forzar     # ignora el intervalo (no el umbral)
#
# Variables: DIAS, INTERVALO, UMBRAL, CRITICO, PUBLIC, ENV_FILE, LOG, ESTADO.
#
# Ojo: borra archivos, NO filas de la base. El ticket sigue existiendo, pero el
# adjunto deja de abrirse. Las sesiones de WhatsApp no se tocan.
set -euo pipefail

DIAS="${DIAS:-60}"
INTERVALO="${INTERVALO:-60}"
UMBRAL="${UMBRAL:-80}"
CRITICO="${CRITICO:-90}"
PUBLIC="${PUBLIC:-/home/deploy/proit-press/backend/public}"
ENV_FILE="${ENV_FILE:-/home/deploy/proit-press/backend/.env}"
LOG="${LOG:-$HOME/limpieza-multimedia.log}"
ESTADO="${ESTADO:-$HOME/.limpieza-multimedia.ultima}"
MODO="${1:-}"

if [ ! -d "$PUBLIC" ]; then
  echo "ERROR: no existe $PUBLIC" >&2
  exit 1
fi
if [ ! -r "$ENV_FILE" ]; then
  echo "ERROR: no puedo leer $ENV_FILE" >&2
  exit 1
fi

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }

leer_env() {
  grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

uso_pct() {
  df -P "$PUBLIC" | awk 'NR==2 {gsub("%","",$5); print $5}'
}

USO="$(uso_pct)"
if [ "$USO" -le "$UMBRAL" ]; then
  log "disco en ${USO}% (umbral ${UMBRAL}%): no se borra nada"
  exit 0
fi

# Cadencia: cada INTERVALO días, salvo que el disco esté crítico.
if [ "$MODO" != "--forzar" ] && [ -f "$ESTADO" ]; then
  if [ "$USO" -lt "$CRITICO" ]; then
    ULTIMA="$(cat "$ESTADO" 2>/dev/null || echo 0)"
    if [ $(( ($(date +%s) - ULTIMA) / 86400 )) -lt "$INTERVALO" ]; then
      log "disco en ${USO}%, pero la última limpieza fue hace menos de ${INTERVALO} días: se espera"
      exit 0
    fi
  else
    log "disco en ${USO}% (>= ${CRITICO}%): se ignora la cadencia de ${INTERVALO} días"
  fi
fi

DB_USER="$(leer_env DB_USER)"
DB_PASS="$(leer_env DB_PASS)"
DB_NAME="$(leer_env DB_NAME)"
if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
  echo "ERROR: faltan DB_USER/DB_NAME en $ENV_FILE" >&2
  exit 1
fi

mysql_q() {
  MYSQL_PWD="$DB_PASS" mysql --batch --raw --skip-column-names \
    -u"$DB_USER" "$DB_NAME" -e "$1"
}

# Orden de borrado: primero lo huérfano (no está en la base), después los chats
# con actividad más vieja y con menos mensajes. rec=1 => chat recurrente, se saltea.
CONSULTA="
SELECT mediaUrl, rec, u, t FROM (
  SELECT m.mediaUrl AS mediaUrl,
         IF(s.ultima >= DATE_SUB(NOW(), INTERVAL $DIAS DAY), 1, 0) AS rec,
         COALESCE(s.ultima, '1970-01-01 00:00:00') AS u,
         COALESCE(s.total, 0) AS t
  FROM Messages m
  LEFT JOIN (
    SELECT contactId, MAX(createdAt) AS ultima, COUNT(*) AS total
    FROM Messages WHERE contactId IS NOT NULL GROUP BY contactId
  ) s ON s.contactId = m.contactId
  WHERE m.mediaUrl IS NOT NULL AND m.mediaUrl <> ''
) x
GROUP BY mediaUrl, rec, u, t
ORDER BY rec ASC, u ASC, t ASC;"

LISTA="$(mktemp)"
HUERFANOS="$(mktemp)"
VIEJOS="$(mktemp)"
REFERENCIADOS="$(mktemp)"
trap 'rm -f "$LISTA" "$HUERFANOS" "$VIEJOS" "$REFERENCIADOS"' EXIT

mysql_q "$CONSULTA" > "$LISTA"

# Archivos que realmente tienen más de DIAS días. La consulta trae todo el
# multimedia (para ordenar), así que el filtro de edad se aplica acá.
find "$PUBLIC" -maxdepth 1 -type f -mtime +"$DIAS" -printf '%f\n' > "$VIEJOS"

# Huérfanos: en disco y viejos, pero sin mensaje que los referencie.
cut -f1 "$LISTA" | sort -u > "$REFERENCIADOS"
comm -23 <(sort "$VIEJOS") "$REFERENCIADOS" > "$HUERFANOS"

# Índice de viejos, para no borrar nada con menos de DIAS días.
declare -A ES_VIEJO=()
while IFS= read -r f; do [ -n "$f" ] && ES_VIEJO["$f"]=1; done < "$VIEJOS"

TOTAL_VIEJOS="$(wc -l < "$VIEJOS")"
TOTAL_HUERFANOS="$(wc -l < "$HUERFANOS")"
TOTAL_REC="$(comm -12 <(sort "$VIEJOS") <(awk -F'\t' '$2==1 {print $1}' "$LISTA" | sort -u) | wc -l)"

if [ "$MODO" = "--dry-run" ]; then
  log "DRY-RUN: disco ${USO}%, $TOTAL_VIEJOS archivos >${DIAS}d (${TOTAL_HUERFANOS} huérfanos); $TOTAL_REC son de chats recurrentes y no se tocarían"
  exit 0
fi

borrados=0
bytes=0
protegidos=0
fallidos=0

borrar() {
  local archivo="$PUBLIC/$1" tam
  [ -f "$archivo" ] || return 0
  tam="$(stat -c %s "$archivo" 2>/dev/null || echo 0)"
  if rm -f -- "$archivo" 2>/dev/null; then
    borrados=$((borrados + 1))
    bytes=$((bytes + tam))
  else
    fallidos=$((fallidos + 1))
  fi
}

# 1) Huérfanos primero.
while IFS= read -r f; do
  [ -n "$f" ] || continue
  borrar "$f"
done < "$HUERFANOS"

# 2) Chats menos frecuentes primero; los recurrentes se saltean.
while IFS=$'\t' read -r nombre rec _resto; do
  [ -n "$nombre" ] || continue
  [ -n "${ES_VIEJO[$nombre]:-}" ] || continue   # sólo mayores a DIAS días
  if [ "$rec" = "1" ]; then
    protegidos=$((protegidos + 1))
    continue
  fi
  borrar "$nombre"
done < "$LISTA"

HUMANO="$(numfmt --to=iec "$bytes" 2>/dev/null || echo "$bytes bytes")"
log "disco ${USO}% -> $(uso_pct)%: borrados ${borrados} archivos (${HUMANO}); ${protegidos} de chats recurrentes conservados; ${fallidos} fallidos"
date +%s > "$ESTADO"
