#!/bin/bash
# Auto-deploy por polling (modelo pull) para servers detrás de CGNAT.
# Se ejecuta por cron cada pocos minutos: sigue main y aplica el deploy si hay cambios.
# Ejecutar como el usuario que es dueño del repo y de los procesos pm2 (normalmente "deploy").
#
# Kill-switch: crear $REPO/.autodeploy-off para pausar (y borrarlo para reanudar).
# Log: $HOME/auto-deploy.log (solo registra acciones, no cada chequeo).
set -e

REPO="$(cd "$(dirname "$0")/.." && pwd)"
KILLSWITCH="$REPO/.autodeploy-off"
LOG="$HOME/auto-deploy.log"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"
}

if [ -f "$KILLSWITCH" ]; then
  exit 0 # pausado, silencioso
fi

cd "$REPO"

git fetch origin --quiet 2>>"$LOG" || {
  log "ERROR: git fetch falló"
  exit 1
}

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "")

if [ -z "$REMOTE" ]; then
  log "ERROR: no se pudo resolver origin/main (¿remote configurado?)"
  exit 1
fi

if [ "$LOCAL" != "$REMOTE" ]; then
  log "Nueva versión en main ($(echo "$REMOTE" | cut -c1-7)), aplicando deploy..."
  git reset --hard origin/main >> "$LOG" 2>&1
  bash scripts/deploy.sh >> "$LOG" 2>&1
  log "Deploy completado -> $(git rev-parse --short HEAD)"
fi
# sin cambios: silencioso
