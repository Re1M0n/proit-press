#!/bin/bash
# Instala el cron de auto-deploy para el usuario dueño del repo en el server testing.
# Ejecutar en testing como root:
#   sudo bash scripts/setup-auto-deploy.sh
#
# Instala: crontab del usuario deploy con scripts/auto-deploy.sh cada 3 minutos.
set -e

DEPLOY_USER="${1:-deploy}"
REPO="/home/$DEPLOY_USER/Press-Ticket"
INTERVAL="${2:-*/3}"

if [ ! -d "$REPO/.git" ]; then
  echo "ERROR: no hay repo en $REPO"
  exit 1
fi
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  echo "ERROR: no existe el usuario $DEPLOY_USER"
  exit 1
fi

chmod +x "$REPO/scripts/auto-deploy.sh" "$REPO/scripts/deploy.sh"

CRON_LINE="$INTERVAL * * * * $REPO/scripts/auto-deploy.sh >/dev/null 2>&1"

# Reemplazar la línea previa de auto-deploy si existía
crontab -u "$DEPLOY_USER" -l 2>/dev/null | grep -v "auto-deploy.sh" > /tmp/auto_deploy_cron.tmp || true
echo "$CRON_LINE" >> /tmp/auto_deploy_cron.tmp
crontab -u "$DEPLOY_USER" /tmp/auto_deploy_cron.tmp
rm -f /tmp/auto_deploy_cron.tmp

echo "== Cron instalado para $DEPLOY_USER =="
crontab -u "$DEPLOY_USER" -l | grep auto-deploy

echo ""
echo "Kill-switch: touch $REPO/.autodeploy-off  (para pausar)"
echo "Log: /home/$DEPLOY_USER/auto-deploy.log"
echo "== LISTO =="
