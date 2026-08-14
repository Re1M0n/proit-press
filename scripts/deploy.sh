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
npx tsc
# Prune: elimina compilados huérfanos (fuentes borradas) que tsc no limpia
find dist -name "*.js" | while read -r f; do
  src="src/${f#dist/}"
  [ -f "${src%.js}.ts" ] || [ -f "${src%.js}.tsx" ] || rm -f "$f"
done
pm2 restart itn-backend --update-env

echo "== Frontend: dependencias + build =="
cd ../frontend
npm install --no-audit --no-fund
CI=false npm run build

echo "== Verificación =="
sleep 5
pm2 list | grep itn-
curl -s -o /dev/null -w "frontend HTTP %{http_code}\n" http://localhost:3000/
echo "== DEPLOY OK =="
