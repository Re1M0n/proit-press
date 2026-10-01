#!/bin/bash
# Smoke test post-deploy de ProIT Press.
#
# Verifica lo que ya se rompió una vez en producción y no debe volver a
# hacerlo en silencio:
#   1. CORS de la API REST para el panel web y para la app Android (el WebView
#      de Capacitor usa el origen https://localhost).
#   2. CORS de socket.io para esos mismos orígenes.
#   3. Refresh token nativo: el login con X-Client-App debe devolver
#      X-Refresh-Token, y ese header debe seguir sirviendo en
#      /auth/refresh_token (en el WebView de Android no hay cookies).
#
# Uso:
#   bash scripts/smoke-test.sh
#
# Overrides por entorno:
#   BACKEND_URL     backend a probar      (default: http://localhost:$PORT)
#   WEB_ORIGIN      origen del panel web  (default: FRONTEND_URL de backend/.env)
#   APP_ORIGIN      origen de la app      (default: https://localhost)
#   SMOKE_EMAIL / SMOKE_PASSWORD  usuario de prueba para el refresh nativo y
#                                 para el estado del push (si faltan, se omiten)
#   SMOKE_REQUIRE_PUSH=1          trata "Firebase no configurado" como fallo
#
# Sale con código 0 si todo pasa y 1 si alguna comprobación falla, para que el
# deploy pueda cortar en vez de publicar un backend que rompe la app.
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO/backend/.env"

read_env() {
  [ -f "$ENV_FILE" ] || return 0
  grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d '=' -f2- | tr -d '[:space:]'
}

PORT="$(read_env PORT)"; PORT="${PORT:-4000}"
# Por defecto se prueba el backend local: el deploy corre en el servidor y no
# debe depender de DNS público ni del hairpin del router. El CORS se decide por
# el header Origin, así que alcanza con pegarle a localhost.
BACKEND_URL="${BACKEND_URL:-http://localhost:$PORT}"
BACKEND_URL="${BACKEND_URL%/}"
WEB_ORIGIN="${WEB_ORIGIN:-$(read_env FRONTEND_URL)}"
WEB_ORIGIN="${WEB_ORIGIN%/}"
APP_ORIGIN="${APP_ORIGIN:-https://localhost}"

FAIL=0
ok()   { echo "  OK    $1"; }
bad()  { echo "  FALLA $1"; FAIL=1; }
warn() { echo "  AVISO $1"; }
skip() { echo "  OMITE $1"; }

# Devuelve "<status>|<Access-Control-Allow-Origin>" para una URL con un Origin.
probe() {
  local origin="$1" url="$2" headers status acao
  headers="$(curl -sS -m 15 -D - -o /dev/null -H "Origin: $origin" "$url" 2>/dev/null)"
  status="$(printf '%s' "$headers" | head -n1 | tr -d '\r' | awk '{print $2}')"
  acao="$(printf '%s' "$headers" | grep -i '^access-control-allow-origin:' | head -n1 | tr -d '\r' | cut -d ' ' -f2-)"
  echo "${status}|${acao}"
}

check_cors() { # <nombre> <origin> <url> <status esperado>
  local name="$1" origin="$2" url="$3" want="$4" res status acao
  res="$(probe "$origin" "$url")"
  status="${res%%|*}"
  acao="${res#*|}"
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
echo "  backend:     $BACKEND_URL"
echo "  app Android: $APP_ORIGIN"
echo "  panel web:   ${WEB_ORIGIN:-<no configurado>}"
echo

if ! command -v curl >/dev/null 2>&1; then
  bad "curl no está instalado: no se puede ejecutar el smoke test"
  exit 1
fi

echo "CORS — API REST"
check_cors "app Android -> /personalizations" "$APP_ORIGIN" "$BACKEND_URL/personalizations" 200
if [ -n "$WEB_ORIGIN" ]; then
  check_cors "panel web -> /personalizations" "$WEB_ORIGIN" "$BACKEND_URL/personalizations" 200
else
  skip "panel web: FRONTEND_URL no está configurado en backend/.env"
fi
echo

echo "CORS — socket.io"
check_cors "app Android -> /socket.io" "$APP_ORIGIN" "$BACKEND_URL/socket.io/?EIO=4&transport=polling" 200
if [ -n "$WEB_ORIGIN" ]; then
  check_cors "panel web -> /socket.io" "$WEB_ORIGIN" "$BACKEND_URL/socket.io/?EIO=4&transport=polling" 200
else
  skip "panel web: FRONTEND_URL no está configurado en backend/.env"
fi
echo

header_value() { # <archivo de headers> <nombre de header>
  grep -i "^$2:" "$1" | head -n1 | tr -d '\r' | cut -d ' ' -f2-
}

echo "Refresh token nativo (app Android)"
if [ -z "${SMOKE_EMAIL:-}" ] || [ -z "${SMOKE_PASSWORD:-}" ]; then
  skip "refresh nativo: definí SMOKE_EMAIL y SMOKE_PASSWORD para verificarlo"
  echo
  echo "Push móvil"
  skip "push: definí SMOKE_EMAIL y SMOKE_PASSWORD para verificar si Firebase está configurado"
else
  login_headers="$(mktemp)"
  login_body="$(curl -sS -m 15 -D "$login_headers" -X POST \
    -H 'Content-Type: application/json' \
    -H 'X-Client-App: proit-press-android' \
    --data "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"$SMOKE_PASSWORD\"}" \
    "$BACKEND_URL/auth/login" 2>/dev/null)"
  rt="$(header_value "$login_headers" 'x-refresh-token')"
  rm -f "$login_headers"

  if [ -z "$rt" ]; then
    bad "refresh nativo: el login no devolvió X-Refresh-Token (la app Android no podría mantener la sesión)"
  else
    ok "refresh nativo: el login devuelve X-Refresh-Token"
    refresh_headers="$(mktemp)"
    curl -sS -m 15 -D "$refresh_headers" -o /dev/null -X POST \
      -H 'X-Client-App: proit-press-android' \
      -H "X-Refresh-Token: $rt" \
      "$BACKEND_URL/auth/refresh_token" >/dev/null 2>&1
    rt2="$(header_value "$refresh_headers" 'x-refresh-token')"
    rm -f "$refresh_headers"
    if [ -z "$rt2" ]; then
      bad "refresh nativo: /auth/refresh_token no devolvió X-Refresh-Token"
    else
      ok "refresh nativo: /auth/refresh_token acepta el header X-Refresh-Token"
    fi
  fi
  echo
  echo "Push móvil"
  access_token="$(printf '%s' "$login_body" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  if [ -z "$access_token" ]; then
    warn "push: no se pudo iniciar sesión para consultar /push-notifications/status"
  else
    push_body="$(curl -sS -m 15 -H "Authorization: Bearer $access_token" "$BACKEND_URL/push-notifications/status" 2>/dev/null)"
    configured="$(printf '%s' "$push_body" | sed -n 's/.*"configured":\(true\|false\).*/\1/p')"
    if [ "$configured" = "true" ]; then
      ok "push: Firebase está configurado en el servidor"
    elif [ "$configured" = "false" ]; then
      if [ "${SMOKE_REQUIRE_PUSH:-0}" = "1" ]; then
        bad "push: Firebase NO configurado (definí FIREBASE_SERVICE_ACCOUNT o GOOGLE_APPLICATION_CREDENTIALS)"
      else
        warn "push: Firebase NO configurado en el servidor: la app no va a recibir notificaciones"
      fi
    else
      warn "push: /push-notifications/status no respondió como se esperaba (¿está desplegado el backend nuevo?)"
    fi
  fi
fi
echo

if [ "$FAIL" -ne 0 ]; then
  echo "SMOKE TEST: FALLÓ — revisá lo anterior antes de dar por bueno el deploy."
  exit 1
fi

echo "SMOKE TEST: OK"
