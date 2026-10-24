# Acceso a producción — histórico del túnel inverso

> **Obsoleto desde el 24/10/2026.** `pressticket` es **producción** y se accede por
> **Tailscale**. El túnel que describe este documento ya no funciona ni hace falta.
> Guía vigente: [`produccion.md`](produccion.md).

Este documento se conserva porque describe cómo se accedía a la VM cuando era el
entorno de testing (antes del cutover del 24/10/2026).

## Qué era el túnel

`pressticket` está detrás de CGNAT, sin puertos entrantes. El acceso remoto se resolvía
abriendo un túnel inverso hacia el puerto 22 de Prometheus:

```bash
# Ejecutado en la VM: publica su :22 en el :2223 de Prometheus
ssh -N -R 2223:localhost:22 deploy@186.182.214.12
```

y desde cualquier máquina autorizada por Prometheus:

```bash
ssh -p 2223 deploy@186.182.214.12
```

El puerto 2223 se comparte entre varios servidores, así que a veces quedaba ocupado.
Prometheus corría `scripts/cleanup-stale-sshd.sh` por cron (cada 5 minutos) para matar
sesiones `sshd: deploy` sin pty con más de 2h. Para liberarlo a mano:

```bash
ssh deploy@prometheus "fuser -k 2223/tcp"
```

## Por qué quedó obsoleto

El **20/10/2026 se cerró el puerto 22 público** de Prometheus: solo quedan 80, 81 y 443
para el NPM. El túnel quedaba colgado esperando el SYN y nunca establecía el forward.
Verificado el 24/10/2026: `186.182.214.12:22` no responde; `:443` sí.

## Qué lo reemplazó

Tailscale en ambas máquinas. Al momento de la migración: `pressticket` =
`100.102.56.6`, `prometheus` = `100.127.54.119`. Como Prometheus sigue en la tailnet
(y conserva el puerto 22 accesible por esa interfaz), sirve de salto para llegar a la
VM desde fuera de la red. Ver [`produccion.md`](produccion.md).

## Auto-deploy

Lo que en su momento se documentó acá como "auto-deploy de testing" (cron que seguía
tags `v*`) **ya no es así**: producción sigue `main` cada 3 minutos. Detalle en
[`produccion.md`](produccion.md).
