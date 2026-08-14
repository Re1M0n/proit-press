# Acceso a testing (túnel inverso temporal)

**testing** (`pressticket`) es una VM Ubuntu 24.04 (PVE), detrás de CGNAT — no tiene IP
pública entrante. El único acceso desde afuera es un **túnel SSH inverso temporal**
que testing abre hacia **prometheus** (`186.182.214.12`), que sí tiene IP estable.

## Comando exacto que funciona (correr DENTRO de testing)

En una terminal **dentro de la VM** (sesión RustDesk o SSH), como usuario `deploy`:

```bash
ssh -N -R 2223:localhost:22 deploy@186.182.214.12
```

> **Puerto 2223 (no 2222):** en la red del operador hay un túnel automático
> (IP residencial `181.105.199.111`, telecom.net.ar) que abre `-R 2222` en loop y
> pelea el puerto con testing. Para evitar el conflicto, testing usa **2223** y el
> 2222 queda para ese túnel (inofensivo).

- Usa la key por defecto `~/.ssh/id_ed25519` de `deploy` (la personal `theyormn@gmail.com`,
  autorizada en `~/.ssh/authorized_keys` de `deploy@prometheus`). No hace falta `-i`.
- `-N` solo evita abrir un shell; el túnel queda corriendo en esa terminal.
- Se cierra con Ctrl+C (o con el timeout si se usa el script).

### ⚠️ Regla de oro

El `-R <puerto>:localhost:22` reenvía al `localhost:22` **de la máquina donde corre el
comando**. Si se ejecuta en la PC local (Windows), el túnel apunta al sshd de Windows
(no a testing). **Siempre verificar antes**:

```bash
cat /etc/os-release | head -1    # → Ubuntu 24.04...  = estás en testing
```

## Script alternativo (con timeout automático)

En el repo: `scripts/open-admin-tunnel.sh` — valida que estés en Ubuntu y abre el túnel
por N minutos (default 30), en el puerto 2223:

```bash
bash scripts/open-admin-tunnel.sh 60
```

## Desde la máquina del operador (acceso a testing por el túnel)

Con el túnel arriba, entrar a testing vía prometheus (puerto 2223):

```bash
ssh -i ~/.ssh/itn_servidor \
  -o ProxyCommand="ssh -o BatchMode=yes -i ~/.ssh/itn_servidor -W %h:%p deploy@prometheus" \
  -p 2223 deploy@127.0.0.1
```

> Nota: en este OpenSSH (Windows) el `-J` no propaga la key al host de salto; por eso
> se usa `ProxyCommand` explícito con `-i`.

## Limpieza de túneles colgados

Si un túnel muere sin cerrarse, su sesión sshd en prometheus queda viva y el puerto
ocupado. Prometheus corre `scripts/cleanup-stale-sshd.sh` por cron (cada 5 min), que mata
sesiones `sshd: deploy` sin pty con más de 2h de vida. Para liberar el puerto a mano:

```bash
ssh deploy@prometheus "fuser -k 2223/tcp"
```

## Auto-deploy (modelo pull, sin túnel)

testing **no** necesita el túnel para actualizarse: un cron corre
`scripts/auto-deploy.sh` cada 3 minutos, que hace `git fetch --tags` y aplica
`scripts/deploy.sh` **solo cuando aparece una release nueva** (un tag `v*`
público). Los commits/pushes intermedios a `main` **no** disparan deploy.

- Kill-switch: `touch .autodeploy-off` (dentro del repo) pausa los deploys.
- Log: `/home/deploy/auto-deploy.log` (solo registra acciones).
- Overrides para installs adaptados: `AUTODEPLOY_REPO` y `AUTODEPLOY_DEPLOY`
  (testing los usa para apuntar a `/home/deploy/proit-press` y su `deploy.sh`
  adaptado en `/home/deploy/.autodeploy/`).
- Migración (una vez, dentro de testing):
  `bash scripts/migrate-testing-releases.sh` — pasa a release-based y elimina
  el hotfix local de Telegram (la auto-respuesta de saludo está **desactivada**
  en `main`; el parche `telegram-noreply.patch` quedó obsoleto).

### Flujo de actualización recomendado

1. Push de cambios a `main` → solo compila en CI (`ci.yml`), **no despliega**.
2. Crear una release/tag `vX.Y.Z` en GitHub → en ≤3 min testing despliega esa tag.
3. Producción (prometheus): deploy **manual** desde Actions (`Deploy` workflow).

## Mantenimiento de disco

### Layout real del disco (agosto 2026)

La VM de testing tiene **40 GiB** (`/dev/sda`, QEMU), pero la instalación de Ubuntu
creó el LV raíz con solo **19 GiB** — el resto (~19 GiB) quedó **sin asignar** en el
volumen group. Por eso la raíz llegaba al 94–96% con tan poco uso real.

```
/dev/sda1  1M   BIOS boot
/dev/sda2  2G   Linux filesystem (boot)
/dev/sda3  38G  Linux filesystem (PV de LVM → VG ubuntu-vg)
LV raíz:   19G  /dev/mapper/ubuntu--vg-ubuntu--lv   ← había que extenderlo
```

### Extender la raíz a todo el disco (lvextend)

Correr en testing con sudo:

```bash
sudo vgs                                                          # confirmar ~19G libres en el VG
sudo lvextend -l +100%FREE /dev/mapper/ubuntu--vg-ubuntu--lv      # LV → todo el VG
sudo resize2fs /dev/mapper/ubuntu--vg-ubuntu--lv                  # agrandar el filesystem
df -h /                                                           # verificar: raíz → ~38G
```

### Liberar espacio (si vuelve a faltar)

- Cache de npm (a veces 300–400M): `npm cache clean --force`.
- Backups de la app en `/home/deploy/proit-press/backups/` (un dump completo de BD
  + `public` + sesiones puede pesar 2+ GiB). Si ya no se necesita el más viejo,
  comprimirlo o borrarlo: `tar czf backups/<nombre>.tar.gz backups/<carpeta> && rm -rf backups/<carpeta>`.
- Sesiones de WhatsApp en `backend/.wwebjs_auth/` (varios GiB con el tiempo) — solo
  borrar sesiones que ya no se usan.

### Alerta de disco

El deploy de React necesita ~1–2 GiB libres durante el build. Si la raíz queda
por debajo de ~2 GiB, el auto-deploy puede fallar a mitad del build (build parcial
que ocupa espacio sin liberar). Monitorear `df -h /` después de cada deploy.
