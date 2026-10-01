#!/bin/bash
# Instala y registra un self-hosted runner de GitHub Actions en este servidor.
#
# Uso:  bash scripts/instalar-runner.sh <TOKEN_DE_REGISTRO> [ETIQUETA]
#
# Por qué existe: el 22/09/2026 se cerró el puerto 22 a Internet (ver
# ITN/NOTAS-endurecimiento.md: "ese puerto ya no es alcanzable desde Internet"),
# así que los runners de GitHub dejaron de poder entrar por SSH a prometheus y
# el deploy con appleboy/ssh-action falla. Un runner dentro de la LAN despliega
# sin necesitar ningún puerto entrante ni reabrir el SSH.
#
# El token se saca de GitHub -> repo -> Settings -> Actions -> Runners ->
# "New self-hosted runner". Dura alrededor de una hora y se pasa por argumento:
# no se guarda en ningún archivo.
#
# Supervisión con pm2 (y no con svc.sh) porque svc.sh instala un servicio systemd
# de sistema y eso necesita root. pm2 ya corre como `deploy`, ya arranca solo al
# bootear (pm2-deploy.service) y es el mismo mecanismo que usan itn-backend e
# itn-frontend, así que no hace falta sudo en ningún paso.
set -euo pipefail

REPO_SLUG="${REPO_SLUG:-Re1M0n/proit-press}"
RUNNER_VERSION="${RUNNER_VERSION:-2.337.0}"
RUNNER_DIR="${RUNNER_DIR:-$HOME/actions-runner}"
PM2_NAME="${PM2_NAME:-github-runner}"

TOKEN="${1:-}"
LABEL="${2:-prometheus}"

if [ -z "$TOKEN" ]; then
  cat <<EOF
Falta el token de registro.

  Uso: bash $0 <TOKEN_DE_REGISTRO> [ETIQUETA]

Generalo en (dura ~1 hora):
  https://github.com/$REPO_SLUG/settings/actions/runners/new

Se pasa como argumento y nada más: este script no lo escribe en disco.
EOF
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "ERROR: no encuentro pm2 en el PATH. Es el supervisor que usa el resto de los servicios."
  exit 1
fi

# liblttng-ust sólo hace falta para la telemetría del runner: si falta, avisa y
# sigue, porque el runner funciona igual.
if ! ldconfig -p 2>/dev/null | grep -q liblttng-ust; then
  echo "AVISO: falta liblttng-ust (telemetría). Se puede instalar con:"
  echo "       sudo apt-get install -y liblttng-ust1"
fi

# Idempotente: si el runner ya está descomprimido, lo reusa.
if [ ! -x "$RUNNER_DIR/config.sh" ]; then
  echo "== Descargando actions-runner v$RUNNER_VERSION =="
  mkdir -p "$RUNNER_DIR"
  TARBALL="$(mktemp /tmp/actions-runner-XXXXXX.tar.gz)"
  curl -sL -o "$TARBALL" \
    "https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/actions-runner-linux-x64-$RUNNER_VERSION.tar.gz"
  tar xzf "$TARBALL" -C "$RUNNER_DIR"
  rm -f "$TARBALL"
fi

cd "$RUNNER_DIR"

# --replace: si ya había un runner con este nombre, lo reemplaza en vez de fallar
# (evita quedar con un runner muerto registrado y sin forma de sacarlo sin UI).
echo "== Registrando el runner en $REPO_SLUG con la etiqueta '$LABEL' =="
./config.sh \
  --url "https://github.com/$REPO_SLUG" \
  --token "$TOKEN" \
  --name "$(hostname)-gh" \
  --labels "$LABEL" \
  --work "_work" \
  --unattended \
  --replace

echo "== Arrancando el runner bajo pm2 como '$PM2_NAME' =="
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
pm2 start "$RUNNER_DIR/run.sh" --name "$PM2_NAME" --interpreter bash
pm2 save

echo
echo "Listo. Para comprobarlo:"
echo "  pm2 logs $PM2_NAME --lines 20        # tiene que decir 'Listening for Jobs'"
echo "  https://github.com/$REPO_SLUG/settings/actions/runners"
echo
echo "El workflow todavía tiene que pedirlo con:  runs-on: [self-hosted, $LABEL]"
