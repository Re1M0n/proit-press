import swaggerJsdoc from 'swagger-jsdoc';

const backendUrl = process.env.BACKEND_URL || 'http://localhost';
const port = process.env.PORT || '4000';
const isProduction = process.env.NODE_ENV === 'production';

const apiUrl = isProduction ? backendUrl : `http://localhost:${port}`;

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Documentación de la API de Press Ticket®',
      version: '1.3.0',
      description: 'Documentación de la API para el envío de mensajes y la gestión de contactos.',
      contact: {
        email: 'robson.tenorio@gmail.com'
      }
    },
    servers: [
      {
        url: apiUrl,
        description: isProduction ? 'API Press Ticket®' : 'Desarrollo local'
      }
    ],
    components: {
      securitySchemes: {
        apiToken: {
          type: 'apiKey',
          name: 'x-api-token',
          in: 'header',
          description: 'Token de API para autenticación. Requiere permisos específicos para cada ruta.'
        }
      }
    },
    tags: [
      { name: 'ActivityLogs', description: 'Registro de actividades del sistema' },
      { name: 'Authentication', description: 'Autenticación y gestión de sesión' },
      { name: 'Backups', description: 'Copia de seguridad y restauración de la base de datos' },
      { name: 'Client Status', description: 'Estado de los clientes' },
      { name: 'Contacts', description: 'Gestión de contactos' },
      { name: 'ErrorLogs', description: 'Registro de errores del sistema' },
      { name: 'Messages', description: 'Operaciones relacionadas con los mensajes' },
      { name: 'NetworkMonitor', description: 'Monitoreo de red' },
      { name: 'Presence', description: 'Indicadores de presencia (escribiendo, grabando)' },
      { name: 'QueueMonitor', description: 'Monitoreo de sectores' },
      { name: 'Quick Answers', description: 'Respuestas rápidas' },
      { name: 'Setores', description: 'Gestión de sectores' },
      { name: 'System', description: 'Recursos y monitoreo del sistema' },
      { name: 'SystemUpdate', description: 'Actualizaciones del sistema' },
      { name: 'Tags', description: 'Gestión de etiquetas' },
      { name: 'Tickets', description: 'Gestión de tickets' },
      { name: 'Users', description: 'Gestión de usuarios' },
      { name: 'Version', description: 'Versión del sistema y biblioteca de WhatsApp' },
      { name: 'Videos', description: 'Gestión de videos' },
      { name: 'WhatsApp', description: 'Gestión de conexiones de WhatsApp' },
      { name: 'WhatsApp Groups', description: 'Gestión de grupos de WhatsApp' },
      { name: 'WhatsAppLibrary', description: 'Biblioteca de WhatsApp' },
      { name: 'WhatsAppSession', description: 'Sesiones de WhatsApp' }
    ]
  },
  apis: [
    process.env.NODE_ENV === 'production' 
      ? './dist/routes/openApiRoutes.js'
      : './src/routes/openApiRoutes.ts',
    process.env.NODE_ENV === 'production'
      ? './dist/controllers/*Controller.js'
      : './src/controllers/*Controller.ts'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
