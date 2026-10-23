#!/bin/bash
# Smoke test post-deploy de ProIT Press.
# Verifica CORS del panel web (API y Socket.IO) y el refresh de sesión web por
# cookie jrt. No depende de servicios push.
#
# Uso: bash scripts/smoke-test.sh
# Overrides: BACKEND_URL, WEB_ORIGIN, SMOKE_EMAIL y SMOKE_PASSWORD.
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO/backend/.env"

read_env() {
  [ -f "$ENV_FILE" ] || return 0
  grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d '=' -f2- | tr -d '[:space:]'
}

PORT="$(read_env PORT)"; PORT="${PORT:-4000}"
BACKEND_URL="${BACKEND_URL:-http://localhost:$PORT}"
BACKEND_URL="${BACKEND_URL%/}"
WEB_ORIGIN="${WEB_ORIGIN:-$(read_env FRONTEND_URL)}"
WEB_ORIGIN="${WEB_ORIGIN%/}"
SMOKE_EMAIL="${SMOKE_EMAIL:-$(read_env SMOKE_EMAIL)}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-$(read_env SMOKE_PASSWORD)}"

FAIL=0
ok()   { echo "  OK    $1"; }
bad()  { echo "  FALLA $1"; FAIL=1; }
skip() { echo "  OMITE $1"; }

probe() {
  local origin="$1" url="$2" headers status acao
  headers="$(curl -sS -m 15 -D - -o /dev/null -H "Origin: $origin" "$url" 2>/dev/null)"
  status="$(printf '%s' "$headers" | head -n1 | tr -d '\r' | awk '{print $2}')"
  acao="$(printf '%s' "$headers" | grep -i '^access-control-allow-origin:' | head -n1 | tr -d '\r' | cut -d ' ' -f2-)"
  echo "${status}|${acao}"
}

check_cors() {
  local name="$1" origin="$2" url="$3" want="$4" result status acao
  result="$(probe "$origin" "$url")"
  status="${result%%|*}"
  acao="${result#*|}"
  if [ "$status" != "$want" ]; then
    bad "$name: HTTP ${status:-sin respuesta} (se esperaba $want)"
    return
  fi
  if [ "$acao" != "$origin" ]; then
    bad "$name: sin Access-Control-Allow-Origin para $origin (recibido: ${acao:-ninguno})"
    return
  fi
  ok "$name"
}

echo "Smoke test de ProIT Press"
echo "  backend: $BACKEND_URL"
echo "  panel:   ${WEB_ORIGIN:-<no configurado>}"

if ! command -v curl >/dev/null 2>&1; then
  bad "curl no está instalado: no se puede ejecutar el smoke test"
  exit 1
fi

if [ -n "$WEB_ORIGIN" ]; then
  echo "CORS — API REST"
  check_cors "panel web -> /personalizations" "$WEB_ORIGIN" "$BACKEND_URL/personalizations" 200
  echo
  echo "CORS — Socket.IO"
  check_cors "panel web -> /socket.io" "$WEB_ORIGIN" "$BACKEND_URL/socket.io/?EIO=4&transport=polling" 200
else
  skip "CORS web: FRONTEND_URL no está configurado en backend/.env"
fi
echo

echo "Refresh token web (cookie jrt)"
if [ -z "${SMOKE_EMAIL:-}" ] || [ -z "${SMOKE_PASSWORD:-}" ]; then
  skip "refresh web: definí SMOKE_EMAIL y SMOKE_PASSWORD para verificarlo"
else
  umask 077
  temp_dir="$(mktemp -d)"
  login_headers="$temp_dir/login.headers"
  login_body="$temp_dir/login.body"
  refresh_header="$temp_dir/refresh.header"
  trap 'rm -f "$login_headers" "$login_body" "$refresh_header"; rmdir "$temp_dir" 2>/dev/null || true' EXIT

  login_status="$(curl -sS -m 15 -D "$login_headers" -o "$login_body" -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"$SMOKE_PASSWORD\"}" \
    "$BACKEND_URL/auth/login" 2>/dev/null)"
  refresh_cookie="$(grep -i '^set-cookie: jrt=' "$login_headers" | head -n1 | sed -E 's/^[^=]+=([^;]*).*/\1/' | tr -d '\r')"

  if [ "$login_status" != "200" ]; then
    bad "refresh web: el login devolvió HTTP ${login_status:-sin respuesta}"
  elif [ -z "$refresh_cookie" ]; then
    bad "refresh web: el login no devolvió la cookie jrt"
  else
    ok "refresh web: el login devolvió la cookie jrt"
    printf 'Cookie: jrt=%s\n' "$refresh_cookie" > "$refresh_header"
    refresh_status="$(curl -sS -m 15 -o /dev/null -w '%{http_code}' -X POST \
      -H "@$refresh_header" "$BACKEND_URL/auth/refresh_token" 2>/dev/null)"
    if [ "$refresh_status" = "200" ]; then
      ok "refresh web: /auth/refresh_token acepta la cookie jrt"
    else
      bad "refresh web: /auth/refresh_token devolvió HTTP ${refresh_status:-sin respuesta}"
    fi
  fi
  rm -f "$login_headers" "$login_body" "$refresh_header"
  rmdir "$temp_dir" 2>/dev/null || true
  trap - EXIT
fi
echo

if [ "$FAIL" -ne 0 ]; then
  echo "SMOKE TEST: FALLÓ — revisá lo anterior antes de dar por bueno el deploy."
  exit 1
fi

echo "SMOKE TEST: OK"
