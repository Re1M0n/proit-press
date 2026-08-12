#!/bin/bash
# ============================================================
# restore.sh — Restaura un backup de ProIT CRM en este servidor
# Debe ejecutarse DESPUÉS de INSTALL.sh (la BD y la app ya existen)
# Uso:   sudo bash restore.sh /ruta/al/backup
#        La carpeta debe contener database.sql.gz [public.tar.gz] [sessions.tar.gz]
# ============================================================
set -e

BACKUP_DIR="${1:-/home/deploy/backups}"
APP_DIR="${PROIT_APP_DIR:-/home/deploy/Press-Ticket}"

if [ ! -f "$BACKUP_DIR/database.sql.gz" ]; then
    echo "Error: no se encontró $BACKUP_DIR/database.sql.gz"
    exit 1
fi

echo "==> Restaurando ProIT CRM desde $BACKUP_DIR"

# 1. Base de datos
echo "==> 1/3 Base de datos"
DB_NAME="$(grep '^DB_NAME=' "$APP_DIR/backend/.env" | cut -d= -f2-)"
DB_USER="$(grep '^DB_USER=' "$APP_DIR/backend/.env" | cut -d= -f2-)"
DB_PASS="$(grep '^DB_PASS=' "$APP_DIR/backend/.env" | cut -d= -f2-)"
MYSQL_PWD="$DB_PASS" mysql -u "$DB_USER" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
zcat "$BACKUP_DIR/database.sql.gz" | MYSQL_PWD="$DB_PASS" mysql -u "$DB_USER" "$DB_NAME"
echo "    -> $DB_NAME restaurada"

# 2. Media
echo "==> 2/3 Media"
if [ -f "$BACKUP_DIR/public.tar.gz" ]; then
    mkdir -p "$APP_DIR/backend/public"
    tar xzf "$BACKUP_DIR/public.tar.gz" -C "$APP_DIR/backend"
    chown -R deploy:deploy "$APP_DIR/backend/public"
    echo "    -> media restaurado"
else
    echo "    (sin public.tar.gz, se omite)"
fi

# 3. Sesiones de WhatsApp
echo "==> 3/3 Sesiones WhatsApp"
if [ -f "$BACKUP_DIR/sessions.tar.gz" ]; then
    tar xzf "$BACKUP_DIR/sessions.tar.gz" -C "$APP_DIR/backend"
    chown -R deploy:deploy "$APP_DIR/backend/.wwebjs_auth" "$APP_DIR/backend/.wwebjs_cache" 2>/dev/null || true
    echo "    -> sesiones restauradas (las líneas quedan conectadas sin QR)"
else
    echo "    (sin sessions.tar.gz — habrá que escanear QR de nuevo)"
fi

echo ""
echo "==> Reiniciando servicios"
PM2_BACK="$(grep '^PM2_BACKEND=' "$APP_DIR/backend/.env" | cut -d= -f2-)"
PM2_FRONT="$(grep '^PM2_FRONTEND=' "$APP_DIR/backend/.env" | cut -d= -f2-)"
su - deploy -c "pm2 restart ${PM2_BACK:-itn-backend} ${PM2_FRONT:-itn-frontend}"
sleep 2
echo "==> Listo. Verificá con: pm2 status"
