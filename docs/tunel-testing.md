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
`scripts/auto-deploy.sh` cada 3 minutos, que hace `git fetch` y aplica
`scripts/deploy.sh` solo cuando `main` cambió. Kill-switch: `touch .autodeploy-off`.
Instalación (una vez, dentro de testing): `bash scripts/setup-auto-deploy.sh`.
