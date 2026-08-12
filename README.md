# ProIT CRM®

## Acerca de

### Descripción del Sistema ProIT CRM®

El sistema multicanal "ProIT CRM" fue diseñado para ofrecer una solución eficiente e integrada de soporte al cliente, facilitando la comunicación y la gestión de tickets de atención. Este sistema innovador permite a las empresas automatizar y optimizar sus procesos de atención al cliente a través de múltiples canales de comunicación, como WhatsApp y Telegram.

## Funcionalidades Principales

### 1. Gestión de Tickets:

- Creación, seguimiento y resolución de tickets de soporte.
- Sistema de prioridad para la organización de tickets.
- Historial completo de interacciones con el cliente.

### 2. Integración con WhatsApp y Telegram:

- Recepción y envío de mensajes a través de WhatsApp (wwebjs) y Telegram (bot nativo).
- Soporte para mensajes de texto, imágenes, documentos y media.

### 3. Interfaz de Usuario:

- Panel de control intuitivo y fácil de usar.
- Visualización de tickets abiertos, en progreso y cerrados.
- Filtros y búsquedas para localización fácil de tickets.

### 4. Automatización de Procesos:

- Respuestas rápidas para preguntas frecuentes.
- Notificaciones automáticas para actualizaciones de tickets.
- Sistema de asignación automática de tickets para agentes específicos.

### 5. Personalización y Configuración:

- Configuración de horarios de atención.
- Personalización de mensajes automáticos.
- Integración con otros sistemas y APIs.

## Tecnologías Utilizadas

- Lenguaje de Programación: JavaScript y TypeScript
- Base de Datos: MySQL
- Integración con WhatsApp: Utilización de APIs para comunicación bidireccional.
- Integración con Telegram: bot nativo mediante la API de Telegram (token creado con BotFather).

## Beneficios

- Mejora en la Eficiencia de la Atención: Con la automatización y la organización de tickets, los agentes pueden responder de manera más rápida y eficiente.
- Satisfacción del Cliente: Las respuestas rápidas y precisas aumentan la satisfacción del cliente.
- Facilidad de Uso: La interfaz intuitiva y las funcionalidades automáticas hacen que el sistema sea fácil de usar tanto para los agentes como para los clientes.

Este sistema es ideal para empresas que buscan mejorar su atención al cliente a través de WhatsApp y Telegram, proporcionando una experiencia más integrada y eficiente.

## Requisitos

| ---         | Mínimo | Recomendado | Probado |
| ----------- | ------ | ----------- | ------- |
| Node JS     | 22.x   | 22.x        | 22.x    |
| Ubuntu      | 20.x   | 22.x        | 22.x    |
| Memoria RAM | 4Gb    | 6Gb         | 8Gb     |

## Despliegue (Flujo de Git)

`main` es la rama de despliegue: **todo el código que corre en producción sale de `main`**. Trabajá siempre sobre `main` (o sobre una rama con nombre tipo `feature/algo` que mergees a `main` al terminar) y no dejes trabajo acumulado en ramas de respaldo como `backup-antes-debug`.

### Cómo actualizar el código en el servidor

```bash
cd /home/deploy/Press-Ticket
git checkout main
git pull origin main
```

### Compilar y reiniciar los servicios

```bash
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
pm2 restart itn-backend itn-frontend
pm2 status
```

> **Si hay una rama de backup con trabajo sin mergear** (ej. `backup-antes-debug`), mergeala a `main` antes de desplegar:
> `git checkout main && git merge --ff-only backup-antes-debug && git push origin main`

### Configurar la rama por defecto en GitHub

Para que cualquier `git clone` o descarga desde GitHub baje la versión correcta, la rama por defecto del repositorio debe ser **`main`**: Settings del repo → **Branches** → **Default branch** → `main`.

## Replicar en otro servidor (instalación desde cero)

Todo este flujo es **100% por terminal**, sin GUI. Requiere un VPS con **Ubuntu 22.04** y acceso `root` por SSH. Los comandos se ejecutan desde tu máquina local (o desde el propio VPS con `ssh root@IP`).

### 1. Preparar el servidor

Actualizá el sistema y asegurate de que el DNS de los dominios apunte al IP del VPS **antes** de instalar (el instalador valida que los dominios existan):

```bash
apt update && apt upgrade -y
# Apuntá back.tudominio.com.ar y front.tudominio.com.ar al IP del VPS en tu DNS
```

### 2. Ejecutar el instalador automático

El instalador verifica dependencias, instala todo (Node, MySQL, Nginx, PM2, Chrome), clona el repo de `main`, crea la BD, corre migraciones y seeds, y deja la app funcionando. Solo preguntás por las variables vía argumentos:

```bash
curl -sSL https://raw.githubusercontent.com/Re1M0n/proit-press/main/INSTALL.sh | sudo bash -s "SENHA_DEPLOY" "NOMBRE_APP" "back.tudominio.com.ar" "front.tudominio.com.ar" 4000 3000 "DB_PASS" 3 10 "admin@tudominio.com.ar"
```

| Argumento | Qué es | Ejemplo |
|---|---|---|
| `SENHA_DEPLOY` | Contraseña del usuario `deploy` | `MiClaveSegura` |
| `NOMBRE_APP` | Nombre del proyecto/carpeta | `press` |
| `URL_BACKEND` | Dominio o subdominio de la API | `back.tudominio.com.ar` |
| `URL_FRONTEND` | Dominio o subdominio del panel | `front.tudominio.com.ar` |
| `PORT_BACKEND` | Puerto interno de la API | `4000` |
| `PORT_FRONTEND` | Puerto interno del panel | `3000` |
| `DB_PASS` | Contraseña de la base de datos | `OtraClave` |
| `USER_LIMIT` | Límite de usuarios | `3` |
| `CONNECTION_LIMIT` | Límite de conexiones | `10` |
| `EMAIL` | Email del admin | `admin@tudominio.com.ar` |

Al terminar te imprime las credenciales de acceso (admin + masteradmin) y el estado de PM2. Documentación completa en [`docs/INSTALL_AUTOMATICO_VPS.md`](docs/INSTALL_AUTOMATICO_VPS.md).

### 3. Copiar los datos desde el servidor de producción

En el **servidor actual** (producción), generá el respaldo y bajalo a tu máquina:

```bash
# En producción: genera database.sql.gz + public.tar.gz + sessions.tar.gz
sudo bash backup.sh /home/deploy/backups

# En tu máquina local: descargalo
scp root@IP_PRODUCCION:/home/deploy/backups/proit_FECHA/* .
```

> Los scripts `backup.sh` y `restore.sh` están en la raíz del repositorio. `database.sql.gz` es un dump restaurable con `mysqldump`/`mysql` estándar; `public.tar.gz` es el media de los tickets; `sessions.tar.gz` contiene las sesiones de WhatsApp (opcional, es lo que evita re-escanear el QR). Si la app quedó en otra carpeta que no sea `/home/deploy/Press-Ticket` (el instalador usa el nombre del proyecto), ejecutá con `PROIT_APP_DIR=/ruta/a/la/app bash backup.sh` (igual con `restore.sh`).

### 4. Restaurar en el servidor nuevo

Subí el backup y restaurá (la app ya está instalada por el paso 2):

```bash
# En tu máquina local: subí el backup al VPS nuevo
scp -r proit_FECHA root@IP_VPS:/home/deploy/

# En el VPS nuevo: restaurá BD + media + sesiones y reiniciá
cd /home/deploy/proit_FECHA && sudo bash restore.sh /home/deploy/proit_FECHA
```

> Si no copiaste `sessions.tar.gz`, entrá a la app, abrí el canal de WhatsApp y escaneá el QR de nuevo (la línea se recrea). Telegram se configura con el token del bot en **Configuraciones → Canales**.

### 5. Verificación final

```bash
pm2 status          # los dos procesos (back y front) online
curl -k https://front.tudominio.com.ar   # responde 200
curl -k https://back.tudominio.com.ar/version  # responde la versión
```

### Respaldo periódico (cron)

Para un respaldo diario automático, agregá esta línea al crontab (`crontab -e`):

```bash
30 3 * * * cd /home/deploy/Press-Ticket && sudo bash backup.sh /home/deploy/backups
```

## Créditos

ProIT CRM está basado en el proyecto de código abierto [Press-Ticket](https://github.com/rtenorioh/Press-Ticket), desarrollado originalmente por Robson Tenório, y este a su vez en el [Sistema Whaticket Community](https://github.com/canove/whaticket-community), creado por [Cassio Santos](https://github.com/canove). Gracias a esos proyectos y a su comunidad por la base sobre la que está construido este sistema.
