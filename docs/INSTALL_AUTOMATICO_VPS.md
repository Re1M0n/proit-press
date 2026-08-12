# Manual de Instalación Automática de ProIT CRM en VPS

Este manual describe los pasos necesarios para realizar la instalación automática del sistema **ProIT CRM** en tu VPS.

El instalador (`INSTALL.sh`) clona el repositorio oficial desde la rama `main` de **github.com/Re1M0n/proit-press**, instala todas las dependencias (Node.js 22, MySQL/MariaDB, Chrome, Nginx, Certbot, PM2), configura los `.env`, compila backend y frontend, y ejecuta las migraciones y los datos iniciales solo si todavía no fueron aplicados.

## Pasos para la instalación

### 1. Acceder a la VPS

Conectate a la VPS donde se instalará el sistema. Usá el usuario `root`:

```bash
ssh root@ip-de-la-vps
```

### 2. Ejecutar el comando de instalación

#### 2.1 Modelo del comando

A continuación tenés el modelo del comando con la explicación de cada argumento.

`curl -sSL https://raw.githubusercontent.com/Re1M0n/proit-press/main/INSTALL.sh | sudo bash -s <SENHA_DEPLOY> <NOMBRE_EMPRESA> <URL_BACKEND> <URL_FRONTEND> <PORT_BACKEND> <PORT_FRONTEND> <DB_PASS> <USER_LIMIT> <CONNECTION_LIMIT> <EMAIL>`

`<SENHA_DEPLOY>` => Contraseña del usuario Deploy  
`<NOMBRE_EMPRESA>` => Nombre para la instalación y el PM2  
`<URL_BACKEND>` => URL del backend (api)  
`<URL_FRONTEND>` => URL del frontend (área de acceso del cliente)  
`<PORT_BACKEND>` => Puerto del backend  
`<PORT_FRONTEND>` => Puerto del frontend  
`<DB_PASS>` => Contraseña de acceso a la base de datos  
`<USER_LIMIT>` => Cantidad límite de usuarios  
`<CONNECTION_LIMIT>` => Cantidad límite de canales  
`<EMAIL>` => Email para configurar el MasterAdmin y el certificado SSL  

> Observación: Todos los argumentos anteriores son obligatorios.

#### 2.2 Modelo a usar para la instalación

Estando logueado como `root`, ejecutá el comando de abajo con tus datos para realizar la instalación:

```bash
curl -sSL https://raw.githubusercontent.com/Re1M0n/proit-press/main/INSTALL.sh | sudo bash -s "senha123" "empresa" "back.tudominio.com.ar" "front.tudominio.com.ar" 4000 3000 "senha123" 3 10 "email@tudominio.com.ar"
```

> Nota: El script se encarga de realizar el proceso de instalación automáticamente. Al finalizar te muestra la URL de acceso y los usuarios por defecto.

### 3. Verificación

Después de ejecutar el comando, verificá que la instalación haya concluido con éxito y sin errores. Podés revisar:

- El resumen final que muestra el instalador (URL de acceso y credenciales).
- Los servicios PM2 corriendo: `pm2 list` (procesos `<nombre>-back` y `<nombre>-front`).
- La base de datos con las tablas creadas: las migraciones y los datos iniciales se aplican automáticamente solo si no existen.

En caso de algún problema, revisá el log de instalación (se indica su ruta al final) o contactá a soporte.
