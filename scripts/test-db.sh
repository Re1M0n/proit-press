#!/bin/bash
# Base de datos de test para el backend (Jest + Sequelize), aislada de toda base real.
#
# Por qué existe: `npm test` no usa una base aparte por sí solo. El runner
# (backend/scripts/run-tests.js) borra, recrea, migra y seedea la base que diga el
# entorno, y las suites de User/* hacen TRUNCATE de todas las tablas. Apuntado a una
# base con datos reales, eso la vacía — y `NODE_ENV=test` solo no alcanza: lo que
# aísla es `bootstrap.ts`, que con NODE_ENV=test carga `backend/.env.test` en lugar
# de `.env`. Ese archivo es la llave de todo, y lo escribe este script.
#
# La base corre como contenedor en prometheus, escuchando SOLO en 127.0.0.1 (nada
# expuesto a la LAN) y se llega por túnel SSH. Es MariaDB 10.11, la misma versión
# con la que corrió Press-Ticket en ese servidor, para que las 97 migraciones se
# comporten igual.
#
# Uso:
#   bash scripts/test-db.sh up      # levanta contenedor + túnel y escribe .env.test
#   bash scripts/test-db.sh status  # estado y prueba de conexión real
#   bash scripts/test-db.sh test    # up + build + npm test
#   bash scripts/test-db.sh down    # baja el túnel y detiene el contenedor
#   bash scripts/test-db.sh clean   # down + borra el contenedor y su volumen
#
# Variables (todas opcionales):
#   PROIT_TEST_SSH        destino SSH        (default deploy@192.168.100.22)
#   PROIT_TEST_SSH_KEY    llave privada      (default ~/.ssh/buffy_leadflow si existe)
#   PROIT_TEST_PORT       puerto local       (default 3307)
#   PROIT_TEST_CONTAINER  nombre contenedor  (default proit-mysql-test)
#   PROIT_TEST_IMAGE      imagen             (default mariadb:10.11)
#
# Las credenciales son descartables y a propósito están fijas: la base vive en un
# contenedor escuchando solo en loopback. No usar este entorno como base real.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
ENV_FILE="$BACKEND_DIR/.env.test"

SSH_DEST="${PROIT_TEST_SSH:-deploy@192.168.100.22}"
PORT="${PROIT_TEST_PORT:-3307}"
CONTAINER="${PROIT_TEST_CONTAINER:-proit-mysql-test}"
IMAGE="${PROIT_TEST_IMAGE:-mariadb:10.11}"

DB_NAME="press_ticket_test"
DB_USER="proit_test"
DB_PASS="proit_test"
DB_ROOT_PASS="proit_test_root"

if [ -n "${PROIT_TEST_SSH_KEY:-}" ]; then
  SSH_KEY="$PROIT_TEST_SSH_KEY"
elif [ -f "$HOME/.ssh/buffy_leadflow" ]; then
  SSH_KEY="$HOME/.ssh/buffy_leadflow"
else
  SSH_KEY=""
fi

is_windows_shell() {
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) return 0 ;;
    *) return 1 ;;
  esac
}

ssh_run() {
  if [ -n "$SSH_KEY" ]; then
    ssh -o BatchMode=yes -o ConnectTimeout=10 -o IdentitiesOnly=yes -i "$SSH_KEY" "$SSH_DEST" "$@"
  else
    ssh -o BatchMode=yes -o ConnectTimeout=10 "$SSH_DEST" "$@"
  fi
}

port_busy() {
  if is_windows_shell; then
    netstat -ano 2>/dev/null | grep "127.0.0.1:$PORT " | grep -q LISTENING
  else
    ss -ltn 2>/dev/null | grep -q ":$PORT "
  fi
}

tunnel_up() {
  if port_busy; then
    echo "túnel: ya estaba arriba en 127.0.0.1:$PORT"
    return 0
  fi
  local opts=(-f -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30
              -o ServerAliveCountMax=3 -o BatchMode=yes -o ConnectTimeout=10)
  if [ -n "$SSH_KEY" ]; then
    opts+=(-o IdentitiesOnly=yes -i "$SSH_KEY")
  fi
  ssh "${opts[@]}" -L "$PORT:127.0.0.1:$PORT" "$SSH_DEST"
  echo "túnel: 127.0.0.1:$PORT -> $SSH_DEST:$PORT"
}

tunnel_down() {
  if ! port_busy; then
    echo "túnel: no había nada escuchando en $PORT"
    return 0
  fi
  if is_windows_shell; then
    local pid
    pid="$(netstat -ano 2>/dev/null | grep "127.0.0.1:$PORT " | grep LISTENING | awk '{print $5}' | head -1)"
    if [ -n "${pid:-}" ]; then
      taskkill //PID "$pid" //F >/dev/null 2>&1 || true
      echo "túnel: cerrado (pid $pid)"
    fi
  else
    if command -v lsof >/dev/null 2>&1; then
      lsof -ti "tcp:$PORT" | xargs -r kill || true
      echo "túnel: cerrado"
    fi
  fi
}

write_env() {
  local force="${1:-}"
  if [ -f "$ENV_FILE" ] && [ "$force" != "--force" ]; then
    echo ".env.test: ya existe, no lo toco (usá 'env --force' para reescribirlo)"
    return 0
  fi
  cat > "$ENV_FILE" <<EOF
# Generado por scripts/test-db.sh — base de test descartable en contenedor.
# bootstrap.ts carga este archivo (en lugar de .env) cuando NODE_ENV=test.
NODE_ENV=test

DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=$PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_TIMEZONE=-03:00

# Valores de test: config/auth.ts tiene default, acá quedan explícitos.
JWT_SECRET=test-secret
JWT_REFRESH_SECRET=test-refresh-secret
EOF
  echo ".env.test: escrito en backend/.env.test (ignorado por git)"
}

container_up() {
  ssh_run bash -s <<EOF
set -e
if docker inspect $CONTAINER >/dev/null 2>&1; then
  if [ "\$(docker inspect -f '{{.State.Running}}' $CONTAINER)" = "true" ]; then
    echo "contenedor: $CONTAINER ya estaba corriendo"
  else
    docker start $CONTAINER >/dev/null
    echo "contenedor: $CONTAINER reiniciado"
  fi
else
  docker run -d --name $CONTAINER \\
    -p 127.0.0.1:$PORT:3306 \\
    -e MARIADB_DATABASE=$DB_NAME \\
    -e MARIADB_USER=$DB_USER \\
    -e MARIADB_PASSWORD=$DB_PASS \\
    -e MARIADB_ROOT_PASSWORD=$DB_ROOT_PASS \\
    -e TZ=America/Argentina/Buenos_Aires \\
    -v $CONTAINER-data:/var/lib/mysql \\
    $IMAGE \\
    --character-set-server=utf8mb4 \\
    --collation-server=utf8mb4_general_ci \\
    --sql-mode=STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION \\
    --max-connections=200 >/dev/null
  echo "contenedor: $CONTAINER creado"
fi
EOF
}

wait_ready() {
  echo -n "esperando la base "
  for _ in $(seq 1 60); do
    if ssh_run "docker exec $CONTAINER mariadb -u$DB_USER -p$DB_PASS -D $DB_NAME -e 'SELECT 1' >/dev/null 2>&1"; then
      echo " lista"
      return 0
    fi
    echo -n "."
    sleep 2
  done
  echo
  echo "ERROR: la base no respondió en 120s. Ver logs:"
  echo "  ssh $SSH_DEST 'docker logs --tail 30 $CONTAINER'"
  return 1
}

connect_test() {
  ( cd "$BACKEND_DIR" && node -e "
const mysql = require('mysql2');
const c = mysql.createConnection({host:'127.0.0.1', port:$PORT, user:'$DB_USER', password:'$DB_PASS', database:'$DB_NAME'});
c.query('SELECT VERSION() v', (e, r) => {
  if (e) { console.log('conexión: ERROR ' + e.code + ' — ' + e.message); process.exit(1); }
  console.log('conexión: OK (' + r[0].v + ')');
  c.end();
});" )
}

cmd_up() {
  echo "→ contenedor de test en $SSH_DEST"
  container_up
  wait_ready
  tunnel_up
  write_env
  echo
  echo "Listo. Corré las suites con:  cd backend && npm test"
}

cmd_status() {
  echo "=== contenedor ==="
  ssh_run "docker ps -a --filter name=$CONTAINER --format '{{.Names}} | {{.Status}} | {{.Ports}}'"
  echo "=== versión y base ==="
  ssh_run "docker exec $CONTAINER mariadb -u$DB_USER -p$DB_PASS -N -B -e \"SELECT VERSION(), (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME')\"" 2>/dev/null || echo "(no responde)"
  echo "=== túnel local ==="
  if port_busy; then
    echo "escuchando en 127.0.0.1:$PORT"
    connect_test
  else
    echo "sin túnel (corré: bash scripts/test-db.sh up)"
  fi
  echo "=== .env.test ==="
  [ -f "$ENV_FILE" ] && echo "presente: backend/.env.test" || echo "falta (lo escribe 'up')"
}

cmd_down() {
  tunnel_down
  ssh_run "docker stop $CONTAINER >/dev/null 2>&1 && echo 'contenedor: detenido (los datos quedan en el volumen)'" || true
}

cmd_clean() {
  tunnel_down
  ssh_run "docker rm -f $CONTAINER >/dev/null 2>&1; docker volume rm $CONTAINER-data >/dev/null 2>&1; echo 'contenedor y volumen borrados'"
}

cmd_test() {
  cmd_up
  echo
  echo "→ build + suites"
  ( cd "$BACKEND_DIR" && npm run build && npm test )
}

case "${1:-}" in
  up)      cmd_up ;;
  status)  cmd_status ;;
  test)    cmd_test ;;
  down)    cmd_down ;;
  clean)   cmd_clean ;;
  env)     write_env "${2:-}" ;;
  *)
    sed -n '2,40p' "$0"
    exit 1
    ;;
esac
