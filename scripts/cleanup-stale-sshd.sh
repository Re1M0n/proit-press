#!/bin/bash
# Limpieza de sesiones SSH colgadas en prometheus.
# Se ejecuta por cron cada 5 min como el usuario deploy.
#
# Problema: un túnel inverso (-R) cuyo cliente murió sin avisar deja la sesión
# sshd viva (el server no detecta el cliente muerto sin ClientAliveInterval),
# y el listener del puerto (p. ej. 2222) queda ocupado para siempre.
#
# Esta limpieza mata sesiones sshd de deploy SIN pty (no interactivas) con más
# de MAX_AGE_SEC de vida. Los túneles legítimos duran máx 30 min (timeout del
# script open-admin-tunnel.sh) y los deploys por Actions ~10-20 min: una sesión
# sin pty de más de 2h es, con certeza, un colgado.
#
# Log: $HOME/tunnel-cleanup.log (solo registra cuando mata algo).
MAX_AGE_SEC=7200

log() { echo "$(date '+%F %T') $*" >> "$HOME/tunnel-cleanup.log"; }

for pid in $(pgrep -f "sshd: deploy"); do
  args=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null)
  case "$args" in
    *"[priv]"*)                    continue ;; # proceso root, se cierra solo
    *"sshd: deploy@pts/"*)         continue ;; # sesión interactiva, no tocar
  esac
  age=$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ')
  if [ -n "$age" ] && [ "$age" -gt "$MAX_AGE_SEC" ]; then
    if kill "$pid" 2>/dev/null; then
      log "matada sesión colgada pid=$pid (${age}s) args=$args"
    fi
  fi
done
