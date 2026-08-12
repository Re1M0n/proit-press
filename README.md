# ProIT CRM®

## Acerca de

### Descripción del Sistema ProIT CRM®

El sistema multicanal "ProIT CRM" fue diseñado para ofrecer una solución eficiente e integrada de soporte al cliente, facilitando la comunicación y la gestión de tickets de atención. Este sistema innovador permite a las empresas automatizar y optimizar sus procesos de atención al cliente a través de múltiples canales de comunicación, como WhatsApp y Telegram.

## Funcionalidades Principales

### 1. Gestión de Tickets:

- Creación, seguimiento y resolución de tickets de soporte.
- Sistema de prioridad para la organización de tickets.
- Historial completo de interacciones con el cliente.

### 2. Integración con WhatsApp y Telegram:

- Recepción y envío de mensajes a través de WhatsApp (wwebjs) y Telegram (bot nativo).
- Soporte para mensajes de texto, imágenes, documentos y media.

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
- Integración con Telegram: bot nativo mediante la API de Telegram (token creado con BotFather).

## Beneficios

- Mejora en la Eficiencia de la Atención: Con la automatización y la organización de tickets, los agentes pueden responder de manera más rápida y eficiente.
- Satisfacción del Cliente: Las respuestas rápidas y precisas aumentan la satisfacción del cliente.
- Facilidad de Uso: La interfaz intuitiva y las funcionalidades automáticas hacen que el sistema sea fácil de usar tanto para los agentes como para los clientes.

Este sistema es ideal para empresas que buscan mejorar su atención al cliente a través de WhatsApp y Telegram, proporcionando una experiencia más integrada y eficiente.

## Requisitos

| ---         | Mínimo | Recomendado | Probado |
| ----------- | ------ | ----------- | ------- |
| Node JS     | 22.x   | 22.x        | 22.x    |
| Ubuntu      | 20.x   | 22.x        | 22.x    |
| Memoria RAM | 4Gb    | 6Gb         | 8Gb     |

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

## Créditos

ProIT CRM está basado en el proyecto de código abierto [Press-Ticket](https://github.com/rtenorioh/Press-Ticket), desarrollado originalmente por Robson Tenório, y este a su vez en el [Sistema Whaticket Community](https://github.com/canove/whaticket-community), creado por [Cassio Santos](https://github.com/canove). Gracias a esos proyectos y a su comunidad por la base sobre la que está construido este sistema.
