import express from "express";
import multer from "multer";
import uploadConfig from "../config/upload";

import * as ApiController from "../controllers/ApiController";
import * as ContactController from "../controllers/ContactController";
import * as QueueController from "../controllers/QueueController";
import * as TagController from "../controllers/TagController";
import * as TicketController from "../controllers/TicketController";
import * as WhatsAppController from "../controllers/WhatsAppController";
import WhatsAppSessionController from "../controllers/WhatsAppSessionController";
import * as WhatsAppNumberController from "../controllers/WhatsAppNumberController";
import * as ActivityLogController from "../controllers/ActivityLogController";
import * as BackupController from "../controllers/BackupController";
import * as ErrorLogController from "../controllers/ErrorLogController";
import * as NetworkMonitorController from "../controllers/NetworkMonitorController";
import * as QueueMonitorController from "../controllers/QueueMonitorController";
import * as SystemUpdateController from "../controllers/SystemUpdateController";
import * as VersionController from "../controllers/VersionController";
import * as WhatsappLibController from "../controllers/WhatsappLibController";
import * as SystemController from "../controllers/SystemController";
import * as DiskSpaceController from "../controllers/DiskSpaceController";
import * as MemoryUsageController from "../controllers/MemoryUsageController";
import * as CpuUsageController from "../controllers/CpuUsageController";
import * as DatabaseMonitorController from "../controllers/DatabaseMonitorController";
import * as VideoController from "../controllers/VideoController";
import * as UserController from "../controllers/UserController";
import * as QuickAnswerController from "../controllers/QuickAnswerController";
import * as GroupController from "../controllers/GroupController";
import * as GroupManagementController from "../controllers/GroupManagementController";
import * as ClientStatusController from "../controllers/ClientStatusController";
import * as MessageController from "../controllers/MessageController";
import * as SessionController from "../controllers/SessionController";
import isApiToken from "../middleware/isApiToken";

const upload = multer(uploadConfig);

const openApiRouter = express.Router();

/**
 * @swagger
 * /v1/messages/send:
 *   post:
 *     summary: Enviar Mensaje de Texto
 *     description: Envía un mensaje de texto vía WhatsApp
 *     tags: [Messages]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - body
 *               - userId
 *               - queueId
 *               - whatsappId
 *             properties:
 *               number:
 *                 type: string
 *                 description: Número del destinatario (formato 5511999999999)
 *                 example: "5511999999999"
 *               body:
 *                 type: string
 *                 description: Texto del mensaje
 *                 example: "Hola, este es un mensaje de prueba!"
 *               userId:
 *                 type: integer
 *                 description: ID del usuario
 *                 example: 1
 *               queueId:
 *                 type: integer
 *                 description: ID del sector
 *                 example: 1
 *               whatsappId:
 *                 type: integer
 *                 description: ID de la conexión de WhatsApp
 *                 example: 1
 *     responses:
 *       200:
 *         description: Mensaje enviado con éxito
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: Sin permiso create:messages
 *       500:
 *         description: Error interno
 */
openApiRouter.post("/messages/send", isApiToken('create:messages'), ApiController.sendMessage);

/**
 * @swagger
 * /v1/messages/send-media:
 *   post:
 *     summary: Enviar Mensaje con Multimedia
 *     description: Envía mensaje con archivos (imagen, video, audio, documento)
 *     tags: [Messages]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - medias
 *               - userId
 *               - queueId
 *               - whatsappId
 *             properties:
 *               number:
 *                 type: string
 *                 example: "5511999999999"
 *               body:
 *                 type: string
 *                 description: Leyenda (opcional)
 *                 example: "Mirá esta imagen"
 *               medias:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               userId:
 *                 type: integer
 *                 example: 1
 *               queueId:
 *                 type: integer
 *                 example: 1
 *               whatsappId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Multimedia enviado con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso
 */
openApiRouter.post("/messages/send-media", isApiToken('create:messages'), upload.array("medias"), ApiController.sendMedia);

/**
 * @swagger
 * /v1/messages/{messageId}/media:
 *   get:
 *     summary: Obtener Multimedia en Base64
 *     description: Devuelve el multimedia de un mensaje en formato base64
 *     tags: [Messages]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del mensaje
 *     responses:
 *       200:
 *         description: Multimedia devuelto con éxito
 *       404:
 *         description: Mensaje o multimedia no encontrado
 */
openApiRouter.get("/messages/:messageId/media", isApiToken('read:messages'), ApiController.getMediaBase64);

// Rotas de contatos

/**
 * @swagger
 * /v1/contacts:
 *   get:
 *     summary: Listar Contactos
 *     description: Devuelve lista de todos los contactos
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de contactos
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso read:contacts
 */
openApiRouter.get("/contacts", isApiToken('read:contacts'), ContactController.index);

/**
 * @swagger
 * /v1/contacts:
 *   post:
 *     summary: Crear Contacto
 *     description: Crea un nuevo contacto
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - name
 *             properties:
 *               number:
 *                 type: string
 *                 example: "5511999999999"
 *               name:
 *                 type: string
 *                 example: "Juan Silva"
 *               email:
 *                 type: string
 *                 example: "usuario@example.com"
 *     responses:
 *       200:
 *         description: Contacto creado
 *       400:
 *         description: Datos inválidos
 */
openApiRouter.post("/contacts", isApiToken('create:contacts'), ContactController.store);

/**
 * @swagger
 * /v1/contacts/{contactId}:
 *   get:
 *     summary: Obtener Contacto
 *     description: Devuelve detalles de un contacto
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contacto encontrado
 *       404:
 *         description: Contacto no encontrado
 */
openApiRouter.get("/contacts/:contactId", isApiToken('read:contacts'), ContactController.show);

/**
 * @swagger
 * /v1/contacts/{contactId}:
 *   put:
 *     summary: Actualizar Contacto
 *     description: Actualiza datos de un contacto
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contacto actualizado
 */
openApiRouter.put("/contacts/:contactId", isApiToken('update:contacts'), ContactController.update);

/**
 * @swagger
 * /v1/contacts/{contactId}:
 *   delete:
 *     summary: Eliminar Contacto
 *     description: Elimina un contacto
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contacto eliminado
 */
openApiRouter.delete("/contacts/:contactId", isApiToken('delete:contacts'), ContactController.remove);

/**
 * @swagger
 * /v1/contact:
 *   post:
 *     summary: Buscar Contacto por Número
 *     description: Busca contacto por número de teléfono
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 example: "5511999999999"
 *     responses:
 *       200:
 *         description: Contacto encontrado
 */
openApiRouter.post("/contact", isApiToken('read:contacts'), ContactController.getContact);

/**
 * @swagger
 * /v1/contacts/{contactId}/tags:
 *   put:
 *     summary: Actualizar Tags del Contacto
 *     description: Actualiza las tags asociadas al contacto
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Tags actualizadas
 */
openApiRouter.put("/contacts/:contactId/tags", isApiToken('update:contacts'), ContactController.updateTags);

// Rotas de setores

/**
 * @swagger
 * /v1/queue:
 *   get:
 *     summary: Listar Sectores
 *     description: Devuelve lista de todos los sectores
 *     tags: [Setores]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de sectores
 */
openApiRouter.get("/queue", isApiToken('read:queue'), QueueController.index);

/**
 * @swagger
 * /v1/queue:
 *   post:
 *     summary: Crear Sector
 *     description: Crea un nuevo sector/fila
 *     tags: [Setores]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Suporte"
 *               color:
 *                 type: string
 *                 example: "#FF0000"
 *     responses:
 *       200:
 *         description: Sector creado
 */
openApiRouter.post("/queue", isApiToken('create:queue'), QueueController.store);

/**
 * @swagger
 * /v1/queue/{queueId}:
 *   get:
 *     summary: Obtener Sector
 *     description: Devuelve detalles de un sector
 *     tags: [Setores]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sector encontrado
 */
openApiRouter.get("/queue/:queueId", isApiToken('read:queue'), QueueController.show);

/**
 * @swagger
 * /v1/queue/{queueId}:
 *   put:
 *     summary: Actualizar Sector
 *     description: Actualiza datos de un sector
 *     tags: [Setores]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sector actualizado
 */
openApiRouter.put("/queue/:queueId", isApiToken('update:queue'), QueueController.update);

/**
 * @swagger
 * /v1/queue/{queueId}:
 *   delete:
 *     summary: Eliminar Sector
 *     description: Elimina un sector
 *     tags: [Setores]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sector eliminado
 */
openApiRouter.delete("/queue/:queueId", isApiToken('delete:queue'), QueueController.remove);

// Rotas de tags

/**
 * @swagger
 * /v1/tags:
 *   get:
 *     summary: Listar Tags
 *     description: Devuelve lista de todas las tags
 *     tags: [Tags]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de tags
 */
openApiRouter.get("/tags", isApiToken('read:tags'), TagController.index);

/**
 * @swagger
 * /v1/tags/list:
 *   get:
 *     summary: Listar Tags (Simplificado)
 *     description: Devuelve lista simplificada de tags
 *     tags: [Tags]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de tags
 */
openApiRouter.get("/tags/list", isApiToken('read:tags'), TagController.list);

/**
 * @swagger
 * /v1/tags:
 *   post:
 *     summary: Crear Tag
 *     description: Crea una nueva tag
 *     tags: [Tags]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "VIP"
 *               color:
 *                 type: string
 *                 example: "#FFD700"
 *     responses:
 *       200:
 *         description: Tag creada
 */
openApiRouter.post("/tags", isApiToken('create:tags'), TagController.store);

/**
 * @swagger
 * /v1/tags/{tagId}:
 *   get:
 *     summary: Obtener Tag
 *     description: Devuelve detalles de una tag
 *     tags: [Tags]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tag encontrada
 */
openApiRouter.get("/tags/:tagId", isApiToken('read:tags'), TagController.show);

/**
 * @swagger
 * /v1/tags/{tagId}:
 *   put:
 *     summary: Actualizar Tag
 *     description: Actualiza una tag
 *     tags: [Tags]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tag actualizada
 */
openApiRouter.put("/tags/:tagId", isApiToken('update:tags'), TagController.update);

/**
 * @swagger
 * /v1/tags/{tagId}:
 *   delete:
 *     summary: Eliminar Tag
 *     description: Elimina una tag
 *     tags: [Tags]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tag eliminada
 */
openApiRouter.delete("/tags/:tagId", isApiToken('delete:tags'), TagController.remove);

/**
 * @swagger
 * /v1/tags/sync:
 *   post:
 *     summary: Sincronizar Tags
 *     description: Sincroniza tags del sistema
 *     tags: [Tags]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Tags sincronizadas
 */
openApiRouter.post("/tags/sync", isApiToken('create:tags'), TagController.syncTags);

// Rotas de tickets

/**
 * @swagger
 * /v1/tickets:
 *   get:
 *     summary: Listar Tickets
 *     description: Devuelve lista de tickets
 *     tags: [Tickets]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de tickets
 */
openApiRouter.get("/tickets", isApiToken('read:tickets'), TicketController.index);

/**
 * @swagger
 * /v1/tickets/count:
 *   get:
 *     summary: Contar Tickets
 *     description: Devuelve conteo de tickets por estado
 *     tags: [Tickets]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Conteo de tickets
 */
openApiRouter.get("/tickets/count", isApiToken('read:tickets'), TicketController.count);

/**
 * @swagger
 * /v1/tickets:
 *   post:
 *     summary: Crear Ticket
 *     description: Crea un nuevo ticket
 *     tags: [Tickets]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contactId:
 *                 type: integer
 *                 example: 1
 *               userId:
 *                 type: integer
 *                 example: 1
 *               queueId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Ticket creado
 */
openApiRouter.post("/tickets", isApiToken('create:tickets'), TicketController.store);

/**
 * @swagger
 * /v1/tickets/{ticketId}:
 *   get:
 *     summary: Obtener Ticket
 *     description: Devuelve detalles de un ticket
 *     tags: [Tickets]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ticket encontrado
 */
openApiRouter.get("/tickets/:ticketId", isApiToken('read:tickets'), TicketController.show);

/**
 * @swagger
 * /v1/tickets/{ticketId}:
 *   put:
 *     summary: Actualizar Ticket
 *     description: Actualiza un ticket
 *     tags: [Tickets]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ticket actualizado
 */
openApiRouter.put("/tickets/:ticketId", isApiToken('update:tickets'), TicketController.update);

/**
 * @swagger
 * /v1/tickets/{ticketId}:
 *   delete:
 *     summary: Eliminar Ticket
 *     description: Elimina un ticket
 *     tags: [Tickets]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ticket eliminado
 */
openApiRouter.delete("/tickets/:ticketId", isApiToken('delete:tickets'), TicketController.remove);

/**
 * @swagger
 * /v1/tickets/contact/{contactId}/open:
 *   get:
 *     summary: Verificar Tickets Abiertos
 *     description: Verifica si el contacto tiene tickets abiertos
 *     tags: [Tickets]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado de los tickets
 */
openApiRouter.get("/tickets/contact/:contactId/open", isApiToken('read:tickets'), TicketController.checkOpenTickets);

/**
 * @swagger
 * /v1/tickets/close-all:
 *   put:
 *     summary: Cerrar Todos los Tickets
 *     description: Cierra todos los tickets en lote
 *     tags: [Tickets]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Tickets cerrados
 */
openApiRouter.put("/tickets/close-all", isApiToken('update:tickets'), TicketController.closeTickets);

// Rotas de WhatsApp

/**
 * @swagger
 * /v1/whatsapp:
 *   get:
 *     summary: Listar Conexiones de WhatsApp
 *     description: Devuelve lista de todas las conexiones de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de conexiones
 */
openApiRouter.get("/whatsapp", isApiToken('read:whatsapp'), WhatsAppController.index);

/**
 * @swagger
 * /v1/whatsapp:
 *   post:
 *     summary: Crear Conexión de WhatsApp
 *     description: Crea una nueva conexión de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Atendimento"
 *     responses:
 *       200:
 *         description: Conexión creada
 */
openApiRouter.post("/whatsapp", isApiToken('create:whatsapp'), WhatsAppController.store);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}:
 *   get:
 *     summary: Obtener Conexión de WhatsApp
 *     description: Devuelve detalles de una conexión
 *     tags: [WhatsApp]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conexión encontrada
 */
openApiRouter.get("/whatsapp/:whatsappId", isApiToken('read:whatsapp'), WhatsAppController.show);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}:
 *   put:
 *     summary: Actualizar Conexión de WhatsApp
 *     description: Actualiza una conexión de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conexión actualizada
 */
openApiRouter.put("/whatsapp/:whatsappId", isApiToken('update:whatsapp'), WhatsAppController.update);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}:
 *   delete:
 *     summary: Eliminar Conexión de WhatsApp
 *     description: Elimina una conexión de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conexión eliminada
 */
openApiRouter.delete("/whatsapp/:whatsappId", isApiToken('delete:whatsapp'), WhatsAppController.remove);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/restart:
 *   post:
 *     summary: Reiniciar Conexión de WhatsApp
 *     description: Reinicia una conexión de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conexión reiniciada
 */
openApiRouter.post("/whatsapp/:whatsappId/restart", isApiToken('update:whatsapp'), WhatsAppController.restart);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/shutdown:
 *   post:
 *     summary: Desactivar Conexión de WhatsApp
 *     description: Desactiva una conexión de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conexión desactivada
 */
openApiRouter.post("/whatsapp/:whatsappId/shutdown", isApiToken('update:whatsapp'), WhatsAppController.shutdown);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/qrcode:
 *   get:
 *     summary: Obtener Código QR
 *     description: Devuelve el código QR para la conexión
 *     tags: [WhatsApp]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Código QR devuelto
 */
openApiRouter.get("/whatsapp/:whatsappId/qrcode", isApiToken('read:whatsapp'), WhatsAppController.getQrCode);

/**
 * @swagger
 * /v1/whatsapp/check-number:
 *   post:
 *     summary: Verificar Número de WhatsApp
 *     description: Verifica si un número está registrado en WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 example: "5511999999999"
 *     responses:
 *       200:
 *         description: Número verificado
 */
openApiRouter.post("/whatsapp/check-number", isApiToken('read:whatsapp'), WhatsAppNumberController.checkNumber);

// Rotas de Sessão do WhatsApp

/**
 * @swagger
 * /v1/whatsappsession/{whatsappId}:
 *   post:
 *     summary: Crear Sesión de WhatsApp
 *     description: Crea una nueva sesión de WhatsApp
 *     tags: [WhatsAppSession]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sesión creada
 */
openApiRouter.post("/whatsappsession/:whatsappId", isApiToken('create:whatsappsession'), WhatsAppSessionController.store);

/**
 * @swagger
 * /v1/whatsappsession/{whatsappId}:
 *   put:
 *     summary: Actualizar Sesión de WhatsApp
 *     description: Actualiza una sesión de WhatsApp
 *     tags: [WhatsAppSession]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sesión actualizada
 */
openApiRouter.put("/whatsappsession/:whatsappId", isApiToken('update:whatsappsession'), WhatsAppSessionController.update);

/**
 * @swagger
 * /v1/whatsappsession/{whatsappId}:
 *   delete:
 *     summary: Eliminar Sesión de WhatsApp
 *     description: Elimina una sesión de WhatsApp
 *     tags: [WhatsAppSession]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sesión eliminada
 */
openApiRouter.delete("/whatsappsession/:whatsappId", isApiToken('delete:whatsappsession'), WhatsAppSessionController.remove);

// Rotas de Logs de Atividade

/**
 * @swagger
 * /v1/activity-logs:
 *   get:
 *     summary: Listar Logs de Actividad
 *     description: Devuelve lista de logs de actividad
 *     tags: [ActivityLogs]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de logs
 */
openApiRouter.get("/activity-logs", isApiToken('read:activity-logs'), ActivityLogController.index);

/**
 * @swagger
 * /v1/activity-logs/actions:
 *   get:
 *     summary: Listar Acciones
 *     description: Devuelve lista de acciones disponibles
 *     tags: [ActivityLogs]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de acciones
 */
openApiRouter.get("/activity-logs/actions", isApiToken('read:activity-logs'), ActivityLogController.actions);

/**
 * @swagger
 * /v1/activity-logs/entities:
 *   get:
 *     summary: Listar Entidades
 *     description: Devuelve lista de entidades
 *     tags: [ActivityLogs]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de entidades
 */
openApiRouter.get("/activity-logs/entities", isApiToken('read:activity-logs'), ActivityLogController.entities);

/**
 * @swagger
 * /v1/activity-logs/{id}/details:
 *   get:
 *     summary: Detalles del Log
 *     description: Devuelve detalles de un log específico
 *     tags: [ActivityLogs]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalles del log
 */
openApiRouter.get("/activity-logs/:id/details", isApiToken('read:activity-logs'), ActivityLogController.show);

// Rotas de Backup

/**
 * @swagger
 * /v1/backups:
 *   get:
 *     summary: Listar Backups
 *     description: Devuelve lista de backups disponibles
 *     tags: [Backups]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de backups
 */
openApiRouter.get("/backups", isApiToken('read:backups'), BackupController.index);

/**
 * @swagger
 * /v1/backups:
 *   post:
 *     summary: Crear Backup
 *     description: Crea un nuevo backup del sistema
 *     tags: [Backups]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Backup creado
 */
openApiRouter.post("/backups", isApiToken('create:backups'), BackupController.store);

/**
 * @swagger
 * /v1/backups/{filename}:
 *   get:
 *     summary: Obtener Backup
 *     description: Devuelve detalles de un backup
 *     tags: [Backups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Backup encontrado
 */
openApiRouter.get("/backups/:filename", isApiToken('read:backups'), BackupController.show);

/**
 * @swagger
 * /v1/backups/{filename}/restore:
 *   post:
 *     summary: Restaurar Backup
 *     description: Restaura el sistema a partir de un backup
 *     tags: [Backups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Backup restaurado
 */
openApiRouter.post("/backups/:filename/restore", isApiToken('update:backups'), BackupController.update);

/**
 * @swagger
 * /v1/backups/{filename}:
 *   delete:
 *     summary: Eliminar Backup
 *     description: Elimina un backup
 *     tags: [Backups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Backup eliminado
 */
openApiRouter.delete("/backups/:filename", isApiToken('delete:backups'), BackupController.remove);

// Rotas de Logs de Erro

/**
 * @swagger
 * /v1/error-logs:
 *   post:
 *     summary: Crear Log de Error
 *     description: Registra un nuevo log de error
 *     tags: [ErrorLogs]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Log creado
 */
openApiRouter.post("/error-logs", isApiToken('create:error-logs'), ErrorLogController.store);

/**
 * @swagger
 * /v1/error-logs:
 *   get:
 *     summary: Listar Logs de Error
 *     description: Devuelve lista de logs de error
 *     tags: [ErrorLogs]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de logs
 */
openApiRouter.get("/error-logs", isApiToken('read:error-logs'), ErrorLogController.index);

/**
 * @swagger
 * /v1/error-logs/{id}:
 *   get:
 *     summary: Obtener Log de Error
 *     description: Devuelve detalles de un log de error
 *     tags: [ErrorLogs]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Log encontrado
 */
openApiRouter.get("/error-logs/:id", isApiToken('read:error-logs'), ErrorLogController.show);

/**
 * @swagger
 * /v1/error-logs/cleanup:
 *   delete:
 *     summary: Limpiar Logs Antiguos
 *     description: Elimina logs de error antiguos
 *     tags: [ErrorLogs]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Logs limpiados
 */
openApiRouter.delete("/error-logs/cleanup", isApiToken('delete:error-logs'), ErrorLogController.cleanupOldLogs);

// Rotas de Monitoramento de Rede

/**
 * @swagger
 * /v1/network-status:
 *   get:
 *     summary: Estado de la Red
 *     description: Devuelve estado de la red
 *     tags: [NetworkMonitor]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Estado de la red
 */
openApiRouter.get("/network-status", isApiToken('read:network-status'), NetworkMonitorController.index);

// Rotas de Monitoramento de Setores

/**
 * @swagger
 * /v1/queue-monitor:
 *   get:
 *     summary: Monitorear Sectores
 *     description: Devuelve monitoreo de los sectores
 *     tags: [QueueMonitor]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Estado de los sectores
 */
openApiRouter.get("/queue-monitor", isApiToken('read:queue-monitor'), QueueMonitorController.index);

// Rotas de Atualização do Sistema

/**
 * @swagger
 * /v1/system-update/check:
 *   get:
 *     summary: Verificar Actualizaciones
 *     description: Verifica si hay actualizaciones disponibles
 *     tags: [SystemUpdate]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Estado de actualizaciones
 */
openApiRouter.get("/system-update/check", isApiToken('read:system-update'), SystemUpdateController.checkUpdates);

/**
 * @swagger
 * /v1/system-update/install:
 *   post:
 *     summary: Instalar Actualización
 *     description: Instala actualización del sistema
 *     tags: [SystemUpdate]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Actualización instalada
 */
openApiRouter.post("/system-update/install", isApiToken('write:system-update'), SystemUpdateController.installUpdate);

/**
 * @swagger
 * /v1/system-update/status:
 *   get:
 *     summary: Estado de la Actualización
 *     description: Devuelve estado de la actualización
 *     tags: [SystemUpdate]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Estado de la actualización
 */
openApiRouter.get("/system-update/status", isApiToken('read:system-update'), SystemUpdateController.getStatus);

/**
 * @swagger
 * /v1/system-update/backups:
 *   get:
 *     summary: Listar Backups de Actualización
 *     description: Devuelve backups de actualización
 *     tags: [SystemUpdate]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de backups
 */
openApiRouter.get("/system-update/backups", isApiToken('read:system-update'), SystemUpdateController.getBackups);

/**
 * @swagger
 * /v1/system-update/restore/{backupFileName}:
 *   post:
 *     summary: Restaurar Backup de Actualización
 *     description: Restaura el sistema desde un backup
 *     tags: [SystemUpdate]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: backupFileName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Backup restaurado
 */
openApiRouter.post("/system-update/restore/:backupFileName", isApiToken('write:system-update'), SystemUpdateController.restoreFromBackup);

// Rotas de Versão e Biblioteca WhatsApp

/**
 * @swagger
 * /v1/version:
 *   get:
 *     summary: Obtener Versión
 *     description: Devuelve versión del sistema
 *     tags: [Version]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Versión del sistema
 */
openApiRouter.get("/version", isApiToken('read:version'), VersionController.getVersion);

/**
 * @swagger
 * /v1/whatsapp-lib/update:
 *   post:
 *     summary: Actualizar Biblioteca WhatsApp
 *     description: Actualiza la biblioteca de WhatsApp
 *     tags: [WhatsAppLibrary]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Biblioteca actualizada
 */
openApiRouter.post("/whatsapp-lib/update", isApiToken('write:whatsapp-lib'), WhatsappLibController.updateWhatsappLibrary);

// Rotas de Sistema

/**
 * @swagger
 * /v1/restartpm2:
 *   post:
 *     summary: Reiniciar PM2
 *     description: Reinicia el administrador de procesos PM2
 *     tags: [System]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: PM2 reiniciado
 */
openApiRouter.post("/restartpm2", isApiToken('write:system'), SystemController.restartPm2);

/**
 * @swagger
 * /v1/disk-space:
 *   get:
 *     summary: Espacio en Disco
 *     description: Devuelve información de espacio en disco
 *     tags: [System]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Espacio en disco
 */
openApiRouter.get("/disk-space", isApiToken('read:system-resources'), DiskSpaceController.getDiskSpace);

/**
 * @swagger
 * /v1/memory-usage:
 *   get:
 *     summary: Uso de Memoria
 *     description: Devuelve uso de memoria del sistema
 *     tags: [System]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Uso de memoria
 */
openApiRouter.get("/memory-usage", isApiToken('read:system-resources'), MemoryUsageController.getMemoryUsage);

/**
 * @swagger
 * /v1/cpu-usage:
 *   get:
 *     summary: Uso de CPU
 *     description: Devuelve uso de CPU del sistema
 *     tags: [System]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Uso de CPU
 */
openApiRouter.get("/cpu-usage", isApiToken('read:system-resources'), CpuUsageController.cpuUsage);

/**
 * @swagger
 * /v1/database-status:
 *   get:
 *     summary: Estado de la Base de Datos
 *     description: Devuelve estado de la base de datos
 *     tags: [System]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Estado de la base de datos
 */
openApiRouter.get("/database-status", isApiToken('read:system-resources'), DatabaseMonitorController.getDatabaseStatus);

// Rotas de Vídeo

/**
 * @swagger
 * /v1/videos:
 *   get:
 *     summary: Listar Videos
 *     description: Devuelve lista de videos
 *     tags: [Videos]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de videos
 */
openApiRouter.get("/videos", isApiToken('read:videos'), VideoController.index);

/**
 * @swagger
 * /v1/videos/{id}:
 *   get:
 *     summary: Obtener Video
 *     description: Devuelve detalles de un video
 *     tags: [Videos]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Video encontrado
 */
openApiRouter.get("/videos/:id", isApiToken('read:videos'), VideoController.show);

/**
 * @swagger
 * /v1/videos:
 *   post:
 *     summary: Crear Video
 *     description: Agrega un nuevo video
 *     tags: [Videos]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Video creado
 */
openApiRouter.post("/videos", isApiToken('write:videos'), VideoController.store);

/**
 * @swagger
 * /v1/videos/{id}:
 *   put:
 *     summary: Actualizar Video
 *     description: Actualiza un video
 *     tags: [Videos]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Video actualizado
 */
openApiRouter.put("/videos/:id", isApiToken('write:videos'), VideoController.update);

/**
 * @swagger
 * /v1/videos/{id}:
 *   delete:
 *     summary: Eliminar Video
 *     description: Elimina un video
 *     tags: [Videos]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Video eliminado
 */
openApiRouter.delete("/videos/:id", isApiToken('write:videos'), VideoController.remove);

// Rotas de Usuários

/**
 * @swagger
 * /v1/users:
 *   get:
 *     summary: Listar Usuarios
 *     description: Devuelve la lista de todos los usuarios del sistema
 *     tags: [Users]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de usuarios devuelta con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: "Juan Silva"
 *                   email:
 *                     type: string
 *                     example: "usuario@example.com"
 *                   profile:
 *                     type: string
 *                     enum: [admin, user]
 *                     example: "user"
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: Sin permiso read:users
 *       500:
 *         description: Error interno
 */
openApiRouter.get("/users", isApiToken('read:users'), UserController.index);

/**
 * @swagger
 * /v1/users:
 *   post:
 *     summary: Crear Usuario
 *     description: Crea un nuevo usuario en el sistema
 *     tags: [Users]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - profile
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre completo del usuario
 *                 example: "Maria Santos"
 *               email:
 *                 type: string
 *                 description: Email del usuario (debe ser único)
 *                 example: "maria@example.com"
 *               password:
 *                 type: string
 *                 description: Contraseña del usuario
 *                 example: "senha123"
 *               profile:
 *                 type: string
 *                 enum: [admin, user]
 *                 description: Perfil de acceso del usuario
 *                 example: "user"
 *               queueIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs de los sectores asociados al usuario
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: Usuario creado con éxito
 *       400:
 *         description: Datos inválidos o email ya registrado
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso create:users
 *       500:
 *         description: Error interno
 */
openApiRouter.post("/users", isApiToken('create:users'), UserController.store);

/**
 * @swagger
 * /v1/users/{userId}:
 *   get:
 *     summary: Obtener Usuario
 *     description: Devuelve los detalles de un usuario específico
 *     tags: [Users]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *         example: 1
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                   example: "Juan Silva"
 *                 email:
 *                   type: string
 *                   example: "usuario@example.com"
 *                 profile:
 *                   type: string
 *                   example: "user"
 *                 queues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso read:users
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
openApiRouter.get("/users/:userId", isApiToken('read:users'), UserController.show);

/**
 * @swagger
 * /v1/users/{userId}:
 *   put:
 *     summary: Actualizar Usuario
 *     description: Actualiza los datos de un usuario existente
 *     tags: [Users]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre completo del usuario
 *                 example: "Juan Silva Actualizado"
 *               email:
 *                 type: string
 *                 description: Email del usuario
 *                 example: "nuevo.usuario@example.com"
 *               password:
 *                 type: string
 *                 description: Nueva contraseña (opcional)
 *                 example: "nuevaContraseña123"
 *               profile:
 *                 type: string
 *                 enum: [admin, user]
 *                 description: Perfil de acceso
 *                 example: "admin"
 *               queueIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs de los sectores
 *                 example: [1, 3, 5]
 *     responses:
 *       200:
 *         description: Usuario actualizado con éxito
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso update:users
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
openApiRouter.put("/users/:userId", isApiToken('update:users'), UserController.update);

/**
 * @swagger
 * /v1/users/{userId}:
 *   delete:
 *     summary: Eliminar Usuario
 *     description: Elimina un usuario del sistema
 *     tags: [Users]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario a eliminar
 *         example: 1
 *     responses:
 *       200:
 *         description: Usuario eliminado con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso delete:users
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
openApiRouter.delete("/users/:userId", isApiToken('delete:users'), UserController.remove);

// Rotas de Respostas Rápidas

/**
 * @swagger
 * /v1/quickAnswers:
 *   get:
 *     summary: Listar Respuestas Rápidas
 *     description: Devuelve lista de respuestas rápidas
 *     tags: [Quick Answers]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de respuestas rápidas
 */
openApiRouter.get("/quickAnswers", isApiToken('read:quickAnswers'), QuickAnswerController.index);

/**
 * @swagger
 * /v1/quickAnswers:
 *   post:
 *     summary: Crear Respuesta Rápida
 *     description: Crea una nueva respuesta rápida
 *     tags: [Quick Answers]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shortcut:
 *                 type: string
 *                 example: "/hola"
 *               message:
 *                 type: string
 *                 example: "¡Hola! ¿Cómo puedo ayudarte?"
 *     responses:
 *       200:
 *         description: Respuesta rápida creada
 */
openApiRouter.post("/quickAnswers", isApiToken('create:quickAnswers'), QuickAnswerController.store);

/**
 * @swagger
 * /v1/quickAnswers/{quickAnswerId}:
 *   get:
 *     summary: Obtener Respuesta Rápida
 *     description: Devuelve detalles de una respuesta rápida
 *     tags: [Quick Answers]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: quickAnswerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Respuesta rápida encontrada
 */
openApiRouter.get("/quickAnswers/:quickAnswerId", isApiToken('read:quickAnswers'), QuickAnswerController.show);

/**
 * @swagger
 * /v1/quickAnswers/{quickAnswerId}:
 *   put:
 *     summary: Actualizar Respuesta Rápida
 *     description: Actualiza una respuesta rápida
 *     tags: [Quick Answers]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: quickAnswerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Respuesta rápida actualizada
 */
openApiRouter.put("/quickAnswers/:quickAnswerId", isApiToken('update:quickAnswers'), QuickAnswerController.update);

/**
 * @swagger
 * /v1/quickAnswers/{quickAnswerId}:
 *   delete:
 *     summary: Eliminar Respuesta Rápida
 *     description: Elimina una respuesta rápida
 *     tags: [Quick Answers]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: quickAnswerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Respuesta rápida eliminada
 */
openApiRouter.delete("/quickAnswers/:quickAnswerId", isApiToken('delete:quickAnswers'), QuickAnswerController.remove);

/**
 * @swagger
 * /v1/quickAnswers:
 *   delete:
 *     summary: Eliminar Todas las Respuestas Rápidas
 *     description: Elimina todas las respuestas rápidas
 *     tags: [Quick Answers]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Todas las respuestas rápidas eliminadas
 */
openApiRouter.delete("/quickAnswers", isApiToken('delete:quickAnswers'), QuickAnswerController.removeAll);

// Rotas de Grupos do WhatsApp - Participantes

/**
 * @swagger
 * /v1/groups/{groupId}/participants/add:
 *   post:
 *     summary: Agregar Participantes al Grupo
 *     description: Agrega uno o más participantes a un grupo de WhatsApp
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del grupo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["5511999999999@c.us"]
 *     responses:
 *       200:
 *         description: Participantes agregados
 */
openApiRouter.post("/groups/:groupId/participants/add", isApiToken('write:groups'), GroupController.addParticipants);

/**
 * @swagger
 * /v1/groups/{groupId}/participants/remove:
 *   post:
 *     summary: Eliminar Participantes del Grupo
 *     description: Elimina uno o más participantes de un grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["5511999999999@c.us"]
 *     responses:
 *       200:
 *         description: Participantes eliminados
 */
openApiRouter.post("/groups/:groupId/participants/remove", isApiToken('write:groups'), GroupController.removeParticipants);

/**
 * @swagger
 * /v1/groups/{groupId}/participants/promote:
 *   post:
 *     summary: Promover Participantes a Administrador
 *     description: Promueve participantes a administradores del grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["5511999999999@c.us"]
 *     responses:
 *       200:
 *         description: Participantes promovidos
 */
openApiRouter.post("/groups/:groupId/participants/promote", isApiToken('write:groups'), GroupController.promoteParticipants);

/**
 * @swagger
 * /v1/groups/{groupId}/participants/demote:
 *   post:
 *     summary: Degradar Admin a Participante
 *     description: Elimina privilegios de administrador de participantes
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["5511999999999@c.us"]
 *     responses:
 *       200:
 *         description: Participantes degradados
 */
openApiRouter.post("/groups/:groupId/participants/demote", isApiToken('write:groups'), GroupController.demoteParticipants);

/**
 * @swagger
 * /v1/groups/{groupId}/participants:
 *   get:
 *     summary: Listar Participantes del Grupo
 *     description: Devuelve lista de participantes de un grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de participantes
 */
openApiRouter.get("/groups/:groupId/participants", isApiToken('read:groups'), GroupController.listParticipants);

// Rotas de Grupos do WhatsApp - Convites

/**
 * @swagger
 * /v1/groups/{groupId}/invite:
 *   get:
 *     summary: Obtener Enlace de Invitación
 *     description: Devuelve el enlace de invitación del grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enlace de invitación
 */
openApiRouter.get("/groups/:groupId/invite", isApiToken('read:groups'), GroupController.getInvite);

/**
 * @swagger
 * /v1/groups/{groupId}/invite/revoke:
 *   post:
 *     summary: Revocar Enlace de Invitación
 *     description: Revoca el enlace de invitación actual y genera uno nuevo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enlace revocado
 */
openApiRouter.post("/groups/:groupId/invite/revoke", isApiToken('write:groups'), GroupController.revokeInvite);

// Rotas de Grupos do WhatsApp - Permissões

/**
 * @swagger
 * /v1/groups/{groupId}/settings/memberAddMode:
 *   post:
 *     summary: Configurar Modo de Agregar Miembros
 *     description: Define quién puede agregar miembros al grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [all_members, admins_only]
 *                 example: "admins_only"
 *     responses:
 *       200:
 *         description: Configuración actualizada
 */
openApiRouter.post("/groups/:groupId/settings/memberAddMode", isApiToken('write:groups'), GroupController.setMemberAddMode);

/**
 * @swagger
 * /v1/groups/{groupId}/settings/announcement:
 *   post:
 *     summary: Configurar Modo Anuncio
 *     description: Define si solo los admins pueden enviar mensajes
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Modo anuncio configurado
 */
openApiRouter.post("/groups/:groupId/settings/announcement", isApiToken('write:groups'), GroupController.setAnnouncement);

/**
 * @swagger
 * /v1/groups/{groupId}/settings/restrict:
 *   post:
 *     summary: Restringir Edición de Info del Grupo
 *     description: Define si solo los admins pueden editar la información del grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Restricción configurada
 */
openApiRouter.post("/groups/:groupId/settings/restrict", isApiToken('write:groups'), GroupController.setRestrict);

// Rotas de Grupos do WhatsApp - Informações

/**
 * @swagger
 * /v1/groups/{groupId}/subject:
 *   post:
 *     summary: Cambiar Nombre del Grupo
 *     description: Cambia el nombre/asunto del grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *                 example: "Nuevo Nombre del Grupo"
 *     responses:
 *       200:
 *         description: Nombre modificado
 */
openApiRouter.post("/groups/:groupId/subject", isApiToken('write:groups'), GroupController.setSubject);

/**
 * @swagger
 * /v1/groups/{groupId}/description:
 *   post:
 *     summary: Cambiar Descripción del Grupo
 *     description: Cambia la descripción del grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 example: "Descripción del grupo"
 *     responses:
 *       200:
 *         description: Descripción modificada
 */
openApiRouter.post("/groups/:groupId/description", isApiToken('write:groups'), GroupController.setDescription);

/**
 * @swagger
 * /v1/groups/{groupId}/picture:
 *   post:
 *     summary: Cambiar Foto del Grupo
 *     description: Cambia la foto del grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               picture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Foto cambiada
 */
openApiRouter.post("/groups/:groupId/picture", isApiToken('write:groups'), GroupController.setPicture);

/**
 * @swagger
 * /v1/groups/{groupId}/picture:
 *   delete:
 *     summary: Eliminar Foto del Grupo
 *     description: Elimina la foto del grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Foto eliminada
 */
openApiRouter.delete("/groups/:groupId/picture", isApiToken('write:groups'), GroupController.deletePicture);

// Rotas de Grupos do WhatsApp - Solicitações de Entrada

/**
 * @swagger
 * /v1/groups/{groupId}/membership/requests:
 *   get:
 *     summary: Listar Solicitudes de Entrada
 *     description: Devuelve lista de solicitudes pendientes para entrar al grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 */
openApiRouter.get("/groups/:groupId/membership/requests", isApiToken('read:groups'), GroupController.listMembershipRequests);

/**
 * @swagger
 * /v1/groups/{groupId}/membership/approve:
 *   post:
 *     summary: Aprobar Solicitudes de Entrada
 *     description: Aprueba solicitudes de entrada al grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["5511999999999@c.us"]
 *     responses:
 *       200:
 *         description: Solicitudes aprobadas
 */
openApiRouter.post("/groups/:groupId/membership/approve", isApiToken('write:groups'), GroupController.approveMembershipRequests);

/**
 * @swagger
 * /v1/groups/{groupId}/membership/reject:
 *   post:
 *     summary: Rechazar Solicitudes de Entrada
 *     description: Rechaza solicitudes de entrada al grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["5511999999999@c.us"]
 *     responses:
 *       200:
 *         description: Solicitudes rechazadas
 */
openApiRouter.post("/groups/:groupId/membership/reject", isApiToken('write:groups'), GroupController.rejectMembershipRequests);

// Rotas de Grupos do WhatsApp - Outros

/**
 * @swagger
 * /v1/groups/{groupId}/leave:
 *   post:
 *     summary: Salir del Grupo
 *     description: Hace que el bot salga del grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Salió del grupo
 */
openApiRouter.post("/groups/:groupId/leave", isApiToken('write:groups'), GroupController.leaveGroup);

// Rotas de Status de Clientes

/**
 * @swagger
 * /v1/client-status:
 *   get:
 *     summary: Listar Estados de Clientes
 *     description: Devuelve lista de estados de clientes
 *     tags: [Client Status]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Lista de estados
 */
openApiRouter.get("/client-status", isApiToken('read:client-status'), ClientStatusController.index);

/**
 * @swagger
 * /v1/client-status:
 *   post:
 *     summary: Crear Estado de Cliente
 *     description: Crea un nuevo estado de cliente
 *     tags: [Client Status]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Ativo"
 *               color:
 *                 type: string
 *                 example: "#00FF00"
 *     responses:
 *       200:
 *         description: Estado creado
 */
openApiRouter.post("/client-status", isApiToken('create:client-status'), ClientStatusController.store);

/**
 * @swagger
 * /v1/client-status/statistics:
 *   get:
 *     summary: Obtener Estadísticas de Estado de Clientes
 *     description: Devuelve estadísticas completas sobre la distribución de contactos por estado
 *     tags: [Client Status]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Estadísticas devueltas con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       color:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 withoutStatus:
 *                   type: integer
 *                 total:
 *                   type: integer
 */
openApiRouter.get("/client-status/statistics", isApiToken('read:client-status'), ClientStatusController.statistics);

/**
 * @swagger
 * /v1/client-status/{clientStatusId}:
 *   get:
 *     summary: Obtener Estado de Cliente
 *     description: Devuelve detalles de un estado
 *     tags: [Client Status]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: clientStatusId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado encontrado
 */
openApiRouter.get("/client-status/:clientStatusId", isApiToken('read:client-status'), ClientStatusController.show);

/**
 * @swagger
 * /v1/client-status/{clientStatusId}:
 *   put:
 *     summary: Actualizar Estado de Cliente
 *     description: Actualiza un estado
 *     tags: [Client Status]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: clientStatusId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
openApiRouter.put("/client-status/:clientStatusId", isApiToken('update:client-status'), ClientStatusController.update);

/**
 * @swagger
 * /v1/client-status/{clientStatusId}:
 *   delete:
 *     summary: Eliminar Estado de Cliente
 *     description: Elimina un estado
 *     tags: [Client Status]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: clientStatusId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado eliminado
 */
openApiRouter.delete("/client-status/:clientStatusId", isApiToken('delete:client-status'), ClientStatusController.remove);

/**
 * @swagger
 * /v1/client-status:
 *   delete:
 *     summary: Eliminar Todos los Estados
 *     description: Elimina todos los estados de clientes
 *     tags: [Client Status]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Todos los estados eliminados
 */
openApiRouter.delete("/client-status", isApiToken('delete:client-status'), ClientStatusController.removeAll);

// Rotas de Presença (Indicadores de Digitação/Gravação)

/**
 * @swagger
 * /v1/presence/typing/{ticketId}:
 *   post:
 *     summary: Enviar Indicador de Escritura
 *     description: Simula indicador "escribiendo..." en WhatsApp
 *     tags: [Presence]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del ticket
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               duration:
 *                 type: integer
 *                 description: Duración en milisegundos (predeterminado 3000ms)
 *                 example: 5000
 *     responses:
 *       200:
 *         description: Indicador enviado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:presence
 *       500:
 *         description: Error al enviar el indicador
 */
openApiRouter.post("/presence/typing/:ticketId", isApiToken('write:presence'), MessageController.sendTypingIndicator);

/**
 * @swagger
 * /v1/presence/recording/{ticketId}:
 *   post:
 *     summary: Enviar Indicador de Grabación
 *     description: Simula indicador "grabando audio..." en WhatsApp
 *     tags: [Presence]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del ticket
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               duration:
 *                 type: integer
 *                 description: Duración en milisegundos (predeterminado 5000ms)
 *                 example: 8000
 *     responses:
 *       200:
 *         description: Indicador enviado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:presence
 *       500:
 *         description: Error al enviar el indicador
 */
openApiRouter.post("/presence/recording/:ticketId", isApiToken('write:presence'), MessageController.sendRecordingIndicator);

/**
 * @swagger
 * /v1/presence/available/{ticketId}:
 *   post:
 *     summary: Definir Presencia como Disponible
 *     description: Elimina indicadores de escritura/grabación
 *     tags: [Presence]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del ticket
 *     responses:
 *       200:
 *         description: Presencia definida como disponible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:presence
 *       500:
 *         description: Error al definir presencia
 */
openApiRouter.post("/presence/available/:ticketId", isApiToken('write:presence'), MessageController.setAvailablePresence);

/**
 * @swagger
 * /v1/messages/{messageId}/edit:
 *   put:
 *     summary: Editar Mensaje
 *     description: Edita el contenido de un mensaje ya enviado
 *     tags: [Messages]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del mensaje
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - body
 *             properties:
 *               body:
 *                 type: string
 *                 description: Nuevo contenido del mensaje
 *                 example: "Mensaje corregido"
 *     responses:
 *       200:
 *         description: Mensaje editado con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso update:messages
 *       404:
 *         description: Mensaje no encontrado
 */
openApiRouter.put("/messages/:messageId/edit", isApiToken('update:messages'), MessageController.edit);

/**
 * @swagger
 * /v1/messages/{messageId}:
 *   delete:
 *     summary: Eliminar Mensaje
 *     description: Elimina un mensaje enviado
 *     tags: [Messages]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del mensaje
 *     responses:
 *       200:
 *         description: Mensaje eliminado con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso delete:messages
 *       404:
 *         description: Mensaje no encontrado
 */
openApiRouter.delete("/messages/:messageId", isApiToken('delete:messages'), MessageController.remove);

/**
 * @swagger
 * /v1/messages/{messageId}/react:
 *   post:
 *     summary: Reaccionar a Mensaje
 *     description: Agrega una reacción (emoji) a un mensaje
 *     tags: [Messages]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del mensaje
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emoji:
 *                 type: string
 *                 description: Emoji para reaccionar
 *                 example: "👍"
 *               removeEmoji:
 *                 type: string
 *                 description: Emoji para eliminar (opcional)
 *     responses:
 *       200:
 *         description: Reacción agregada con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso create:messages
 */
openApiRouter.post("/messages/:messageId/react", isApiToken('create:messages'), MessageController.reactMessage);

/**
 * @swagger
 * /v1/messages/{messageId}/reactions:
 *   get:
 *     summary: Obtener Reacciones de Mensaje
 *     description: Devuelve todas las reacciones de un mensaje
 *     tags: [Messages]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del mensaje
 *     responses:
 *       200:
 *         description: Reacciones devueltas con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso read:messages
 */
openApiRouter.get("/messages/:messageId/reactions", isApiToken('read:messages'), MessageController.getReactions);

/**
 * @swagger
 * /v1/messages/forward:
 *   post:
 *     summary: Reenviar Mensajes
 *     description: Reenvía uno o más mensajes a otros tickets
 *     tags: [Messages]
 *     security:
 *       - apiToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageIds
 *               - targetTicketIds
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs de los mensajes a reenviar
 *                 example: ["123", "124"]
 *               targetTicketIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs de los tickets de destino
 *                 example: [5, 6]
 *     responses:
 *       200:
 *         description: Mensajes reenviados con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso create:messages
 */
openApiRouter.post("/messages/forward", isApiToken('create:messages'), MessageController.forwardMessages);

/**
 * @swagger
 * /v1/messages/{ticketId}/poll:
 *   post:
 *     summary: Enviar Encuesta
 *     description: Envía una encuesta en el ticket
 *     tags: [Messages]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pollName
 *               - options
 *             properties:
 *               pollName:
 *                 type: string
 *                 description: Pregunta de la encuesta
 *                 example: "Qual sua cor favorita?"
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Opciones de la encuesta
 *                 example: ["Azul", "Verde", "Vermelho"]
 *               allowMultipleAnswers:
 *                 type: boolean
 *                 description: Permitir múltiples respuestas
 *                 default: false
 *     responses:
 *       200:
 *         description: Encuesta enviada con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso create:messages
 */
openApiRouter.post("/messages/:ticketId/poll", isApiToken('create:messages'), MessageController.sendPoll);

/**
 * @swagger
 * /v1/messages/{ticketId}/read:
 *   post:
 *     summary: Marcar Mensajes como Leídos
 *     description: Marca todos los mensajes de un ticket como leídos
 *     tags: [Messages]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del ticket
 *     responses:
 *       200:
 *         description: Mensajes marcados como leídos
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso update:messages
 */
openApiRouter.post("/messages/:ticketId/read", isApiToken('update:messages'), MessageController.markAsRead);

/**
 * @swagger
 * /v1/contacts/{contactId}/block:
 *   post:
 *     summary: Bloquear Contacto
 *     description: Bloquea un contacto en WhatsApp
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del contacto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - whatsappId
 *             properties:
 *               whatsappId:
 *                 type: integer
 *                 description: ID de la conexión de WhatsApp
 *                 example: 1
 *     responses:
 *       200:
 *         description: Contacto bloqueado con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso update:contacts
 *       404:
 *         description: Contacto no encontrado
 */
openApiRouter.post("/contacts/:contactId/block", isApiToken('update:contacts'), ContactController.blockContact);

/**
 * @swagger
 * /v1/contacts/{contactId}/unblock:
 *   post:
 *     summary: Desbloquear Contacto
 *     description: Desbloquea un contacto en WhatsApp
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del contacto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - whatsappId
 *             properties:
 *               whatsappId:
 *                 type: integer
 *                 description: ID de la conexión de WhatsApp
 *                 example: 1
 *     responses:
 *       200:
 *         description: Contacto desbloqueado con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso update:contacts
 *       404:
 *         description: Contacto no encontrado
 */
openApiRouter.post("/contacts/:contactId/unblock", isApiToken('update:contacts'), ContactController.unblockContact);

/**
 * @swagger
 * /v1/contacts/{contactId}/block-status:
 *   get:
 *     summary: Verificar Estado de Bloqueo
 *     description: Verifica si un contacto está bloqueado
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del contacto
 *       - in: query
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la conexión de WhatsApp
 *     responses:
 *       200:
 *         description: Estado devuelto con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isBlocked:
 *                   type: boolean
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso read:contacts
 */
openApiRouter.get("/contacts/:contactId/block-status", isApiToken('read:contacts'), ContactController.getBlockStatus);

/**
 * @swagger
 * /v1/contacts/blocked:
 *   get:
 *     summary: Listar Contactos Bloqueados
 *     description: Devuelve lista de todos los contactos bloqueados de una conexión
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: query
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la conexión de WhatsApp
 *     responses:
 *       200:
 *         description: Lista de contactos bloqueados
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso read:contacts
 */
openApiRouter.get("/contacts/blocked", isApiToken('read:contacts'), ContactController.listBlockedContacts);

/**
 * @swagger
 * /v1/contacts/{contactId}/about:
 *   get:
 *     summary: Obtener "Sobre" del Contacto
 *     description: Devuelve el texto "sobre" del perfil del contacto en WhatsApp
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del contacto
 *       - in: query
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la conexión de WhatsApp
 *     responses:
 *       200:
 *         description: Texto "sobre" devuelto con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 about:
 *                   type: string
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso read:contacts
 */
openApiRouter.get("/contacts/:contactId/about", isApiToken('read:contacts'), ContactController.getAbout);

/**
 * @swagger
 * /v1/contacts/{contactId}/common-groups:
 *   get:
 *     summary: Obtener Grupos en Común
 *     description: Devuelve lista de grupos en común con el contacto
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del contacto
 *       - in: query
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la conexión de WhatsApp
 *     responses:
 *       200:
 *         description: Grupos en común devueltos con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 commonGroups:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso read:contacts
 */
openApiRouter.get("/contacts/:contactId/common-groups", isApiToken('read:contacts'), ContactController.getCommonGroups);

/**
 * @swagger
 * /v1/contacts/export:
 *   get:
 *     summary: Exportar Contactos
 *     description: Exporta contactos en formato CSV
 *     tags: [Contacts]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Archivo CSV generado con éxito
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso read:contacts
 */
openApiRouter.get("/contacts/export", isApiToken('read:contacts'), ContactController.exportContacts);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups:
 *   get:
 *     summary: Listar Grupos del Canal
 *     description: Devuelve lista de todos los grupos de una conexión de WhatsApp
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la conexión de WhatsApp
 *     responses:
 *       200:
 *         description: Lista de grupos devuelta con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso read:groups
 */
openApiRouter.get("/whatsapp/:whatsappId/groups", isApiToken('read:groups'), GroupManagementController.listGroups);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups:
 *   post:
 *     summary: Crear Grupo
 *     description: Crea un nuevo grupo en WhatsApp
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la conexión de WhatsApp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - participants
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre del grupo
 *                 example: "Grupo de Trabalho"
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Números de los participantes (formato 5511999999999)
 *                 example: ["5511999999999", "5511888888888"]
 *     responses:
 *       200:
 *         description: Grupo creado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gid:
 *                   type: string
 *                   description: ID del grupo creado
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:groups
 */
openApiRouter.post("/whatsapp/:whatsappId/groups", isApiToken('write:groups'), GroupManagementController.createGroup);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups/{groupId}:
 *   get:
 *     summary: Obtener Información del Grupo
 *     description: Devuelve información detallada de un grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la conexión de WhatsApp
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del grupo (ej. 120363...@g.us)
 *     responses:
 *       200:
 *         description: Información del grupo devuelta con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 participants:
 *                   type: array
 *                   items:
 *                     type: object
 *                 owner:
 *                   type: string
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso read:groups
 */
openApiRouter.get("/whatsapp/:whatsappId/groups/:groupId", isApiToken('read:groups'), GroupManagementController.getGroupInfo);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups/{groupId}/name:
 *   put:
 *     summary: Actualizar Nombre del Grupo
 *     description: Cambia el nombre de un grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nuevo Nombre del Grupo"
 *     responses:
 *       200:
 *         description: Nombre actualizado con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:groups
 */
openApiRouter.put("/whatsapp/:whatsappId/groups/:groupId/name", isApiToken('write:groups'), GroupManagementController.updateGroupName);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups/{groupId}/description:
 *   put:
 *     summary: Actualizar Descripción del Grupo
 *     description: Cambia la descripción de un grupo
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 example: "Descripción actualizada del grupo"
 *     responses:
 *       200:
 *         description: Descripción actualizada con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:groups
 */
openApiRouter.put("/whatsapp/:whatsappId/groups/:groupId/description", isApiToken('write:groups'), GroupManagementController.updateGroupDescription);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups/{groupId}/participants/add:
 *   post:
 *     summary: Agregar Participantes al Grupo (GroupManagement)
 *     description: Agrega participantes a un grupo vía GroupManagementController
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participants
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["5511999999999", "5511888888888"]
 *     responses:
 *       200:
 *         description: Participantes agregados con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:groups
 */
openApiRouter.post("/whatsapp/:whatsappId/groups/:groupId/participants/add", isApiToken('write:groups'), GroupManagementController.addParticipants);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups/{groupId}/participants/remove:
 *   post:
 *     summary: Eliminar Participantes del Grupo (GroupManagement)
 *     description: Elimina participantes de un grupo vía GroupManagementController
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participants
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["5511999999999"]
 *     responses:
 *       200:
 *         description: Participantes eliminados con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:groups
 */
openApiRouter.post("/whatsapp/:whatsappId/groups/:groupId/participants/remove", isApiToken('write:groups'), GroupManagementController.removeParticipants);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups/{groupId}/participants/promote:
 *   post:
 *     summary: Promover Participantes a Administrador (GroupManagement)
 *     description: Promueve participantes a administradores vía GroupManagementController
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participants
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["5511999999999"]
 *     responses:
 *       200:
 *         description: Participantes promovidos con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:groups
 */
openApiRouter.post("/whatsapp/:whatsappId/groups/:groupId/participants/promote", isApiToken('write:groups'), GroupManagementController.promoteParticipants);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups/{groupId}/participants/demote:
 *   post:
 *     summary: Degradar Admin a Participante (GroupManagement)
 *     description: Elimina privilegios de admin vía GroupManagementController
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participants
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["5511999999999"]
 *     responses:
 *       200:
 *         description: Participantes degradados con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:groups
 */
openApiRouter.post("/whatsapp/:whatsappId/groups/:groupId/participants/demote", isApiToken('write:groups'), GroupManagementController.demoteParticipants);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups/{groupId}/leave:
 *   post:
 *     summary: Salir del Grupo (GroupManagement)
 *     description: Hace que el bot salga del grupo vía GroupManagementController
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Salió del grupo con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:groups
 */
openApiRouter.post("/whatsapp/:whatsappId/groups/:groupId/leave", isApiToken('write:groups'), GroupManagementController.leaveGroup);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups/{groupId}/invite-link:
 *   get:
 *     summary: Obtener Enlace de Invitación (GroupManagement)
 *     description: Devuelve el enlace de invitación del grupo vía GroupManagementController
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enlace de invitación devuelto con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inviteLink:
 *                   type: string
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso read:groups
 */
openApiRouter.get("/whatsapp/:whatsappId/groups/:groupId/invite-link", isApiToken('read:groups'), GroupManagementController.getGroupInviteLink);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups/{groupId}/invite-link/revoke:
 *   post:
 *     summary: Revocar Enlace de Invitación (GroupManagement)
 *     description: Revoca el enlace actual y genera uno nuevo vía GroupManagementController
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enlace revocado y nuevo enlace generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inviteLink:
 *                   type: string
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:groups
 */
openApiRouter.post("/whatsapp/:whatsappId/groups/:groupId/invite-link/revoke", isApiToken('write:groups'), GroupManagementController.revokeGroupInviteLink);

/**
 * @swagger
 * /v1/whatsapp/{whatsappId}/groups/{groupId}/settings:
 *   put:
 *     summary: Actualizar Configuraciones del Grupo
 *     description: Actualiza las configuraciones del grupo (mensajes solo admin, edición solo admin)
 *     tags: [WhatsApp Groups]
 *     security:
 *       - apiToken: []
 *     parameters:
 *       - in: path
 *         name: whatsappId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messagesAdminsOnly:
 *                 type: boolean
 *                 description: Solo los admins pueden enviar mensajes
 *                 example: true
 *               editGroupInfoAdminsOnly:
 *                 type: boolean
 *                 description: Solo los admins pueden editar la información
 *                 example: true
 *     responses:
 *       200:
 *         description: Configuraciones actualizadas con éxito
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Sin permiso write:groups
 */
openApiRouter.put("/whatsapp/:whatsappId/groups/:groupId/settings", isApiToken('write:groups'), GroupManagementController.updateGroupSettings);

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     summary: Inicio de sesión en la API
 *     description: Autentica usuario y devuelve token de acceso
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del usuario
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario
 *                 example: "senha123"
 *     responses:
 *       200:
 *         description: Login realizado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token JWT de acceso
 *                 user:
 *                   type: object
 *                   description: Datos del usuario autenticado
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     profile:
 *                       type: string
 *       401:
 *         description: Credenciales inválidas
 *       404:
 *         description: Usuario no encontrado
 */
openApiRouter.post("/auth/login", SessionController.store);

/**
 * @swagger
 * /v1/auth/refresh:
 *   put:
 *     summary: Renovar Token
 *     description: Renueva el token de autenticación usando refresh token
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Token renovado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Nuevo token JWT
 *                 user:
 *                   type: object
 *                   description: Datos del usuario
 *       401:
 *         description: Sesión expirada o refresh token inválido
 */
openApiRouter.put("/auth/refresh", SessionController.update);

/**
 * @swagger
 * /v1/auth/logout:
 *   delete:
 *     summary: Logout
 *     description: Realiza logout del usuario e invalida la sesión
 *     tags: [Authentication]
 *     security:
 *       - apiToken: []
 *     responses:
 *       200:
 *         description: Logout realizado con éxito
 *       401:
 *         description: Token inválido o sesión expirada
 */
openApiRouter.delete("/auth/logout", isApiToken('read:profile'), SessionController.remove);

/**
 * @swagger
 * /v1/auth/forgot-password:
 *   post:
 *     summary: Solicitar Restablecimiento de Contraseña
 *     description: Envía un correo con el enlace para restablecer la contraseña
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del usuario
 *                 example: "usuario@example.com"
 *     responses:
 *       200:
 *         description: Email enviado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Correo enviado con éxito."
 *       404:
 *         description: Email no encontrado
 *       500:
 *         description: Error al enviar el correo
 */
openApiRouter.post("/auth/forgot-password", SessionController.forgotPassword);

/**
 * @swagger
 * /v1/auth/reset-password:
 *   post:
 *     summary: Restablecer Contraseña
 *     description: Restablece la contraseña usando el token recibido por correo
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token recibido por correo
 *                 example: "abc123def456..."
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: Nueva contraseña
 *                 example: "nuevaContraseña123"
 *     responses:
 *       200:
 *         description: Contraseña restablecida con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Contraseña restablecida con éxito."
 *       400:
 *         description: Token inválido o expirado
 */
openApiRouter.post("/auth/reset-password", SessionController.resetPassword);

export default openApiRouter;
