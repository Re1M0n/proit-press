#!/bin/bash
# Script de deploy ejecutado por GitHub Actions en el servidor destino.
# Asume: repo en /home/deploy/Press-Ticket, servicios pm2 itn-backend e itn-frontend.
set -e

cd /home/deploy/Press-Ticket
echo "== Actualizando desde main =="
git fetch origin
git reset --hard origin/main
echo "== HEAD: $(git rev-parse --short HEAD) =="

echo "== Backend: dependencias + compilación =="
cd backend
npm install --no-audit --no-fund
# Los parches locales de whatsapp-web.js (envío de media y edición de mensajes)
# se aplican en el postinstall. Si faltaran, el panel se queda sin poder enviar
# imágenes/videos/audios: mejor cortar el deploy que publicar eso.
node scripts/patch-wwebjs.js --check
npx tsc
# Migraciones antes de reiniciar: si el código nuevo espera una columna que
# todavía no existe, el panel deja de procesar mensajes. Falla -> corta el
# deploy sin reiniciar (el proceso viejo sigue atendiendo con la base vieja).
echo "== Migraciones de base de datos =="
npx sequelize-cli db:migrate
# Prune: elimina compilados huérfanos (fuentes borradas) que tsc no limpia
find dist -name "*.js" | while read -r f; do
  src="src/${f#dist/}"
  [ -f "${src%.js}.ts" ] || [ -f "${src%.js}.tsx" ] || rm -f "$f"
done
pm2 restart itn-backend --update-env

echo "== Frontend: dependencias + build =="
cd ../frontend
npm install --no-audit --no-fund
# Compila a build-new y recién después reemplaza build/: CRA vacía el directorio
# de salida al empezar, así que buildear directo sobre build/ deja el panel en
# 500 durante todo el build.
rm -rf build-new
BUILD_PATH=build-new CI=false npm run build
rm -rf build-old
if [ -d build ]; then mv build build-old; fi
mv build-new build
rm -rf build-old

echo "== Verificación =="
sleep 5
pm2 list | grep itn-
curl -s -o /dev/null -w "frontend HTTP %{http_code}\n" http://localhost:3000/

# Smoke test: CORS del panel web y refresh de sesión por cookie. Si la web deja
# de conectar o el refresh web falla, el deploy corta en vez de publicarlo igual.
echo "== Smoke test =="
bash ../scripts/smoke-test.sh

echo "== DEPLOY OK =="
