# Manual de Actualización Automática del ProIT CRM® en la VPS

Este manual describe los pasos necesarios para realizar la actualización automática del sistema **ProIT CRM®** en tu VPS.

El actualizador (`UPDATE.sh`) se encarga de: pasar a la rama `main` del repositorio `github.com/Re1M0n/proit-press`, traer los últimos cambios (`git pull`), instalar las dependencias, compilar backend y frontend, y reiniciar los servicios PM2.

## Pasos para la Actualización

### 1. Acceder a la VPS

Conéctate a la VPS donde está instalado el **ProIT CRM®**. Usa el usuario apropiado (`root` o `deploy`), según tu configuración:

```bash
ssh usuario@ip-de-la-vps
```

### 2. Navegar hasta la carpeta del sistema

Una vez conectado a la VPS, ve al directorio donde está instalado el sistema:

```bash
cd ProIT-CRM/
```

### 3. Ejecutar el comando de actualización

Con el directorio correcto accedido, ejecuta el comando de actualización de abajo:

```bash
curl -sSL https://raw.githubusercontent.com/Re1M0n/proit-press/main/UPDATE.sh | sudo bash -s
```

> Nota: El script ejecutado se encarga de realizar el proceso de actualización automáticamente (actualiza el código, compila y reinicia los servicios PM2).

### 4. Zona horaria (opcional)

El actualizador usa por defecto la zona horaria `America/Argentina/Buenos_Aires` para el registro del log. Si querés usar otra, pasala como argumento:

```bash
curl -sSL https://raw.githubusercontent.com/Re1M0n/proit-press/main/UPDATE.sh | sudo bash -s -- America/Argentina/Buenos_Aires
```

### 5. Finalización

Después de ejecutar el comando, verifica que la actualización haya concluido con éxito y sin errores. En caso de algún problema, revisa los logs o contacta a soporte.
