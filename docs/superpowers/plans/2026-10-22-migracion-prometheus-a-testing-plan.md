# Runbook: migrar Press-Ticket de Prometheus a testing

- **Fecha:** 2026-10-22
- **Ventana prevista:** runner el viernes 23/10 después de hora; cutover objetivo lunes 26/10/2026
- **Diseño:** [`../specs/2026-10-22-migracion-prometheus-a-testing-design.md`](../specs/2026-10-22-migracion-prometheus-a-testing-design.md)
- **Estado:** EJECUTADO el 24/10/2026 - `pressticket` es producción; `prometheus` quedó como servidor anterior. Ver [`../../produccion.md`](../../produccion.md).

## Objetivo y guardrails

Testing (`pressticket`) va a reemplazar Prometheus como producción. Se copiarán DB, `backend/public`, `.wwebjs_auth`, `.wwebjs_cache` y el código actual seleccionado de `main`. El usuario aprobó reemplazo completo del destino y artifact temporal cifrado AES-GCM.

- No publicar tokens, claves, `.env` o credenciales en chat, logs o artifacts.
- No iniciar ambas instancias con la misma sesión LocalAuth. Detener ambos backends durante el corte; para rollback, detener testing antes de reactivar Prometheus.
- `restore.sh` existente no limpia destino y no es un reemplazo completo. No ejecutarlo como procedimiento de corte sin modificación y revisión.
- `scripts/deploy.sh` existente apunta a Prometheus. No llamarlo desde el runner de testing sin adaptar el destino.
- Verificar con el usuario antes de cualquier acción destructiva sobre DB/archivos o cambio de tráfico.

## Estado inicial conocido

| Elemento | Estado |
|---|---|
| Origen | Prometheus; aplicación en `/home/deploy/Press-Ticket` según `scripts/deploy.sh`; MySQL |
| Destino | VM `testing`/`pressticket`, detrás de CGNAT; acceso de consola disponible para el usuario |
| Runner testing | Aún no registrado; planificado para el viernes 23 después de hora |
| SSH/túnel | Túnel reverso temporal documentado en `docs/tunel-testing.md`; no se debe asumir activo |
| Repo destino | Documentación usa tanto `/home/deploy/proit-press` como `/home/deploy/Press-Ticket`; verificar en consola |
| Auto-deploy actual | Cron de tags `v*` cada 3 minutos según `docs/tunel-testing.md`; no cubre cada push a `main` |
| Workflow actual | `.github/workflows/deploy.yml` despliega a Prometheus tras CI exitoso |
| Origen: tamaños reportados 22/10 | `public` 602 MB, `.wwebjs_auth` 4.1 GB, `.wwebjs_cache` 81 MB; 59 GB libres reportados |
| Destino: espacio libre | Pendiente de medir |
| Cutover | No se han movido datos ni cambiado URLs/tráfico |

## Fase 1 — Viernes 23: preparar runner en testing

### 1. Confirmar que la consola está en la VM correcta

Entrar por la sesión de consola/RustDesk del usuario. Antes de tocar nada, confirmar hostname, sistema operativo, usuario `deploy` y ruta del repo. `docs/tunel-testing.md` identifica la VM como Ubuntu 24.04; no asumir la máquina por el nombre de la sesión remota.

Desde la raíz del checkout, revisar si existe `scripts/instalar-runner.sh`. El script del repo instala en `$HOME/actions-runner`, registra el runner en `Re1M0n/proit-press` y lo supervisa con PM2. Ejecutarlo como `deploy`, no con `sudo`.

### 2. Obtener token temporal e instalar

Generar un token de registro desde GitHub → repositorio → Settings → Actions → Runners → New self-hosted runner. El script indica que el token dura aproximadamente una hora. No pegarlo en el chat ni dejarlo escrito en un archivo o en el historial.

Una vez verificado el checkout y la ruta real, pasar el token en memoria al script y usar la etiqueta `pressticket`:

```bash
read -r -s -p "Token temporal de GitHub: " RUNNER_TOKEN
printf '\n'
bash scripts/instalar-runner.sh "$RUNNER_TOKEN" pressticket
unset RUNNER_TOKEN
```

Si el script no existe en el checkout del servidor o falla el registro, parar y reportar el mensaje; no improvisar descargas ni cambios de sistema. El proceso del runner se llama `github-runner` por defecto.

### 3. Confirmar runner online

En GitHub → Settings → Actions → Runners, verificar estado `Online` y etiqueta `pressticket`. En la VM:

```bash
pm2 logs github-runner --lines 20
```

Confirmar `Listening for Jobs`. Ejecutar después un job inocuo (solo identidad de host/usuario y rutas no sensibles) antes de autorizar un deploy real. No probar con `scripts/deploy.sh` de producción.

## Fase 2 — Antes del cutover: deploy a testing en cada push

1. Verificar y anotar la ruta del repo, usuario, nombres reales de PM2, directorios de datos, DB usada y URLs actuales en testing. Resolver la discrepancia entre `/home/deploy/proit-press` y `/home/deploy/Press-Ticket`.
2. Crear un script de deploy específico de testing; no reutilizar los paths/servicios hardcodeados de `scripts/deploy.sh`.
3. Añadir un workflow de testing que se active cuando termine CI exitoso para `main`, use `[self-hosted, pressticket]`, y despliegue el SHA validado. Añadir `workflow_dispatch` solo para intervención controlada. Proteger concurrencia para que dos deploys no corran al mismo tiempo.
4. Probar el job con un cambio inocuo o dispatch que no migre ni borre DB/archivos; comprobar logs y servicios.
5. Solo después de una corrida correcta, pausar el cron por tags usando el kill-switch existente (`.autodeploy-off`) y comprobar que ya no compite con Actions. Mantener mecanismo de reanudación documentado hasta eliminar el cron adaptado.
6. Confirmar que cada push posterior a `main` pasa CI y despliega el commit correspondiente a testing.

**Nota de workflow:** el deploy de Prometheus actual escucha al resultado de CI y usa el runner `prometheus`. Al cambiar testing a producción, actualizar el destino productivo para que las ejecuciones futuras no vuelvan a arrancar el servidor antiguo ni operen la sesión WhatsApp copiada. No dejar dos workflows compitiendo por el mismo destino.

## Fase 3 — Preflight de migración

Completar y registrar cada dato antes de programar la ventana:

- [ ] URL final de frontend y backend; mecanismo exacto para pasar tráfico de producción a testing.
- [ ] Ruta real de repo y deploy en testing, usuario, servicios PM2 y DB configurada.
- [ ] Capacidad libre en disco de ambos hosts; espacio temporal para backup de testing, artifact descifrado, DB, medios y sesiones.
- [ ] Tamaño del paquete comprimido; límites/cuota de almacenamiento de Actions y posibilidad de descargarlo desde runner testing.
- [ ] SHA de `main` elegido para el corte y confirmación de que incluye todos los cambios aprobados que deben ir a producción.
- [ ] Estado de salud de la app, DB y canales en origen; respaldo existente restaurable en origen.
- [ ] Estado de salud y respaldo completo de DB, `public`, sesiones/cache y código actual de testing.
- [ ] Presencia/configuración del secreto GitHub `PRESSTICKET_MIGRATION_KEY`; acordar formato de clave AES-256 (32 bytes) y procedimiento de rotación/eliminación.
- [ ] Verificar acceso a cada backup, espacio, permisos y hash antes de la parada.

Si no hay espacio/cuota suficiente, el paquete excede el límite, falla un backup o no se conoce el destino de tráfico, posponer el corte; no improvisar transporte sin cifrado.

## Fase 4 — Preparar el artifact (sin secretos)

Implementar/verificar el flujo de migración para generar una instantánea que incluya:

1. Dump completo de MySQL con versión, nombre de origen y SHA de código como metadatos.
2. `backend/public`.
3. `.wwebjs_auth` y `.wwebjs_cache` completos.
4. Manifiesto con paths, tamaños y hashes de archivos.

El paquete no debe incluir `.env`, credenciales Infisical, llaves SSH, token del runner ni el secreto de cifrado. Cifrar con AES-256-GCM, nonce aleatorio por paquete y autenticación GCM. Subir como artifact solo el ciphertext; nunca subir el paquete en claro. Retención: un día. Descargar en testing y verificar el tag GCM antes de extraer a una carpeta temporal con permisos restringidos. Eliminar temporales/artifact al cerrar la operación según la política acordada.

El procedimiento actual `backup.sh` no cubre el flujo entero: no detiene procesos, no incluye código ni cifrado, usa `.env` y su directorio predeterminado no coincide necesariamente con el destino. Revisarlo o generar un capturador dedicado; validar con `bash -n` y pruebas no productivas antes de la ventana.

## Fase 5 — Ventana final de reemplazo

### 1. Congelar y respaldar

1. Confirmar con el usuario el inicio de ventana, URL de corte y commit SHA.
2. Pausar cambios/despliegues concurrentes a ambas instancias.
3. Crear y comprobar un backup recuperable de testing antes de reemplazarlo. Preservar DB, directorios, código/commit y configuración operativa; secretos permanecen fuera del artifact.
4. Detener el backend de Prometheus y el backend de testing. Verificar que ninguno está usando WhatsApp; no detener servicios con nombres supuestos sin comprobar el estado real.
5. Generar snapshot final del origen mientras no hay escrituras: DB, `public`, `.wwebjs_auth`, `.wwebjs_cache`; registrar tamaños, hashes y SHA.
6. Cifrar y subir artifact; comprobar que el artifact contiene solo ciphertext y se puede descargar desde testing.

### 2. Reemplazar testing

1. Descargar el artifact, validar AES-GCM y hashes antes de extraer.
2. Restaurar la DB como reemplazo completo, eliminando tablas/datos exclusivos de testing; validar nombre DB y usuario contra configuración de testing antes de ejecutar cualquier operación destructiva.
3. Reemplazar `backend/public` y directorios LocalAuth/cache, no fusionarlos con archivos sobrantes. Mantener el respaldo previo fuera de las rutas activas.
4. Actualizar checkout al SHA decidido de `main`; conservar dependencias y configuración/secretos propios de testing sin copiar `.env` desde Prometheus.
5. Ejecutar migraciones que correspondan para ese SHA contra la DB ya restaurada, bajo verificación de destino; no ejecutar `restore.sh` sin adaptarlo al reemplazo total.
6. Verificar ownership/permisos con el usuario de servicio real y confirmar que los servicios no se arrancaron automáticamente en ambos hosts.

### 3. Validar y promover

Arrancar testing como único backend con esas sesiones. Verificar:

- [ ] DB conectada; tablas y conteos críticos esperados comparados con origen.
- [ ] Panel frontend y API responden en las URLs acordadas.
- [ ] Imágenes, archivos y medios de tickets abren correctamente.
- [ ] Canales WhatsApp mantienen sesión o presentan un procedimiento esperado de reconexión; no abrir sesiones desde Prometheus.
- [ ] Telegram y otras integraciones esenciales funcionan sin exponer tokens en logs.
- [ ] PM2/procesos estables y logs sin errores críticos; smoke tests que apliquen.
- [ ] Workflow de deploy apunta a testing antes del corte y a un solo destino de producción después.

Con aceptación explícita, dirigir el tráfico productivo a testing y marcar el SHA desplegado. Mantener Prometheus detenido mientras se valida testing como producción.

## Rollback

Activar si falla restauración, salud de aplicación, medios, canales o URL productiva:

1. Detener el backend de testing antes de reactivar Prometheus, especialmente si LocalAuth ya se copió.
2. Si el destino debe volver a su estado anterior, restaurar sus backups verificados de DB, archivos y código.
3. Volver el tráfico al mecanismo/URL acordado para Prometheus; no adivinar cambios DNS/proxy.
4. Arrancar únicamente Prometheus con su estado/sesión de rollback. Si el usuario aceptó writes en testing después del corte, registrar el posible desfase de datos antes de rollback.
5. Desactivar el workflow hacia testing o el job de destino nuevo hasta corregir la causa; conservar logs sin secretos y revisar artifact/temporales.

No borrar backups de rollback hasta que el usuario confirme estabilidad y cierre de la ventana.

## Bloqueos que deben cerrarse

- [ ] Runner registrado y job de verificación exitoso.
- [ ] Ruta real/servicios/DB de testing confirmados; resolver discrepancia documental.
- [ ] URL y mecanismo de cambio de tráfico confirmados.
- [ ] Backup total de destino validado y restauración destructiva probada en entorno seguro.
- [ ] Capacidad/quota de artifact comprobada; cifrado y descifrado autenticado probados.
- [ ] Definir el rol de Prometheus después del corte y el workflow de producción final.
- [ ] Confirmar con el usuario la ventana destructiva antes de ejecutar.

## Fuentes verificadas

- `.github/workflows/deploy.yml`
- `scripts/deploy.sh`
- `scripts/auto-deploy.sh`
- `scripts/instalar-runner.sh`
- `scripts/setup-auto-deploy.sh`
- `scripts/migrate-testing-releases.sh`
- `docs/tunel-testing.md`
- `backup.sh` y `restore.sh`
- `AGENTS.md` del proyecto
