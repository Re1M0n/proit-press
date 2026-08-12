# Cambiar la Hora de la VPS desde el Terminal

> **Observación:** Este tutorial debe seguirse cuando haya problemas relacionados con la hora, como fallas en implementaciones que dependen de la zona horaria correcta de la VPS.

---

## Pasos para cambiar la zona horaria

### 1. Verificar la hora actual de la VPS

Para verificar la hora configurada actualmente en tu VPS, ejecuta el siguiente comando en el terminal:

```bash
date
```

### 2. Cambiar la zona horaria de la VPS

Para cambiar la zona horaria, usa el siguiente comando:

```bash
sudo dpkg-reconfigure tzdata
```

### 3. Elegir el continente

Después de ejecutar el comando anterior, se mostrará una pantalla de configuración. En el primer paso, selecciona el continente correspondiente a tu zona horaria. Para el horario de América, elige:

```bash
America
```

### 4. Seleccionar la ciudad

En la siguiente pantalla, selecciona la ciudad que corresponde a tu zona horaria. Por ejemplo, para el horario de Argentina (Buenos Aires), elige:

```bash
Argentina
```

y luego:

```bash
Buenos_Aires
```

> El instalador del sistema ProIT CRM usa por defecto la zona horaria `America/Argentina/Buenos_Aires`. Te recomendamos usar la misma zona en la VPS para que los horarios registrados coincidan.

### 5. Verificar el cambio

Después de completar la selección, el sistema mostrará un mensaje confirmando que la zona horaria se cambió correctamente. La salida será similar a:

```bash
Current default time zone: 'America/Argentina/Buenos_Aires'
Local time is now:      Tue Mar 20 08:21:57 -03 2018.
Universal Time is now:  Tue Mar 20 11:21:57 UTC 2018.
```

---

Ahora la zona horaria de tu VPS quedará configurada correctamente según tu ubicación.
