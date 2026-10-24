# Migración de Press-Ticket de Prometheus a testing — diseño

- **Fecha:** 2026-10-22
- **Proyecto:** `proit-press` / Press-Ticket
- **Estado:** EJECUTADO el 24/10/2026 - `pressticket` es producción; `prometheus` quedó como servidor anterior. Ver [`../../produccion.md`](../../produccion.md).
- **Plan:** [`../plans/2026-10-22-migracion-prometheus-a-testing-plan.md`](../plans/2026-10-22-migracion-prometheus-a-testing-plan.md)

## Objetivo

Preparar la instancia `testing` (`pressticket`) para que reemplace a la instancia de Prometheus como producción el lunes 26/10/2026. El alta inicial del runner self-hosted se hará desde la consola de testing el viernes 23/10/2026 después de hora. Después del alta, el despliegue de testing debe poder seguir los pushes a `main` que hayan pasado CI.

La migración aprobada comprende reemplazo completo de la base de datos destino, archivos de `backend/public`, sesiones y caché de `whatsapp-web.js`, y código de la versión actual de `main` que se acuerde para el corte.

## Decisiones confirmadas

1. **Destino:** VM de testing conocida como `pressticket`, documentada como Ubuntu 24.04 detrás de CGNAT.
2. **Reemplazo total:** se permite sustituir los datos actuales de testing por los de Prometheus. Hay que respaldar el destino antes de sobrescribirlo.
3. **Datos a mover:** base MySQL, `backend/public`, `.wwebjs_auth` y `.wwebjs_cache`.
4. **Sesiones WhatsApp:** se deben trasladar para intentar conservarlas. Ambos backends deben permanecer detenidos durante la instantánea y copia final; nunca operar la misma sesión de WhatsApp desde las dos instancias a la vez.
5. **Código:** destino con el commit de `main` seleccionado para el corte; guardar su SHA y verificar que es el commit que se desea publicar.
6. **Transporte:** artifact temporal de GitHub Actions cifrado con AES-GCM. Se acordó usar el secreto `PRESSTICKET_MIGRATION_KEY` y una retención corta (un día). No guardar ni comunicar la clave en el chat.
7. **Despliegues:** preparar un runner en testing con etiqueta `pressticket` para desplegar después de CI exitoso en `main`.

## Estado técnico verificado

- `.github/workflows/deploy.yml` ejecuta el despliegue productivo en el runner `[self-hosted, prometheus]` y llama `scripts/deploy.sh`.
- `scripts/deploy.sh` está hecho para `/home/deploy/Press-Ticket` y reinicia `itn-backend` / `itn-frontend`; no debe usarse sin adaptación como deploy de testing.
- `scripts/auto-deploy.sh` sigue tags `v*`, no cada push. `docs/tunel-testing.md` describe testing en `/home/deploy/proit-press` y el deploy adaptado en `/home/deploy/.autodeploy/`.
- Hay una discrepancia por resolver: `scripts/setup-auto-deploy.sh` presupone `/home/deploy/Press-Ticket`, mientras `scripts/migrate-testing-releases.sh` y `docs/tunel-testing.md` usan `/home/deploy/proit-press`.
- `scripts/instalar-runner.sh` acepta una etiqueta como segundo argumento, usa `$HOME/actions-runner` y supervisa el runner con PM2 (`github-runner` por defecto). Su contenido actual se puede usar para registrar `pressticket` si está disponible en testing.
- `backup.sh` incluye DB, `public` y sesiones, pero usa `.env`, toma como directorio predeterminado `/home/deploy/Press-Ticket`, no detiene los servicios, no contiene el código y no cifra el respaldo. Además, el mensaje final concatena dos llamadas `echo`. No es por sí solo el procedimiento aprobado de migración.
- `restore.sh` importa sobre una DB existente y extrae archivos encima del destino; no garantiza eliminar tablas/archivos adicionales de testing. No cumple por sí solo el requisito de reemplazo completo.
- Medición reportada desde Prometheus el 22/10/2026: `backend/public` 602 MB, `.wwebjs_auth` 4.1 GB, `.wwebjs_cache` 81 MB; espacio libre reportado 59 GB. El tamaño final comprimido/cifrado no está medido.

## Diseño de la transferencia

1. Crear y verificar backups independientes del estado actual de Prometheus y testing.
2. Definir un paquete de migración con el dump MySQL, `public`, `.wwebjs_auth`, `.wwebjs_cache` y metadatos de versión (SHA de código, fecha, tamaños y hashes). No incluir `.env`, secretos de Infisical, tokens de runner ni la clave AES.
3. Cifrar el paquete con AES-256-GCM usando una clave de 32 bytes derivada/representada mediante un formato documentado para `PRESSTICKET_MIGRATION_KEY`. Generar un nonce aleatorio nuevo por paquete y conservar nonce/tag junto al ciphertext.
4. Subir solo el ciphertext como artifact, con retención de un día. Antes de parar servicios, comprobar espacio, tamaño de artifact y disponibilidad/cuota de Actions.
5. En testing, verificar autenticidad GCM antes de extraer. Preparar el reemplazo de DB y directorios en ubicaciones temporales; instalar cada componente solo después de verificar integridad y backups.
6. Iniciar únicamente el backend de testing con la sesión WhatsApp trasladada. Validar panel/API, DB, medios y canales. Mantener Prometheus apagado hasta que testing sea aceptado o se ejecute rollback.
7. Al finalizar, eliminar artifacts y temporales de acuerdo con el procedimiento de limpieza; conservar los backups de rollback durante el período acordado.

## Requisitos para el despliegue continuo

- Añadir un deploy específico de testing que use `runs-on: [self-hosted, pressticket]` y solo se ejecute después de CI exitoso para `main`; permitir también ejecución manual controlada.
- El job/script debe desplegar en la ruta real confirmada de testing. No llamar al `scripts/deploy.sh` actual sin adaptarlo: hoy apunta a la ruta y PM2 de Prometheus.
- Evitar que el auto-deploy por tags y el nuevo workflow desplieguen concurrentemente. Pausar el cron mediante el kill-switch existente y retirar/sustituir el cron solo después de validar el workflow.
- En el corte a producción, el deploy de producción debe quedar apuntando al destino activo. No dejar un workflow que vuelva a arrancar Prometheus ni dos despliegues que controlen la misma sesión WhatsApp.

## Pendiente de confirmar antes de ejecutar

- Ruta de repo, usuario de ejecución, servicios PM2 y configuración DB reales de testing. Los documentos locales discrepan sobre la ruta.
- URLs públicas frontend/backend y el mecanismo de tráfico que hará que testing reemplace a producción.
- Espacio libre real en testing y capacidad/cuota de GitHub Actions para el artifact final.
- Revisión de disponibilidad de ambos backups y procedimiento exacto de restauración total, incluyendo nombres de DB y eliminación de datos destino sobrantes.
- Destino de Prometheus después del corte (apagado, retenido como rollback u otro rol) y cuándo reanudar/desactivar el workflow productivo allí.
- Quién genera/carga `PRESSTICKET_MIGRATION_KEY` en GitHub y confirma que su formato coincide con la herramienta de cifrado.

## Criterios de aceptación

- El runner aparece online en GitHub con etiqueta `pressticket` y un job inocuo confirma que se ejecuta en la VM correcta.
- Un push de prueba a `main` que pase CI despliega únicamente el commit validado en testing y deja ambos servicios saludables.
- El paquete incluye todos los componentes acordados, se sube solo cifrado y su autenticidad se valida antes de extraer.
- El destino queda reemplazado (no fusionado) y los conteos/medios esperados se comprueban contra el origen.
- Las sesiones WhatsApp se prueban en testing con Prometheus detenido; no quedan dos procesos usando las mismas sesiones.
- Existe un rollback probado/documentado con backups de ambos lados y criterio de decisión.
- La URL de producción sirve testing y el workflow posterior despliega al único destino de producción activo.

## No ejecutado

A la fecha de este diseño no se registró el runner de testing, no se modificó el workflow, no se generó el artifact, no se respaldó/restauró ninguna base y no se cambió el tráfico de producción.
