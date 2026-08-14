#!/bin/bash
# Migra el auto-deploy de testing (pressticket) a release-based y elimina el
# hotfix local de Telegram (telegram-noreply.patch). La auto-respuesta de
# saludo ya está DESACTIVADA en main (se revertió el feature), así que el
# parche local quedó obsoleto y debe quitarse para que no rompa el deploy.
#
# Correr EN testing, como el usuario deploy:
#   bash /home/deploy/proit-press/scripts/migrate-testing-releases.sh
#
# Efectos:
#   1. /home/deploy/.autodeploy/auto-deploy.sh  -> versión release-based (del repo)
#   2. /home/deploy/.autodeploy/deploy.sh       -> sin la re-aplicación de telegram-noreply.patch
#   3. cron del usuario deploy                  -> pasa AUTODEPLOY_REPO y AUTODEPLOY_DEPLOY
set -e

REPO=/home/deploy/proit-press
AUTODEPLOY=/home/deploy/.autodeploy

if [ ! -d "$REPO/.git" ]; then
  echo "ERROR: no hay repo en $REPO"
  exit 1
fi
if [ ! -d "$AUTODEPLOY" ]; then
  echo "ERROR: no existe $AUTODEPLOY (¿está instalado el auto-deploy?)"
  exit 1
fi

cd "$REPO"
git fetch origin --quiet --tags --force || true

echo "== 1) auto-deploy release-based =="
cp scripts/auto-deploy.sh "$AUTODEPLOY/auto-deploy.sh"
chmod +x "$AUTODEPLOY/auto-deploy.sh"
echo "Copiada la versión release-based a $AUTODEPLOY/auto-deploy.sh"

echo "== 2) quitar el hotfix de Telegram (auto-respuesta desactivada en main) =="
if grep -q "telegram-noreply.patch" "$AUTODEPLOY/deploy.sh"; then
  sed -i '/telegram-noreply.patch/d' "$AUTODEPLOY/deploy.sh"
  echo "Quitada la línea de telegram-noreply.patch de $AUTODEPLOY/deploy.sh"
else
  echo "deploy.sh no referenciaba el patch (ya limpio)"
fi
rm -f "$AUTODEPLOY/telegram-noreply.patch"
echo "Eliminado $AUTODEPLOY/telegram-noreply.patch (si existía)"

echo "== 3) cron con los overrides del repo adaptado =="
CRON_LINE="*/3 * * * * AUTODEPLOY_REPO=$REPO AUTODEPLOY_DEPLOY=$AUTODEPLOY/deploy.sh $AUTODEPLOY/auto-deploy.sh >/dev/null 2>&1"
crontab -l 2>/dev/null | grep -v "auto-deploy.sh" > /tmp/migrate_cron.tmp || true
echo "$CRON_LINE" >> /tmp/migrate_cron.tmp
crontab /tmp/migrate_cron.tmp
rm -f /tmp/migrate_cron.tmp

echo ""
echo "== Cron final =="
crontab -l | grep auto-deploy
echo ""
echo "== LISTO =="
echo "Próximo ciclo: solo despliega si aparece una release (tag v*) nueva en GitHub."
echo "La auto-respuesta de Telegram queda DESACTIVADA en todas las instancias"
echo "(el código de main ya no la trae; el parche local se quitó porque sobra)."
echo "Log: /home/deploy/auto-deploy.log"
