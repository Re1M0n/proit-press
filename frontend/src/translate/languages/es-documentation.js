const documentationMessages = {
  documentation: {
    title: "Guía de la Plataforma",
    subtitle: "Todo lo que necesitás saber para usar la plataforma professionalIT",
    menuItem: "Guía de la Plataforma",
    visitPage: "Abrir página",
    general: {
      title: "General",
      dashboard: "El Dashboard es tu panel de control central: muestra la cantidad de tickets abiertos, en atención y cerrados, además de gráficos de rendimiento por sector, canal y usuario. Es la primera pantalla que vas a ver al entrar a la plataforma.",
      tickets: "En Tickets atendés todas las conversaciones con tus clientes, tanto por WhatsApp como por Telegram. Podés aceptar un ticket, responder citando el mensaje anterior, transferirlo a otro agente o sector, y cerrarlo cuando quede resuelto.",
      contacts: "La sección de Contactos te permite registrar y gestionar la información de tus clientes. Podés organizarlos con etiquetas personalizadas, consultar sus datos de contacto y revisar su historial.",
      blockedContacts: "En Contactos Bloqueados administrás los contactos bloqueados en WhatsApp. Podés verlos por canal, consultar sus datos y desbloquearlos cuando sea necesario.",
      quickAnswers: "Las Respuestas Rápidas son mensajes predefinidos que agilizan tu atención. Creá atajos de texto para respuestas frecuentes y ahorrá tiempo en cada conversación. También podés usar el divisor automático con |q para partir un mensaje largo en varias partes con envío diferido.",
      tags: "Con las Etiquetas organizás y clasificás contactos de forma eficiente. Creá etiquetas de colores personalizadas que facilitan la búsqueda y el filtrado de tus contactos.",
      clientStatus: "En Estado de Clientes creás y administrás estados personalizados para clasificar tus contactos: Activo, Inactivo, Potencial, VIP, entre otros. Así podés segmentar tu cartera y hacerle seguimiento.",
      videos: "La sección de Videos te permite gestionar y compartir contenido en video con tu equipo. Agregá videos de YouTube, controlá qué usuarios pueden verlos y reproducilos directamente en la plataforma."
    },
    administration: {
      title: "Administración",
      users: "En Usuarios creás y gestionás los operadores del sistema. Definí perfiles de acceso (administrador y agente) y permisos específicos para cada usuario.",
      queues: "En Sectores configurás las áreas o departamentos de la empresa. Organizá la distribución de los atendimientos y definí reglas de encaminamiento para cada sector.",
      channels: "En Canales conectás y administrás todos tus canales de atención: WhatsApp (ProIT, MCSI) y Telegram. Escaneá el código QR para vincular un número de WhatsApp, cargá el token de un bot para el canal de Telegram y monitoreá el estado de cada conexión en tiempo real.",
      groups: "Gestión completa de grupos de WhatsApp: creá grupos, configurá permisos, agregá o quitá participantes, promové administradores, administrá enlaces de invitación y actualizá la información del grupo.",
      queueMonitor: "El Monitor de Sectores te da una vista en tiempo real del desempeño de cada sector: cantidad de tickets, tiempo promedio de espera, volumen de atenciones y distribución de carga entre agentes para optimizar el flujo de trabajo.",
      settings: "En Configuración personalizás la plataforma: idioma, apariencia, notificaciones y otras opciones para adaptarla a las necesidades de tu empresa."
    },
    api: {
      title: "API",
      apidocs: "La Documentación de la API ofrece una guía interactiva completa para desarrolladores: ejemplos prácticos de peticiones y respuestas para integrar la plataforma con otros sistemas.",
      apikey: "En API Keys gestionás los tokens de acceso a la API. Creá, revocá y controlá los permisos de cada clave para mantener seguras las integraciones.",
      api: "La sección API explica cómo usar la API REST de la plataforma para integrarla con otros sistemas y aplicaciones de tu empresa: envío de mensajes de texto y multimedia, consulta de tickets y más."
    },
    system: {
      title: "Monitoreo del Sistema",
      monitoring: "Monitoreo del Sistema",
      memoryUsage: "El monitor de Uso de Memoria muestra en tiempo real cuánta memoria RAM consume la plataforma: gráficos históricos de uso, picos de consumo y alertas para evitar la lentitud del servidor.",
      cpuUsage: "En Uso de CPU analizás el rendimiento del procesador del servidor: utilización por núcleo y los procesos que más recursos consumen, para prevenir cuellos de botella.",
      diskSpace: "El monitor de Espacio en Disco muestra el almacenamiento de la plataforma: espacio libre y total, las carpetas que más pesan y alertas antes de que el almacenamiento se vuelva crítico.",
      databaseStatus: "El Estado de la Base de Datos da una visión completa de su salud: conexiones activas, tamaño de las tablas, consultas lentas y tiempo de respuesta.",
      systemHealth: "Monitoreá tus canales y el sistema en general: estado de conexión, tiempo de actividad, latencia y errores.",
      networkStatus: "El monitor de Red diagnostica la conectividad del servidor: latencia, pérdida de paquetes y disponibilidad de los servicios esenciales para que la plataforma esté siempre accesible."
    },
    maintenance: {
      title: "Mantenimiento del Sistema",
      backup: "La Central de Backup protege los datos de tu negocio. Configurá backups automáticos, revisá el historial de copias y restaurá los datos cuando sea necesario con unos pocos clics.",
      errorLogs: "Los Logs de Error ayudan a identificar y resolver problemas técnicos: mensajes detallados con fecha, hora y contexto para mantener la plataforma funcionando correctamente.",
      activityLogs: "El Registro de Actividades guarda el historial completo de las acciones realizadas en la plataforma: inicios de sesión, cambios de datos y operaciones importantes, para auditoría y seguridad.",
      systemUpdate: "El Actualizador del Sistema te permite actualizar la plataforma a la versión más reciente disponible: compará tu versión, revisá las novedades y aplicá la actualización directamente desde la interfaz.",
      versionCheck: "El Verificador de Versión mantiene la plataforma siempre actualizada: compará tu versión con la más reciente, revisá las novedades y actualizá la biblioteca de WhatsApp cuando corresponda."
    }
  }
};

export default documentationMessages;
