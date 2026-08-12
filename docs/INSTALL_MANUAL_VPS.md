# Manual de Instalación del ProIT CRM® en la VPS

### Observación:

- Antes de comenzar la instalación, es necesario haber creado los subdominios y asegurarse de que apunten al IP de la VPS.

---

## Sección 1: Preparación Inicial

### 1.1 Cambiando a root

```bash
sudo su root
```

### 1.2 Accediendo al directorio raíz

```
cd ~
```

### 1.3 Actualizando y haciendo upgrade de la VPS

```
apt update && sudo apt upgrade -y
```

## Sección 2: Instalación del MariaDB

### 2.1 Instalación del MariaDB

```
apt install mariadb-server mariadb-client -y
```

### 2.2 Verificando la versión del MySQL Server (opcional)

```
mariadb --version
```

### 2.3 Verificando el estado del MySQL Server

```
sudo systemctl status mariadb
```

### 2.4 Saliendo de la vista de estado del MySQL

Presiona `CTRL + C` para salir.

### 2.5 Accediendo al MySQL Server

```
sudo mysql -u root
```

### 2.6 Creando la base de datos

```
CREATE DATABASE press_ticket CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

### 2.7 Cambiando el usuario root para que use contraseña al autenticarse en la base de datos

```
ALTER USER 'root'@'localhost' IDENTIFIED BY 'senha_root';
```

### 2.8 Aplicando los cambios

```
FLUSH PRIVILEGES;
```

### 2.9 Saliendo del MySQL

```
exit;
```

### 2.10 Reiniciando el MySQL

```
service mariadb restart
```

## Sección 3: Configuración del Usuario

### 3.1 Creando el usuario deploy

```
adduser deploy
```

### 3.2 Dar privilegios de superusuario al usuario deploy

```
usermod -aG sudo deploy
```

### 3.3 Cambiando al nuevo usuario deploy

```
su deploy
```

## Sección 4: Instalación del Node.js y Dependencias

### 4.1 Descargando Node.js 22.x

```
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
```

### 4.2 Instalando Node.js

```
sudo apt-get install -y nodejs
```

### 4.3 Instalando bibliotecas adicionales

```
sudo apt install apt-transport-https ca-certificates curl software-properties-common git ffmpeg
```

### 4.4 Actualizando

```
sudo apt update
```

### 4.5 Agregar el usuario actual al grupo mysql, permitiendo que tenga permisos adicionales para acceder a los recursos del MySQL

```
sudo usermod -aG mysql ${USER}
```

### 4.6 Realizar el "cambio de login" para el usuario actual, cargando las variables de entorno y configuraciones de login como si el usuario hubiera hecho un nuevo login.

```bash
su - ${USER}
```

## Sección 5: Instalación del Chrome y Dependencias

### 5.1 Instalando bibliotecas necesarias para el Chrome

```
sudo apt-get install -y libgbm-dev wget unzip fontconfig locales gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils
```

### 5.2 Descargando el Google Chrome

```
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
```

### 5.3 Instalando el Google Chrome

```
sudo apt install ./google-chrome-stable_current_amd64.deb
```

## Sección 6: Instalación del ProIT CRM®

### 6.1 Descargando el repositorio del ProIT CRM®

```
git clone https://github.com/Re1M0n/proit-press.git ProIT-CRM
```

> El repositorio se clona desde la rama `main`, que es la rama de despliegue oficial.

## Sección 7: Configuración del Backend

### 7.1 Generando las claves JWT_SECRET y JWT_REFRESH_SECRET (ejecutar el comando dos veces)

```
openssl rand -base64 32
```

### 7.2 Editar los datos de abajo usando tu información y los valores generados por el comando anterior.

```bash
NODE_ENV=production

#Nombre de la Instalación
COMPANY_NAME=press_ticket

#Nombre del Dispositivo
DEVICE_NAME=

#URLs y Puertos
BACKEND_URL=https://back.pressticket.com.ar
FRONTEND_URL=https://ticket.pressticket.com.ar
WEBHOOK=https://back.pressticket.com.ar
PORT=4000
PROXY_PORT=443

#Ruta de Chrome
CHROME_BIN=/usr/bin/google-chrome-stable

#Datos de acceso a la Base de datos
DB_DIALECT=mysql
DB_HOST=localhost
DB_TIMEZONE=-03:00
DB_USER=root
DB_PASS=senha_root
DB_NAME=press_ticket

#Limitar Usuarios y Conexiones
USER_LIMIT=3
CONNECTIONS_LIMIT=1

#Credenciales del Email para el Nodemailer
EMAIL_USER=tu.email@gmail.com
EMAIL_PASS=tucontraseña

#ID del PM2 del Frontend y Backend para poder ser reiniciado en la pantalla de Conexiones
PM2_FRONTEND=1
PM2_BACKEND=0

#Modo DEMO que evita modificar algunas funciones, para activar: ON
DEMO=OFF

#Permitir la rotación de tokens
JWT_SECRET=JYszCWFNE0kmbbb0w/dvMl66zDd1GZozzaC27dKOCDY=
JWT_REFRESH_SECRET=FwJXkGgXv7ARfxPRb7/6RdNmtXJlR4PsQvvw8VIbOho=
```

### 7.3 Editando el archivo .env

Abre el archivo .env y complétalo con la información generada:

```
nano ProIT-CRM/backend/.env
```

### 7.4 Accediendo al directorio del backend

```
cd ProIT-CRM/backend
```

### 7.5 Instalando las dependencias

```
npm install
```

### 7.6 Compilando el backend

```
npm run build
```

### 7.7 Creando las tablas en la base de datos

```
npx sequelize db:migrate
```

### 7.8 Insertando datos en las tablas

```
npx sequelize db:seed:all
```

> Ambos comandos son idempotentes: si las migraciones o los datos iniciales ya existen, no se vuelven a aplicar.

### 7.9 Instalando el PM2

```
sudo npm install -g pm2
```

### 7.10 Inicia el backend usando PM2, asignando el nombre "ProIT-CRM-backend" al proceso

```
pm2 start dist/server.js --name ProIT-CRM-backend
```

### 7.11 Configura el PM2 para que todos los procesos gestionados por él se inicien automáticamente cuando Ubuntu sea reiniciado, usando el usuario deploy

```
pm2 startup ubuntu -u deploy
```

### 7.12 Configura el PM2 para iniciar automáticamente en el boot del sistema, usando el usuario deploy y asegurando que el PATH esté configurado correctamente

```
sudo env PATH=$PATH:/usr/bin pm2 startup ubuntu -u deploy --hp /home/deploy
```

## Sección 8: Configuración del Frontend

### 8.1 Accediendo al directorio del frontend

```
cd ../frontend
```

### 8.2 Instalando las dependencias

```
npm install
```

### 8.3 Editar los datos de abajo usando tu información

```bash
NODE_ENV=production

#URL BACKEND
REACT_APP_BACKEND_URL=https://back.pressticket.com.ar

#Tiempo de cierre automático de los tickets en horas
REACT_APP_HOURS_CLOSE_TICKETS_AUTO=

#PUERTO del frontend
PORT=3000

#Para permitir acceso solo del MasterAdmin (siempre ON)
REACT_APP_MASTERADMIN=OFF
```

### 8.4 Editando el archivo .env del frontend usando los datos del punto 8.3

```
nano .env
```

### 8.5 Compilando el frontend

```
npm run build
```

### 8.6 Iniciando el frontend con PM2

```
pm2 start server.js --name ProIT-CRM-frontend
```

### 8.7 Guardando los servicios iniciados por el PM2

```
pm2 save
```

### 8.8 Listar los servicios iniciados por el PM2

```
pm2 list
```

## Sección 9: Configuración del Nginx

### 9.1 Instalando el Nginx

```
sudo apt install nginx
```

### 9.2 Creando y editando el archivo de configuración del frontend

```
sudo nano /etc/nginx/sites-available/ProIT-CRM-frontend
```

Complétalo con la información de abajo, actualizando los datos según tu dominio:

**IMPORTANTE**: La configuración de abajo ya incluye los **Security Headers** para garantizar nota A en [SecurityHeaders.com](https://securityheaders.com)

```
server {
  server_name front.pressticket.com.ar;
  
  # Security Headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" always;
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; media-src 'self' https: blob:; connect-src 'self' https://back.pressticket.com.ar wss://back.pressticket.com.ar; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self';" always;
  
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }
}
```

**Nota**: Recuerda reemplazar `back.pressticket.com.ar` en el `Content-Security-Policy` por la URL real de tu backend!

### 9.3 Creando y editando el archivo de configuración del backend

```
sudo nano /etc/nginx/sites-available/ProIT-CRM-backend
```

Complétalo con la información de abajo, actualizando los datos según tu dominio:

```
server {
  server_name back.pressticket.com.ar;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### 9.4 Acceder a la carpeta donde se crearon los archivos

```
cd /etc/nginx/sites-available/
```

### 9.5 Listar para comprobar que los archivos se crearon correctamente

```
ls
```

### 9.6 Creando enlaces simbólicos

Frontend

```
sudo ln -s /etc/nginx/sites-available/ProIT-CRM-frontend /etc/nginx/sites-enabled
```

Backend

```
sudo ln -s /etc/nginx/sites-available/ProIT-CRM-backend /etc/nginx/sites-enabled
```

### 9.7 Acceder a la carpeta donde se crearon los enlaces

```
cd /etc/nginx/sites-enabled/
```

### 9.8 Listar para comprobar que los enlaces se crearon correctamente

```
ls
```

### 9.9 Probando el Nginx

```
sudo nginx -t
```

### 9.10 Reiniciando el Nginx

```
sudo service nginx restart
```

### 9.11 Editar el archivo de configuración del nginx con el comando de abajo y completar con los datos del punto 9.12

```
sudo nano /etc/nginx/nginx.conf
```

### 9.12 Incluir en el archivo de configuración del nginx, dentro de http, el dato del punto 9.11

```
client_max_body_size 100M;
```

### 9.13 Probando el Nginx

```
sudo nginx -t
```

### 9.14 Reiniciando el Nginx

```
sudo service nginx restart
```

## Sección 10: Instalación del Certificado SSL

### 10.1 Instalando soporte para Snap y Certbot

```
sudo apt-get install snapd
```

### 10.2 Instalar el paquete del Certbot (SSL)

```
sudo snap install --classic certbot
```

### 10.3 Generando el certificado SSL para backend y frontend

Ejecutar el comando y activar el certificado SSL por separado para cada uno de los subdominios.

```
sudo certbot --nginx
```

---

# Sección 11: Usuario estándar para Acceso del Admin

Usuario:

```
admin@pressticket.com.ar
```

Contraseña:

```
admin
```

# Sección 12: Usuario estándar para Acceso del MasterAdmin

Usuario:

```
masteradmin@pressticket.com.ar
```

Contraseña:

```
masteradmin
```

---

# Sección 13: Verificación de Security Headers

Después de la instalación completa y la configuración del SSL, podés verificar la seguridad de tu sistema:

### 13.1 Probar Security Headers

Accede al sitio [SecurityHeaders.com](https://securityheaders.com) y prueba tu dominio frontend:

```
https://securityheaders.com/?q=https://front.pressticket.com.ar
```

**Resultado esperado**: Nota **A** 🎉

### 13.2 Verificar Headers vía Terminal

```bash
curl -I https://front.pressticket.com.ar/ | grep -i "x-frame\|content-security\|permissions"
```

Deberías ver los siguientes headers:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=()...`
- `Content-Security-Policy: default-src 'self'...`

### 13.3 Verificar Ausencia de Duplicación

```bash
curl -I https://front.pressticket.com.ar/ | grep -c "X-Frame-Options"
```

**Resultado esperado**: `1` (no debe devolver `2` o más)

### 13.4 Sobre los Security Headers

Los security headers configurados en el Nginx del frontend garantizan:

- ✅ **X-Frame-Options**: Previene clickjacking
- ✅ **X-Content-Type-Options**: Previene MIME sniffing
- ✅ **X-XSS-Protection**: Protección contra XSS (legacy)
- ✅ **Referrer-Policy**: Controla la información del Referer
- ✅ **Permissions-Policy**: Bloquea recursos sensibles (cámara, micrófono, geolocalización)
- ✅ **Content-Security-Policy**: Controla fuentes de recursos y previene XSS

**Nota sobre CSP**: El aviso sobre `unsafe-inline` y `unsafe-eval` es esperado y necesario para que React funcione correctamente. Eso no compromete la nota A.

### 13.5 Comportamiento del server.js

El `server.js` del frontend detecta automáticamente el ambiente:

- **Producción** (`NODE_ENV=production`): Headers deshabilitados en el Helmet, porque el Nginx ya los envía
- **Desarrollo** (localhost): Headers habilitados en el Helmet, porque no hay Nginx

Eso evita la duplicación de headers en producción y garantiza seguridad en desarrollo.
