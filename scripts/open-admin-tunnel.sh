#!/bin/bash
# Túnel inverso TEMPORAL para acceso de administración a este server (testing).
# NO es un servicio permanente: corre en primer plano y se cierra al terminar (Ctrl+C)
# o al expirar el timeout.
#
# Ejecutar EN testing (la VM Ubuntu, dentro de la sesión RustDesk), como el usuario
# deploy (sin sudo — usa la key por defecto ~/.ssh/id_ed25519, que es la autorizada
# en prometheus como "theyormn@gmail.com"):
#   bash scripts/open-admin-tunnel.sh [minutos]
#
# Opcional: si la key no está en la ruta por defecto, pasarla con -k:
#   sudo bash scripts/open-admin-tunnel.sh -k /root/.ssh/tunnel_testing 30
set -e

PROMETHEUS_HOST=186.182.214.12
PROMETHEUS_USER=deploy
TUNNEL_PORT=2222
MINUTES=30
KEY_ARGS=()

while [ $# -gt 0 ]; do
  case "$1" in
    -k) KEY_ARGS=(-i "$2"); shift 2 ;;
    *)  MINUTES="$1"; shift ;;
  esac
done

# Guard: el túnel SOLO funciona si se ejecuta en la VM Ubuntu (testing).
# Si esto corre en una PC con Windows/Git Bash, el -R apunta a localhost:22 local
# (el sshd de Windows) y el túnel queda apuntando a la máquina equivocada.
if ! grep -q Ubuntu /etc/os-release 2>/dev/null; then
  echo "ERROR: este script debe correr DENTRO de testing (VM Ubuntu)."
  echo "Verificá con: cat /etc/os-release | head -1"
  exit 1
fi
if [ ! -f /etc/os-release ]; then
  echo "ERROR: sin /etc/os-release — no parece Ubuntu."
  exit 1
fi

echo "Abriendo túnel temporal por $MINUTES min desde $(hostname):"
echo "  prometheus:${TUNNEL_PORT} -> este server (ssh localhost:22)"
echo "  Presioná Ctrl+C para cerrarlo antes."
echo ""

timeout "${MINUTES}m" ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=accept-new \
  "${KEY_ARGS[@]}" -N -R "${TUNNEL_PORT}:localhost:22" \
  "${PROMETHEUS_USER}@${PROMETHEUS_HOST}"

echo "Túnel cerrado."
