#!/bin/bash
# Auto-deploy por polling (modelo pull) para servers detrás de CGNAT.
# Se ejecuta por cron cada pocos minutos: sigue las RELEASES (tags v*) de
# origin y aplica el deploy SOLO cuando aparece una release nueva.
#
# IMPORTANTE: los commits/pushes intermedios a main NO disparan deploy.
# Solo un tag vX.Y.Z nuevo (una release publicada) lo hace.
#
# Overrides opcionales (para installs adaptados, p. ej. testing):
#   AUTODEPLOY_REPO   = ruta del repo (default: el padre del directorio del script)
#   AUTODEPLOY_DEPLOY = script de deploy a ejecutar (default: $REPO/scripts/deploy.sh)
#
# Kill-switch: crear $REPO/.autodeploy-off para pausar (y borrarlo para reanudar).
# Log: $HOME/auto-deploy.log (solo registra acciones, no cada chequeo).
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="${AUTODEPLOY_REPO:-$(cd "$SCRIPT_DIR/.." && pwd)}"
DEPLOY_SCRIPT="${AUTODEPLOY_DEPLOY:-$REPO/scripts/deploy.sh}"
KILLSWITCH="$REPO/.autodeploy-off"
LOG="$HOME/auto-deploy.log"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"
}

if [ -f "$KILLSWITCH" ]; then
  exit 0 # pausado, silencioso
fi

cd "$REPO"

# Trae commits y tags de origin (los tags nuevos son lo que importa).
git fetch origin --quiet --tags --force 2>>"$LOG" || {
  log "ERROR: git fetch falló"
  exit 1
}

# Última release: el tag v* con versión más alta (orden semver).
LATEST_TAG=$(git tag --list 'v*' --sort=-v:refname | head -1)
if [ -z "$LATEST_TAG" ]; then
  exit 0 # no hay releases, nada que hacer (silencioso)
fi

# Tag actualmente desplegado (el último tag alcanzable desde el HEAD local).
CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ "$LATEST_TAG" != "$CURRENT_TAG" ]; then
  log "Nueva release $LATEST_TAG (actual: ${CURRENT_TAG:-ninguna}), aplicando deploy..."
  git reset --hard "$LATEST_TAG" >> "$LOG" 2>&1
  bash "$DEPLOY_SCRIPT" >> "$LOG" 2>&1
  log "Deploy completado -> $LATEST_TAG ($(git rev-parse --short HEAD))"
fi
# sin release nueva: silencioso
