# ProIT CRM®

<p align="center">
  <a href="https://www.codefactor.io/repository/github/rtenorioh/press-ticket"><img src="https://www.codefactor.io/repository/github/rtenorioh/press-ticket/badge" alt="CodeFactor" /></a>

  <img alt="Validador Swagger" src="https://img.shields.io/swagger/valid/3.0?specUrl=https%3A%2F%2Fraw.githubusercontent.com%2Frtenorioh%2FPress-Ticket%2Fmain%2Fbackend%2Fsrc%2Fswagger.json">

  <img alt="Tamaño del repositorio" src="https://img.shields.io/github/repo-size/rtenorioh/Press-Ticket">

  <a href="https://github.com/rtenorioh/Press-Ticket/commits/master">
    <img alt="Último commit de GitHub" src="https://img.shields.io/github/last-commit/rtenorioh/Press-Ticket">
  </a>
       
   <a href="https://github.com/rtenorioh/Press-Ticket/stargazers">
    <img alt="Estrellas" src="https://img.shields.io/github/stars/rtenorioh/Press-Ticket">
  </a>

  <a href="https://github.com/rtenorioh/Press-Ticket/network">
    <img alt="Bifurcaciones de GitHub" src="https://img.shields.io/github/forks/rtenorioh/Press-Ticket">
  </a>

  <img alt="Lenguaje principal de GitHub" src="https://img.shields.io/github/languages/top/rtenorioh/Press-Ticket">

  <img alt="Versión de GitHub (última por fecha)" src="https://img.shields.io/github/v/release/rtenorioh/Press-Ticket">

  <img alt="Fecha de lanzamiento de GitHub" src="https://img.shields.io/github/release-date/rtenorioh/Press-Ticket">
</p>

## Acerca de

### Descripción del Sistema ProIT CRM®

El sistema multicanal "ProIT CRM" fue diseñado para ofrecer una solución eficiente e integrada de soporte al cliente, facilitando la comunicación y la gestión de tickets de atención. Este sistema innovador permite a las empresas automatizar y optimizar sus procesos de atención al cliente a través de múltiples canales de comunicación, como WhatsApp, Facebook, Instagram, Telegram y WebChat.

## Funcionalidades Principales

### 1. Gestión de Tickets:

- Creación, seguimiento y resolución de tickets de soporte.
- Sistema de prioridad para la organización de tickets.
- Historial completo de interacciones con el cliente.

### 2. Integración con WhatsApp (wwebjs), Facebook, Instagram, Telegram y WebChat:

- Recepción y envío de mensajes directamente a través de WhatsApp.
- Soporte para mensajes de texto, imágenes y documentos.

### 3. Interfaz de Usuario:

- Panel de control intuitivo y fácil de usar.
- Visualización de tickets abiertos, en progreso y cerrados.
- Filtros y búsquedas para localización fácil de tickets.

### 4. Automatización de Procesos:

- Respuestas rápidas para preguntas frecuentes.
- Notificaciones automáticas para actualizaciones de tickets.
- Sistema de asignación automática de tickets para agentes específicos.

### 5. Personalización y Configuración:

- Configuración de horarios de atención.
- Personalización de mensajes automáticos.
- Integración con otros sistemas y APIs.

## Tecnologías Utilizadas

- Lenguaje de Programación: JavaScript y TypeScript
- Base de Datos: MySQL
- Integración con WhatsApp: Utilización de APIs para comunicación bidireccional.
- Integración con otros canales: Utilización de webhook para comunicación entre ProIT CRM® y canales activos, por medio del Notificame Hub.

## Beneficios

- Mejora en la Eficiencia de la Atención: Con la automatización y la organización de tickets, los agentes pueden responder de manera más rápida y eficiente.
- Satisfacción del Cliente: Las respuestas rápidas y precisas aumentan la satisfacción del cliente.
- Facilidad de Uso: La interfaz intuitiva y las funcionalidades automáticas hacen que el sistema sea fácil de usar tanto para los agentes como para los clientes.

Este sistema es ideal para empresas que buscan mejorar su atención al cliente a través de WhatsApp (wwebjs), Facebook, Instagram, Telegram y WebChat, proporcionando una experiencia más integrada y eficiente.

## Requisitos

| ---         | Mínimo | Recomendado | Probado |
| ----------- | ------ | ----------- | ------- |
| Node JS     | 22.x   | 22.x        | 22.x    |
| Ubuntu      | 20.x   | 22.x        | 22.x    |
| Memoria RAM | 4Gb    | 6Gb         | 8Gb     |

## Referencia

- El Sistema ProIT CRM® fue desarrollado el 13 de marzo de 2022, basándose en el [Sistema Whaticket Community](https://github.com/canove/whaticket-community), desarrollado por [Cassio Santos](https://github.com/canove).

## Grupo en Telegram

<a href="https://t.me/+akuzB2BzXitlMDkx">
    <img alt="Telegram" src="https://img.shields.io/badge/telegram-online-blue.svg?style=for-the-badge&logo=telegram">
</a>

## Instalación

- [Local - Instalación Manual](https://github.com/rtenorioh/Press-Ticket/blob/main/docs/INSTALL_localhost.md);
- [VPS - Instalación Manual](https://github.com/rtenorioh/Press-Ticket/blob/main/docs/INSTALL_MANUAL_VPS.md);
- [VPS - Instalador Automático](https://github.com/rtenorioh/Press-Ticket/blob/main/docs/INSTALL_AUTOMATICO_VPS.md);
- [VPS - Actualizador Automático](https://github.com/rtenorioh/Press-Ticket/blob/main/docs/UPDATE_VPS.md);
- [phpmyadmin](https://github.com/rtenorioh/Press-Ticket/blob/main/docs/INSTALL_phpmyadmin.md); y
- [Zona Horaria](https://github.com/rtenorioh/Press-Ticket/blob/main/docs/INSTALL_horarioVPS.md).

## Despliegue (Flujo de Git)

`main` es la rama de despliegue: **todo el código que corre en producción sale de `main`**. Trabajá siempre sobre `main` (o sobre una rama con nombre tipo `feature/algo` que mergees a `main` al terminar) y no dejes trabajo acumulado en ramas de respaldo como `backup-antes-debug`.

### Cómo actualizar el código en el servidor

```bash
cd /home/deploy/Press-Ticket
git checkout main
git pull origin main
```

### Compilar y reiniciar los servicios

```bash
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
pm2 restart itn-backend itn-frontend
pm2 status
```

> **Si hay una rama de backup con trabajo sin mergear** (ej. `backup-antes-debug`), mergeala a `main` antes de desplegar:
> `git checkout main && git merge --ff-only backup-antes-debug && git push origin main`

### Configurar la rama por defecto en GitHub

Para que cualquier `git clone` o descarga desde GitHub baje la versión correcta, la rama por defecto del repositorio debe ser **`main`**: Settings del repo → **Branches** → **Default branch** → `main`.

## Canales disponibles:

- WhatsApp (wwebjs);
- Telegram;
- Facebook;
- Instagram; y
- WebChat.

Para activar **Facebook**, **Instagram**, **Telegram** y **WebChat**:

1. [Realizá tu registro acá](https://hub.notificame.com.br/signup/registrar?from=@pressticket);
2. Adquirí la cantidad deseada de canales usando el cupón de descuento: **PRESS60**;
3. Conectate a los canales que deseés activar, siguiendo las instrucciones al conectarte; y
4. Insertá el token de tu Account en la página de Configuraciones para finalizar la integración.

> ¡Usá el cupón de descuento que ofrecemos para obtener 50% de descuento en la compra de los canales!

## Si querés ayudar a mantener el proyecto, podés contribuir con una de las opciones abajo:

- Mensualmente:
  - Argentina:
    - Clave PIX:
    - ![49.700.429/0001.80](img/image.png)
    - CUIT: 49.700.429/0001.80
  - Otros Países:
    - [Contribuir vía Paypal](https://www.paypal.com/donate/?hosted_button_id=TY7GF22DBYZSA)

## Registro de todos los cambios:

- [Changelog](https://github.com/rtenorioh/Press-Ticket/blob/main/docs/CHANGELOG.md)

## Demo:

```bash
https://demo.pressticket.com.br
```

| Tipo de Usuario | Usuario                        | Contraseña  |
| --------------- | ------------------------------ | ----------- |
| Administrador   | admin@pressticket.com.br       | admin       |
| Administrador Master | masteradmin@pressticket.com.br | masteradmin |

## Actividades Recientes [![Período de tiempo](https://images.repography.com/26937047/rtenorioh/Press-Ticket/recent-activity/21bd728a8e3625b547c91617b3f0fc2a_badge.svg)](https://github.com/rtenorioh/Press-Ticket/commits)

[![Gráfico de línea de tiempo](https://images.repography.com/26937047/rtenorioh/Press-Ticket/recent-activity/21bd728a8e3625b547c91617b3f0fc2a_timeline.svg)](https://github.com/rtenorioh/Press-Ticket/commits)
[![Gráfico de estado de solicitudes de extracción](https://images.repography.com/26937047/rtenorioh/Press-Ticket/recent-activity/21bd728a8e3625b547c91617b3f0fc2a_prs.svg)](https://github.com/rtenorioh/Press-Ticket/pulls)

## Principales contribuidores

[![Principales contribuidores](https://images.repography.com/26937047/rtenorioh/Press-Ticket/top-contributors/21bd728a8e3625b547c91617b3f0fc2a_table.svg)](https://github.com/rtenorioh/Press-Ticket/graphs/contributors)

## Hospedaje Recomendado

<p align="center">
  <a href="https://painelcliente.com.br/aff.php?aff=55">
    <img src="img/hosteg1280x480.png" alt="Hosteg Hospedaje y Servidores" />
  </a>
</p>

La **[Hosteg](https://painelcliente.com.br/aff.php?aff=55)** (Hosteg Hospedaje y Servidores LTDA) es un proveedor brasileño enfocado en infraestructura de alto rendimiento, operando con red propia en múltiples ubicaciones geográficas.

### 📊 Información Corporativa

* **Razón Social:** Hosteg Hospedaje y Servidores LTDA.
* **CNPJ:** 15.527.432/0001-22.
* **Sedes:** Bom Jesus do Itabapoana (RJ) e Içara (SC).
* **Infraestructura de Red:** Posee Sistema Autónomo propio bajo el ASN AS213738.

### 🚀 Diferenciales Técnicos

* **Almacenamiento:** Tecnología 100% NVMe en todos los planes, garantizando velocidades de I/O superiores.
* **Disponibilidad:** Uptime garantizado de 99,99% en infraestructura Tier 3.
* **Procesamiento:** Servidores equipados con procesadores Intel Xeon, AMD Ryzen y AMD EPYC.
* **Software:** Utiliza LiteSpeed PRO (servidor web de alta eficiencia) y panel de control DirectAdmin.
* **Latencia:** Promedio de 1ms en Brasil, con datacenters en São Paulo (SP), Río de Janeiro (RJ) y Paraíba (PB).

### 🛠 Servicios Principales

| Servicio | Características |
| :--- | :--- |
| **Hospedaje WordPress** | Optimizado con LiteSpeed e incluye Elementor PRO Original gratuito. |
| **Cloud VPS NVMe** | Opciones con vCPU dedicada o compartida e incluye snapshots. |
| **Cloud N8N** | Ambiente preconfigurado para automatizaciones de workflow. |
| **Servidores Dedicados** | Soluciones Baremetal y servidores enfocados en Inteligencia Artificial (IA) con GPUs. |

### 🛡 Seguridad y Soporte

* **Certificados:** SSL Gratuito para todos los dominios hospedados.
* **Protección:** Anti-DDoS de alto nivel y Antispam profesional incluidos.
* **Soporte:** Atención humanizado 24/7 con soporte vía Anydesk para auxilio remoto en configuraciones críticas.
* **Migración:** Servicio de migración gratuita y asistida para clientes nuevos.