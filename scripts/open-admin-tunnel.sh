#!/bin/bash
# Túnel inverso TEMPORAL para acceso de administración a este server (testing).
# NO es un servicio permanente: corre en primer plano y se cierra al terminar (Ctrl+C)
# o al expirar el timeout. Usado para que el operador configure el server una vez.
#
# Ejecutar EN testing como root (o con sudo):
#   sudo bash scripts/open-admin-tunnel.sh [minutos]
#
# Requiere la key privada del túnel: /root/.ssh/tunnel_testing
set -e

TUNNEL_KEY=/root/.ssh/tunnel_testing
PROMETHEUS_HOST=186.182.214.12
PROMETHEUS_USER=deploy
TUNNEL_PORT=2222
MINUTES="${1:-30}"

if [ ! -f "$TUNNEL_KEY" ]; then
  echo "FALTA $TUNNEL_KEY — copiarla antes (scp desde la máquina del operador)"
  exit 1
fi
chmod 600 "$TUNNEL_KEY"

echo "Abriendo túnel temporal por $MINUTES min:"
echo "  prometheus:${TUNNEL_PORT} -> este server (ssh localhost:22)"
echo "  Presioná Ctrl+C para cerrarlo antes."
echo ""

timeout "${MINUTES}m" ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=accept-new \
  -N -R "${TUNNEL_PORT}:localhost:22" \
  -i "$TUNNEL_KEY" "${PROMETHEUS_USER}@${PROMETHEUS_HOST}"

echo "Túnel cerrado."
