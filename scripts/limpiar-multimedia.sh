#!/bin/bash
# Borra el multimedia de tickets (imágenes, audios, videos, documentos) que tenga
# más de N días de antigüedad en backend/public.
#
# Lo ejecuta el cron de producción. El cron corre a diario, pero el script sólo
# actúa si pasaron INTERVALO días desde la última limpieza: así el borrado real es
# cada 60 días y, si el servidor estuvo apagado ese día, se hace en cuanto vuelve.
#
# Uso:
#   scripts/limpiar-multimedia.sh              # borra (respeta el intervalo)
#   scripts/limpiar-multimedia.sh --dry-run    # sólo informa
#   scripts/limpiar-multimedia.sh --forzar     # ignora el intervalo
#
# Variables: DIAS (60), INTERVALO (60), PUBLIC, LOG, ESTADO.
#
# Ojo: esto borra archivos, NO filas de la base. Un ticket viejo sigue existiendo,
# pero sus adjuntos dejan de estar disponibles.
set -euo pipefail

DIAS="${DIAS:-60}"
INTERVALO="${INTERVALO:-60}"
PUBLIC="${PUBLIC:-/home/deploy/proit-press/backend/public}"
LOG="${LOG:-$HOME/limpieza-multimedia.log}"
ESTADO="${ESTADO:-$HOME/.limpieza-multimedia.ultima}"
MODO="${1:-}"

if [ ! -d "$PUBLIC" ]; then
  echo "ERROR: no existe $PUBLIC" >&2
  exit 1
fi

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }

# El cron pasa seguido; el borrado efectivo es cada INTERVALO días.
if [ "$MODO" != "--forzar" ] && [ -f "$ESTADO" ]; then
  ULTIMA="$(cat "$ESTADO" 2>/dev/null || echo 0)"
  AHORA="$(date +%s)"
  if [ $(( (AHORA - ULTIMA) / 86400 )) -lt "$INTERVALO" ]; then
    exit 0
  fi
fi

# -mtime +N: estrictamente más viejo que N días.
mapfile -d '' VIEJOS < <(find "$PUBLIC" -type f -mtime +"$DIAS" -print0)
CANT="${#VIEJOS[@]}"

if [ "$CANT" -eq 0 ]; then
  log "sin archivos de más de $DIAS días en $PUBLIC"
  [ "$MODO" = "--dry-run" ] || date +%s > "$ESTADO"
  exit 0
fi

BYTES=0
for f in "${VIEJOS[@]}"; do
  BYTES=$((BYTES + $(stat -c %s "$f")))
done
HUMANO="$(numfmt --to=iec "$BYTES" 2>/dev/null || echo "$BYTES bytes")"

if [ "$MODO" = "--dry-run" ]; then
  log "DRY-RUN: borraría $CANT archivos ($HUMANO) de más de $DIAS días"
  exit 0
fi

printf '%s\0' "${VIEJOS[@]}" | xargs -0 rm -f --
log "borrados $CANT archivos ($HUMANO) de más de $DIAS días en $PUBLIC"
date +%s > "$ESTADO"
