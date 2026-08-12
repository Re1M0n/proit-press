#!/bin/bash
# ============================================================
# backup.sh — Respaldo completo de ProIT CRM (solo terminal)
# Genera: dump de BD + media (backend/public) + sesiones
# Uso:   sudo bash backup.sh [directorio_destino]
#        (por defecto: /home/deploy/backups)
# ============================================================
set -e

DEST="${1:-/home/deploy/backups}"
APP_DIR="${PROIT_APP_DIR:-/home/deploy/Press-Ticket}"
STAMP="$(date +%Y%m%d_%H%M)"
OUT="$DEST/proit_$STAMP"
mkdir -p "$OUT"

echo "==> Backup de ProIT CRM en $OUT"

# 1. Base de datos (dump comprimido)
echo "==> 1/3 Base de datos (mysqldump)"
DB_NAME="$(grep '^DB_NAME=' "$APP_DIR/backend/.env" | cut -d= -f2-)"
DB_USER="$(grep '^DB_USER=' "$APP_DIR/backend/.env" | cut -d= -f2-)"
DB_PASS="$(grep '^DB_PASS=' "$APP_DIR/backend/.env" | cut -d= -f2-)"
MYSQL_PWD="$DB_PASS" mysqldump -u "$DB_USER" --single-transaction --routines --triggers "$DB_NAME" 2>/dev/null \
    | gzip > "$OUT/database.sql.gz"
echo "    -> $OUT/database.sql.gz ($(du -h "$OUT/database.sql.gz" | cut -f1))"

# 2. Media (fotos, audios, archivos de tickets)
echo "==> 2/3 Media (backend/public)"
if [ -d "$APP_DIR/backend/public" ]; then
    tar czf "$OUT/public.tar.gz" -C "$APP_DIR/backend" public
    echo "    -> $OUT/public.tar.gz ($(du -h "$OUT/public.tar.gz" | cut -f1))"
else
    echo "    (sin carpeta public, se omite)"
fi

# 3. Sesiones de WhatsApp (opcional, contiene credenciales)
echo "==> 3/3 Sesiones WhatsApp (wwebjs)"
if [ -d "$APP_DIR/backend/.wwebjs_auth" ]; then
    tar czf "$OUT/sessions.tar.gz" -C "$APP_DIR/backend" .wwebjs_auth .wwebjs_cache
    echo "    -> $OUT/sessions.tar.gz ($(du -h "$OUT/sessions.tar.gz" | cut -f1))"
else
    echo "    (sin sesiones, se omite)"
fi

echo ""
echo "==> Backup completo: $OUT"echo "    Copiá la carpeta al servidor destino con:"
    echo "    scp -r $OUT user@destino:/home/deploy/"
    echo ""
    echo "    Si la app está en otra carpeta, indicá: PROIT_APP_DIR=/ruta/app bash backup.sh"
