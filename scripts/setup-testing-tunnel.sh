#!/bin/bash
# Setup del túnel inverso testing -> prometheus (para deploy desde GitHub Actions)
# Ejecutar EN el server testing, como root:
#   sudo bash setup-testing-tunnel.sh
#
# Requiere (se copian aparte):
#   /root/.ssh/tunnel_testing            -> key privada del túnel (la entrega el operador)
#   la deploy key pública de testing     -> se agrega al authorized_keys del usuario deploy
set -e

TUNNEL_KEY=/root/.ssh/tunnel_testing
PROMETHEUS_HOST=186.182.214.12
PROMETHEUS_USER=deploy
TUNNEL_PORT=2222

if [ ! -f "$TUNNEL_KEY" ]; then
  echo "FALTA $TUNNEL_KEY (key privada del túnel)"
  exit 1
fi
chmod 600 "$TUNNEL_KEY"

echo "== Instalando autossh =="
apt-get update -qq
apt-get install -y -qq autossh

echo "== Creando servicio systemd =="
cat > /etc/systemd/system/reverse-tunnel.service <<EOF
[Unit]
Description=Túnel SSH inverso hacia prometheus (relay de deploy)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Restart=always
RestartSec=10
Environment=AUTOSSH_GATETIME=0
ExecStart=/usr/bin/autossh -M 0 -N -R ${TUNNEL_PORT}:localhost:22 \\
  -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \\
  -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=accept-new \\
  -i ${TUNNEL_KEY} ${PROMETHEUS_USER}@${PROMETHEUS_HOST}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable reverse-tunnel.service
systemctl restart reverse-tunnel.service
sleep 3
systemctl --no-pager status reverse-tunnel.service | head -8

echo "== Deploy key de testing en authorized_keys del usuario deploy =="
if id deploy >/dev/null 2>&1; then
  mkdir -p /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  touch /home/deploy/.ssh/authorized_keys
  chmod 600 /home/deploy/.ssh/authorized_keys
  # agregar acá la línea pública de la deploy key de testing si se provee como 2do argumento
  if [ -n "$2" ] && grep -qF "$2" /home/deploy/.ssh/authorized_keys; then
    echo "deploy key ya estaba en authorized_keys"
  elif [ -n "$2" ]; then
    echo "$2" >> /home/deploy/.ssh/authorized_keys
    echo "deploy key agregada a /home/deploy/.ssh/authorized_keys"
  fi
else
  echo "AVISO: no existe el usuario deploy — crearlo o adaptar el path del repo"
fi

echo "== Verificando el repo =="
if [ -d /home/deploy/Press-Ticket/.git ]; then
  cd /home/deploy/Press-Ticket
  git fetch origin 2>/dev/null && git rev-parse --short HEAD || echo "repo sin fetch"
else
  echo "AVISO: no hay repo en /home/deploy/Press-Ticket — clonar:"
  echo "  git clone git@github.com:Re1M0n/proit-press.git /home/deploy/Press-Ticket"
fi

echo "== SETUP LISTO =="
