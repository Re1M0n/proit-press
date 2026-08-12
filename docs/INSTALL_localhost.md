# Manual de Instalación del ProIT CRM® en Localhost

### Programas Esenciales:

- **Node JS**
- **GIT**
- **XAMPP o WAMPP**
- **IDE** (ATOM, Sublime Text, VS Code u otro de tu elección)

---

## Pasos para la Instalación

### 1. Crear la Base de Datos

#### 1.1. Vía Comando SQL:

Ejecuta el siguiente comando en tu terminal para crear la base de datos:

```bash
CREATE DATABASE press_ticket CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

#### 1.2. Si estás usando XAMPP o WAMPP, podés crear la base de datos vía phpMyAdmin:

Accede al phpMyAdmin a través de la URL:

```bash
http://localhost/phpmyadmin
```

Y crea la base de datos manualmente.

---

### 2. Clonar el repositorio:

Para clonar el repositorio del ProIT CRM®, usa el siguiente comando en el terminal:

```bash
git clone https://github.com/Re1M0n/proit-press.git ProIT-CRM
```

> El repositorio se clona desde la rama `main`, que es la rama de despliegue oficial.

---

### 3. Entrar en el directorio backend del ProIT-CRM:

Después de clonar el repositorio, entra en el directorio `backend` usando el comando:

```bash
cd ProIT-CRM/backend
```

---

### 4. Editar la información en el archivo `.env`:

Crea o edita el archivo `.env` en el directorio `backend` con la siguiente información:

```bash
NODE_ENV=

#Nombre de la Instalación
COMPANY_NAME=press_ticket

#Nombre del Dispositivo
DEVICE_NAME=

#URLs y Puertos
WEBHOOK=https://ninety-yaks-trade.loca.lt
BACKEND_URL=http://localhost
FRONTEND_URL=http://localhost:3000
PORT=4000
PROXY_PORT=4000

#Ruta de Chrome
CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe

#Datos de acceso a la Base de datos
DB_DIALECT=mysql
DB_HOST=localhost
DB_TIMEZONE=-03:00
DB_USER=root
DB_PASS=
DB_NAME=press_ticket

#Limitar Usuarios y Conexiones
USER_LIMIT=3
CONNECTIONS_LIMIT=5

#Modo DEMO que evita modificar algunas funciones, para activar: ON
DEMO=OFF

#Permitir la rotación de tokens
JWT_SECRET=JYszCWFNE0kmbbb0w/dvMl66zDd1GZozzaC27dKOCDY=
JWT_REFRESH_SECRET=FwJXkGgXv7ARfxPRb7/6RdNmtXJlR4PsQvvw8VIbOho=
```

---

### 5. Crear el archivo `.env` e insertar la información del punto 4.

Si el archivo `.env` aún no existe, crea un archivo nuevo e inserta la información listada en el punto 4.

---

### 6. Instalar las dependencias:

Instala las dependencias necesarias del proyecto ejecutando el siguiente comando en el terminal:

```bash
npm install
```

---

### 7. Compilar el proyecto:

Para compilar el proyecto, ejecuta el siguiente comando:

```bash
npm run build
```

---

### 8. Crear las tablas en la base de datos:

Ejecuta las migraciones para crear las tablas en la base de datos:

```bash
npx sequelize db:migrate
```

---

### 9. Poblar la base de datos:

Puebla la base de datos con los datos iniciales ejecutando el comando:

```bash
npx sequelize db:seed:all
```

> Ambos comandos son idempotentes: si las migraciones o los datos iniciales ya existen, no se vuelven a aplicar.

---

### 10. Levantar el servidor:

Inicia el servidor backend con el siguiente comando:

```bash
npm start
```

---

### 11. Entrar en el directorio frontend del ProIT-CRM:

Ahora, ve al directorio `frontend` del ProIT-CRM con el siguiente comando:

```bash
cd ProIT-CRM/frontend
```

---

### 12. Editar la información en el archivo `.env`:

Crea o edita el archivo `.env` en el directorio `frontend` con la siguiente información:

**IMPORTANTE**: En localhost, define `NODE_ENV=development` para que el `server.js` active automáticamente los **Security Headers** vía Helmet (ya que no hay Nginx en desarrollo).

```bash
#Ambiente (development para localhost)
NODE_ENV=development

#URL BACKEND
REACT_APP_BACKEND_URL=http://localhost:4000

#Tiempo de cierre automático de los tickets en horas
REACT_APP_HOURS_CLOSE_TICKETS_AUTO=

#PUERTO del frontend
PORT=3000

# Para permitir acceso solo del MasterAdmin (siempre ON)
REACT_APP_MASTERADMIN=ON

```

**Nota sobre Security Headers en Localhost**:
- Con `NODE_ENV=development`, el `server.js` automáticamente habilita los security headers vía Helmet
- El Content-Security-Policy permite conexiones con `localhost:*` (cualquier puerto)
- Esto garantiza seguridad incluso en ambiente de desarrollo
- En producción (VPS), el Nginx gestiona los headers y el `server.js` los deshabilita automáticamente

---

### 13. Crear el archivo `.env` e insertar la información del punto 12.

Si el archivo `.env` aún no existe, crea un archivo nuevo e inserta la información listada en el punto 12.

---

### 14. Instalar las dependencias:

En el directorio `frontend`, instala las dependencias con el comando:

```bash
npm install
```

---

### 15. Levantar el servidor:

Para iniciar el servidor frontend, ejecuta el siguiente comando:

```bash
npm start
```

---

## Usuario Estándar para Acceso:

Usa el siguiente usuario y contraseña para acceder al sistema:

- **Usuario**:

```bash
admin@pressticket.com.ar
```

- **Contraseña**:

```bash
admin
```

---

# Usuario Master para Acceso

Usuario:

```
masteradmin@pressticket.com.ar
```

Contraseña:

```
masteradmin
```

---

## Verificación de Security Headers en Localhost

### Cómo Funciona en Desarrollo

En ambiente de desarrollo (localhost), el `server.js` detecta automáticamente que `NODE_ENV=development` y habilita los security headers vía Helmet.

### Probar Headers en Localhost

Después de iniciar el frontend, podés verificar los headers:

```bash
curl -I http://localhost:3000/ | grep -i "x-frame\|content-security\|permissions"
```

**Deberías ver**:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=()...`
- `Content-Security-Policy: default-src 'self'...`

### Diferencias entre Desarrollo y Producción

| Aspecto | Localhost (Development) | VPS (Production) |
|---------|------------------------|------------------|
| **Headers gestionados por** | Helmet (server.js) | Nginx |
| **CSP connect-src** | `localhost:*` (cualquier puerto) | URL específica del backend |
| **Configuración** | Automática vía NODE_ENV | Nginx + server.js |

### Logs del server.js

Al iniciar el frontend en localhost, verás:

```
🔧 Modo Desarrollo: Security headers gestionados por Helmet
Server is running on port 3000
```

Eso confirma que los headers se están enviando a través del Helmet.

### Beneficios en Desarrollo

- ✅ **Headers automáticos**: No hace falta configurar Nginx local
- ✅ **CSP flexible**: Permite conexiones con cualquier puerto del localhost
- ✅ **Pruebas realistas**: Mismo comportamiento de seguridad que producción
- ✅ **Sin configuración extra**: Funciona out-of-the-box

**Nota**: Cuando hagas deploy a producción (VPS), basta con cambiar `NODE_ENV=production` y el sistema automáticamente deshabilita los headers en el Helmet, dejando que el Nginx gestione todo.
