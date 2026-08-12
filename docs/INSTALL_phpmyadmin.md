# Manual de Instalación de phpMyAdmin en la VPS

> **Observación:** Si MySQL ya está instalado, no hay problema. Se actualizará durante el proceso.

---

## Pasos para la Instalación

### 1. Actualizar y hacer upgrade de la VPS

Antes de cualquier instalación, actualiza la lista de paquetes y aplica upgrades en el sistema:

```bash
sudo apt update && sudo apt upgrade
```

### 2. Instalar el MySQL Server

Si el MySQL Server aún no está instalado, usa el comando de abajo:

```bash
sudo apt install mysql-server
```

### 3. Verificar la versión de MySQL

Para confirmar la instalación y verificar la versión de MySQL, ejecuta:

```bash
mysql --version
```

### 4. Verificar si MySQL está corriendo

Confirma que el servicio MySQL esté en ejecución:

```bash
sudo systemctl status mysql
```

### 5. Instalar el phpMyAdmin

Ahora, instala el phpMyAdmin y las demás dependencias necesarias:

```bash
sudo apt install phpmyadmin php-mbstring
```

Durante la instalación:

- Selecciona `apache2` como servidor web.
- Elige `Sí` para configurar la base de datos con dbconfig-common.
- Define la contraseña para el usuario phpmyadmin.

### 6. Acceder a la carpeta de configuración de Apache

Ve al directorio de configuración de Apache:

```bash
cd /etc/apache2/
```

### 7. Modificar el puerto por defecto de Apache

Abre el archivo `ports.conf` y cambia la línea `Listen 80` por `Listen 81`, si es necesario:

```bash
sudo nano ports.conf
```

> Nota: Este cambio es necesario si el puerto 80 ya está en uso por otro servicio.

### 8. Reiniciar Apache

Después de la modificación, reinicia Apache para aplicar los cambios:

```bash
sudo systemctl restart apache2
```

### 8.1. Verificar si Apache está corriendo

Confirma que el servicio de Apache funcione correctamente:

```bash
sudo systemctl status apache2
```

### 9. Crear un enlace simbólico para el phpMyAdmin

Crea un enlace simbólico para que el phpMyAdmin sea accesible desde el navegador:

```bash
sudo ln -s /usr/share/phpmyadmin /var/www/html
```

### 10. Crear un nuevo usuario MySQL para el phpMyAdmin

Para agregar un nuevo usuario a MySQL, sigue los pasos de abajo:

#### 10.1. Accede a MySQL como root:

```bash
mysql -u root
```

#### 10.2. Crea un nuevo usuario con una contraseña:

```bash
CREATE USER 'nuevoUsuario'@'localhost' IDENTIFIED BY 'contraseña';
```

#### 10.3. Otorga todos los privilegios al nuevo usuario:

```bash
GRANT ALL PRIVILEGES ON *.* TO 'nuevoUsuario'@'localhost' WITH GRANT OPTION;
```

#### 10.4. Ejecuta el comando de abajo para asegurar que los cambios se apliquen:

```bash
FLUSH PRIVILEGES;
```

#### 10.5. Sal de MySQL:

```bash
exit;
```

### 11. Acceder al phpMyAdmin

Abre el navegador y accede al phpMyAdmin a través de la siguiente dirección:

```bash
http://IPdeLaVPS:81/phpmyadmin
```

### 12. Login en el phpMyAdmin

Usa el nombre de usuario y la contraseña creados en el paso 10 para iniciar sesión en el phpMyAdmin.

> Ahora quedó completamente formateado y listo para usar.
