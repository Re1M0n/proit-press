/* eslint-disable */
import { RequestHandler } from "express";
import multer from "multer";
import uploadConfig from "../config/upload";
import personalizationUpload from "../config/uploadConfig";
import { authLimiter, apiLimiter } from "../config/rateLimiter";
import * as RateLimitController from "../controllers/RateLimitController";

import isAuth from "../middleware/isAuth";
import * as ActivityLogController from "../controllers/ActivityLogController";
import * as ApiController from "../controllers/ApiController";
import isAuthApi from "../middleware/isAuthApi";
import * as ApiTokenController from "../controllers/ApiTokenController";
import * as SessionController from "../controllers/SessionController";
import * as UserController from "../controllers/UserController";
import * as BackupController from "../controllers/BackupController";
import * as CacheController from "../controllers/CacheController";
import * as ClientStatusController from "../controllers/ClientStatusController";
import * as ContactController from "../controllers/ContactController";
import * as ImportPhoneContactsController from "../controllers/ImportPhoneContactsController";
import * as ErrorLogController from "../controllers/ErrorLogController";
import * as FileManagerController from "../controllers/FileManagerController";
import * as GroupEventController from "../controllers/GroupEventController";
import * as GroupManagementController from "../controllers/GroupManagementController";
import * as GroupController from "../controllers/GroupController";
import * as HealthCheckController from "../controllers/HealthCheckController";
import * as IntegrationController from "../controllers/IntegrationController";
import * as MessageController from "../controllers/MessageController";
import * as NetworkMonitorController from "../controllers/NetworkMonitorController";
import * as PersonalizationController from "../controllers/PersonalizationController";
import * as PollVoteController from "../controllers/PollVoteController";
import * as QueueMonitorController from "../controllers/QueueMonitorController";
import * as QueueController from "../controllers/QueueController";
import * as QuickAnswerController from "../controllers/QuickAnswerController";
import * as SettingController from "../controllers/SettingController";
import * as SystemCleanupController from "../controllers/SystemCleanupController";
import * as SystemHealthController from "../controllers/SystemHealthController";
import * as sytemController from "../controllers/SystemController";
import * as diskSpaceController from "../controllers/DiskSpaceController";
import * as memoryUsageController from "../controllers/MemoryUsageController";
import * as cpuUsageController from "../controllers/CpuUsageController";
import * as databaseMonitorController from "../controllers/DatabaseMonitorController";
import isMasterAdmin from "../middleware/isMasterAdmin";
import * as SystemUpdateController from "../controllers/SystemUpdateController";
import * as TagController from "../controllers/TagController";
import * as TicketController from "../controllers/TicketController";
import * as UserMonitorController from "../controllers/UserMonitorController";
import * as VersionController from "../controllers/VersionController";
import * as WhatsappLibController from "../controllers/WhatsappLibController";
import * as VideoController from "../controllers/VideoController";
import * as WhatsappNotificationController from "../controllers/WhatsappNotificationController";
import * as WhatsAppController from "../controllers/WhatsAppController";
import WhatsAppSessionController from "../controllers/WhatsAppSessionController";
/* eslint-disable */

/* eslint-disable */

const upload = multer(uploadConfig);
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.sql') || file.originalname.endsWith('.sql.gz')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .sql o .sql.gz'));
    }
  }
});

export interface RouteDefinition {
  method: "get" | "post" | "put" | "delete" | "patch";
  path: string;
  middlewares?: RequestHandler[];
  handler: RequestHandler;
}

export interface RouteGroup {
  path?: string;
  routes: RouteDefinition[];
}

export const routeRegistry: RouteGroup[] = [
  // activityLog
  {
    routes: [
    { method: "get", path: "/activity-logs/stats", middlewares: [isAuth], handler: ActivityLogController.stats },
    { method: "get", path: "/activity-logs/actions", middlewares: [isAuth], handler: ActivityLogController.actions },
    { method: "get", path: "/activity-logs/entities", middlewares: [isAuth], handler: ActivityLogController.entities },
    { method: "get", path: "/activity-logs/entity-types", middlewares: [isAuth], handler: ActivityLogController.entities },
    { method: "get", path: "/activity-logs/:id/details", middlewares: [isAuth], handler: ActivityLogController.show },
    { method: "get", path: "/activity-logs", middlewares: [isAuth], handler: ActivityLogController.index }
    ]
  },
  // api
  {
    path: "/api/messages",
    routes: [
    { method: "post", path: "/send", middlewares: [isAuthApi, upload.array("medias")], handler: ApiController.index }
    ]
  },
  // apiToken
  {
    routes: [
    { method: "get", path: "/api-tokens", middlewares: [isAuth], handler: ApiTokenController.index },
    { method: "get", path: "/api-tokens/:id", middlewares: [isAuth], handler: ApiTokenController.show },
    { method: "post", path: "/api-tokens", middlewares: [isAuth], handler: ApiTokenController.store },
    { method: "delete", path: "/api-tokens/:id", middlewares: [isAuth], handler: ApiTokenController.remove }
    ]
  },
  // auth
  {
    path: "/auth",
    routes: [
    { method: "post", path: "/login", middlewares: [authLimiter], handler: SessionController.store },
    { method: "post", path: "/forgot-password", middlewares: [authLimiter], handler: SessionController.forgotPassword },
    { method: "post", path: "/reset-password", middlewares: [authLimiter], handler: SessionController.resetPassword },
    { method: "post", path: "/refresh_token", handler: SessionController.update },
    { method: "delete", path: "/logout", middlewares: [isAuth], handler: SessionController.remove }
    ]
  },
  // backup
  {
    routes: [
    { method: "get", path: "/backups", middlewares: [isAuth], handler: BackupController.index },
    { method: "post", path: "/backups", middlewares: [isAuth], handler: BackupController.store },
    { method: "post", path: "/backups/upload", middlewares: [isAuth, uploadMemory.single('file')], handler: BackupController.upload },
    { method: "get", path: "/backups/:filename", middlewares: [isAuth], handler: BackupController.show },
    { method: "post", path: "/backups/:filename/restore", middlewares: [isAuth], handler: BackupController.update },
    { method: "delete", path: "/backups/:filename", middlewares: [isAuth], handler: BackupController.remove }
    ]
  },
  // cache
  {
    routes: [
    { method: "get", path: "/cache/stats", middlewares: [isAuth], handler: CacheController.getCacheStats },
    { method: "get", path: "/cache/keys", middlewares: [isAuth], handler: CacheController.getCacheKeys },
    { method: "post", path: "/cache/flush", middlewares: [isAuth], handler: CacheController.flushCache }
    ]
  },
  // clientStatus
  {
    routes: [
    { method: "get", path: "/client-status/statistics", middlewares: [isAuth], handler: ClientStatusController.statistics },
    { method: "get", path: "/client-status", middlewares: [isAuth], handler: ClientStatusController.index },
    { method: "post", path: "/client-status", middlewares: [isAuth], handler: ClientStatusController.store },
    { method: "put", path: "/client-status/:clientStatusId", middlewares: [isAuth], handler: ClientStatusController.update },
    { method: "get", path: "/client-status/:clientStatusId", middlewares: [isAuth], handler: ClientStatusController.show },
    { method: "delete", path: "/client-status/:clientStatusId", middlewares: [isAuth], handler: ClientStatusController.remove },
    { method: "delete", path: "/client-status", middlewares: [isAuth], handler: ClientStatusController.removeAll }
    ]
  },
  // contact
  {
    routes: [
    { method: "get", path: "/contacts", middlewares: [isAuth], handler: ContactController.index },
    { method: "get", path: "/contacts/export", middlewares: [isAuth], handler: ContactController.exportContacts },
    { method: "get", path: "/contacts/blocked", middlewares: [isAuth], handler: ContactController.listBlockedContacts },
    { method: "get", path: "/contacts/:contactId/block-status", middlewares: [isAuth], handler: ContactController.getBlockStatus },
    { method: "get", path: "/contacts/:contactId/about", middlewares: [isAuth], handler: ContactController.getAbout },
    { method: "get", path: "/contacts/:contactId/common-groups", middlewares: [isAuth], handler: ContactController.getCommonGroups },
    { method: "post", path: "/contacts/:contactId/refresh-group-pic", middlewares: [isAuth], handler: ContactController.refreshGroupProfilePic },
    { method: "get", path: "/contacts/:contactId", middlewares: [isAuth], handler: ContactController.show },
    { method: "post", path: "/contacts", middlewares: [isAuth], handler: ContactController.store },
    { method: "post", path: "/contact", middlewares: [isAuth], handler: ContactController.getContact },
    { method: "post", path: "/contacts/:contactId/block", middlewares: [isAuth], handler: ContactController.blockContact },
    { method: "post", path: "/contacts/:contactId/unblock", middlewares: [isAuth], handler: ContactController.unblockContact },
    { method: "put", path: "/contacts/:contactId", middlewares: [isAuth], handler: ContactController.update },
    { method: "delete", path: "/contacts/:contactId", middlewares: [isAuth], handler: ContactController.remove },
    { method: "delete", path: "/contacts", middlewares: [isAuth], handler: ContactController.removeAll },
    { method: "post", path: "/contacts/import", middlewares: [isAuth], handler: ImportPhoneContactsController.store }
    ]
  },
  // errorLog
  {
    path: "/error-logs",
    routes: [
    { method: "post", path: "/", handler: ErrorLogController.store },
    { method: "get", path: "/", middlewares: [isAuth], handler: ErrorLogController.index },
    { method: "get", path: "/:id", middlewares: [isAuth], handler: ErrorLogController.show },
    { method: "delete", path: "/cleanup", middlewares: [isAuth], handler: ErrorLogController.cleanupOldLogs }
    ]
  },
  // fileManager
  {
    routes: [
    { method: "get", path: '/file-manager/stats', middlewares: [isAuth], handler: FileManagerController.getPublicFolderStats },
    { method: "post", path: '/file-manager/delete', middlewares: [isAuth], handler: FileManagerController.deleteFiles },
    { method: "get", path: '/file-manager/download', middlewares: [isAuth], handler: FileManagerController.downloadFile },
    { method: "get", path: '/file-manager/view', middlewares: [isAuth], handler: FileManagerController.viewFile }
    ]
  },
  // groupEvent
  {
    routes: [
    { method: "get", path: "/group-events", middlewares: [isAuth], handler: GroupEventController.listEvents },
    { method: "get", path: "/group-events/:eventId", middlewares: [isAuth], handler: GroupEventController.getEvent },
    { method: "delete", path: "/group-events/:eventId", middlewares: [isAuth], handler: GroupEventController.deleteEvent },
    { method: "post", path: "/group-events/cleanup", middlewares: [isAuth], handler: GroupEventController.deleteOldEvents },
    { method: "get", path: "/group-events/stats/group/:groupId", middlewares: [isAuth], handler: GroupEventController.getGroupStats },
    { method: "get", path: "/group-events/stats/whatsapp/:whatsappId", middlewares: [isAuth], handler: GroupEventController.getWhatsappStats }
    ]
  },
  // groupManagement
  {
    routes: [
    { method: "post", path: "/whatsapp/:whatsappId/groups", middlewares: [isAuth], handler: GroupManagementController.createGroup },
    { method: "get", path: "/whatsapp/:whatsappId/groups", middlewares: [isAuth], handler: GroupManagementController.listGroups },
    { method: "get", path: "/whatsapp/:whatsappId/groups/:groupId", middlewares: [isAuth], handler: GroupManagementController.getGroupInfo },
    { method: "put", path: "/whatsapp/:whatsappId/groups/:groupId/name", middlewares: [isAuth], handler: GroupManagementController.updateGroupName },
    { method: "put", path: "/whatsapp/:whatsappId/groups/:groupId/description", middlewares: [isAuth], handler: GroupManagementController.updateGroupDescription },
    { method: "post", path: "/whatsapp/:whatsappId/groups/:groupId/participants/add", middlewares: [isAuth], handler: GroupManagementController.addParticipants },
    { method: "post", path: "/whatsapp/:whatsappId/groups/:groupId/participants/remove", middlewares: [isAuth], handler: GroupManagementController.removeParticipants },
    { method: "post", path: "/whatsapp/:whatsappId/groups/:groupId/participants/promote", middlewares: [isAuth], handler: GroupManagementController.promoteParticipants },
    { method: "post", path: "/whatsapp/:whatsappId/groups/:groupId/participants/demote", middlewares: [isAuth], handler: GroupManagementController.demoteParticipants },
    { method: "post", path: "/whatsapp/:whatsappId/groups/:groupId/leave", middlewares: [isAuth], handler: GroupManagementController.leaveGroup },
    { method: "get", path: "/whatsapp/:whatsappId/groups/:groupId/invite-link", middlewares: [isAuth], handler: GroupManagementController.getGroupInviteLink },
    { method: "post", path: "/whatsapp/:whatsappId/groups/:groupId/invite-link/revoke", middlewares: [isAuth], handler: GroupManagementController.revokeGroupInviteLink },
    { method: "put", path: "/whatsapp/:whatsappId/groups/:groupId/settings", middlewares: [isAuth], handler: GroupManagementController.updateGroupSettings }
    ]
  },
  // group
  {
    routes: [
    { method: "post", path: "/groups/:groupId/participants/add", middlewares: [isAuth], handler: GroupController.addParticipants },
    { method: "post", path: "/groups/:groupId/participants/remove", middlewares: [isAuth], handler: GroupController.removeParticipants },
    { method: "post", path: "/groups/:groupId/participants/promote", middlewares: [isAuth], handler: GroupController.promoteParticipants },
    { method: "post", path: "/groups/:groupId/participants/demote", middlewares: [isAuth], handler: GroupController.demoteParticipants },
    { method: "get", path: "/groups/:groupId/participants", middlewares: [isAuth], handler: GroupController.listParticipants },
    { method: "get", path: "/groups/:groupId/invite", middlewares: [isAuth], handler: GroupController.getInvite },
    { method: "post", path: "/groups/:groupId/invite/revoke", middlewares: [isAuth], handler: GroupController.revokeInvite },
    { method: "post", path: "/groups/:groupId/settings/memberAddMode", middlewares: [isAuth], handler: GroupController.setMemberAddMode },
    { method: "post", path: "/groups/:groupId/settings/announcement", middlewares: [isAuth], handler: GroupController.setAnnouncement },
    { method: "post", path: "/groups/:groupId/settings/restrict", middlewares: [isAuth], handler: GroupController.setRestrict },
    { method: "get", path: "/groups/:groupId/info", middlewares: [isAuth], handler: GroupController.getInfo },
    { method: "post", path: "/groups/:groupId/subject", middlewares: [isAuth], handler: GroupController.setSubject },
    { method: "post", path: "/groups/:groupId/description", middlewares: [isAuth], handler: GroupController.setDescription },
    { method: "post", path: "/groups/:groupId/picture", middlewares: [isAuth, upload.single("file")], handler: GroupController.setPicture },
    { method: "delete", path: "/groups/:groupId/picture", middlewares: [isAuth], handler: GroupController.deletePicture },
    { method: "get", path: "/groups/:groupId/membership/requests", middlewares: [isAuth], handler: GroupController.listMembershipRequests },
    { method: "post", path: "/groups/:groupId/membership/approve", middlewares: [isAuth], handler: GroupController.approveMembershipRequests },
    { method: "post", path: "/groups/:groupId/membership/reject", middlewares: [isAuth], handler: GroupController.rejectMembershipRequests },
    { method: "post", path: "/groups/:groupId/leave", middlewares: [isAuth], handler: GroupController.leaveGroup }
    ]
  },
  // healthCheck
  {
    routes: [
    { method: "get", path: "/health-check", middlewares: [isAuth], handler: HealthCheckController.index },
    { method: "get", path: "/health-check/:whatsappId", middlewares: [isAuth], handler: HealthCheckController.show }
    ]
  },
  // integration
  {
    routes: [
    { method: "get", path: "/integrations", middlewares: [isAuth], handler: IntegrationController.index },
    { method: "put", path: "/integrations/:integrationKey", middlewares: [isAuth], handler: IntegrationController.update }
    ]
  },
  // message
  {
    routes: [
    { method: "get", path: "/messages/count", middlewares: [isAuth], handler: MessageController.count },
    { method: "get", path: "/messages/:ticketId", middlewares: [isAuth], handler: MessageController.index },
    { method: "post", path: "/messages/:ticketId", middlewares: [isAuth, upload.array("medias")], handler: MessageController.store },
    { method: "post", path: "/messages/:ticketId/contacts", middlewares: [isAuth], handler: MessageController.sendContacts },
    { method: "post", path: "/messages/:ticketId/poll", middlewares: [isAuth], handler: MessageController.sendPoll },
    { method: "post", path: "/messages/:ticketId/forward", middlewares: [isAuth], handler: MessageController.forwardMessages },
    { method: "post", path: "/messages/edit/:messageId", middlewares: [isAuth], handler: MessageController.edit },
    { method: "delete", path: "/messages/:messageId", middlewares: [isAuth], handler: MessageController.remove },
    { method: "post", path: "/messages/:ticketId/read", middlewares: [isAuth], handler: MessageController.markAsRead },
    { method: "post", path: "/messages/:messageId/reactions", middlewares: [isAuth], handler: MessageController.reactMessage },
    { method: "get", path: "/messages/:messageId/reactions", middlewares: [isAuth], handler: MessageController.getReactions },
    { method: "post", path: "/messages/:ticketId/presence/typing", middlewares: [isAuth], handler: MessageController.sendTypingIndicator },
    { method: "post", path: "/messages/:ticketId/presence/recording", middlewares: [isAuth], handler: MessageController.sendRecordingIndicator },
    { method: "post", path: "/messages/:ticketId/presence/available", middlewares: [isAuth], handler: MessageController.setAvailablePresence }
    ]
  },
  // networkMonitor
  {
    routes: [
    { method: "get", path: "/network-status", middlewares: [isAuth], handler: NetworkMonitorController.index }
    ]
  },
  // personalization
  {
    routes: [
    { method: "get", path: "/personalizations", handler: PersonalizationController.list },
    { method: "delete", path: "/personalizations/:theme", middlewares: [isAuth], handler: PersonalizationController.remove },
    { method: "put", path: "/personalizations/:theme/company", middlewares: [isAuth], handler: PersonalizationController.createOrUpdateCompany },
    { method: "put", path: "/personalizations/:theme/logos", middlewares: [isAuth, personalizationUpload.fields([
    { name: "favico", maxCount: 1 },
    { name: "logo", maxCount: 1 },
    { name: "logoTicket", maxCount: 1 }
  ])], handler: PersonalizationController.createOrUpdateLogos },
    { method: "put", path: "/personalizations/:theme/colors", middlewares: [isAuth], handler: PersonalizationController.createOrUpdateColors },
    { method: "delete", path: "/personalizations/:theme/logos/:logoType", middlewares: [isAuth], handler: PersonalizationController.deleteLogo }
    ]
  },
  // pollVote
  {
    routes: [
    { method: "get", path: "/poll-votes/:pollMessageId/summary", middlewares: [isAuth], handler: PollVoteController.getVotesSummary },
    { method: "get", path: "/poll-votes/:pollMessageId", middlewares: [isAuth], handler: PollVoteController.getVotes }
    ]
  },
  // queueMonitor
  {
    routes: [
    { method: "get", path: "/queue-monitor", middlewares: [isAuth], handler: QueueMonitorController.index }
    ]
  },
  // queue
  {
    routes: [
    { method: "get", path: "/queue", middlewares: [isAuth], handler: QueueController.index },
    { method: "post", path: "/queue", middlewares: [isAuth], handler: QueueController.store },
    { method: "get", path: "/queue/:queueId", middlewares: [isAuth], handler: QueueController.show },
    { method: "put", path: "/queue/:queueId", middlewares: [isAuth], handler: QueueController.update },
    { method: "delete", path: "/queue/:queueId", middlewares: [isAuth], handler: QueueController.remove }
    ]
  },
  // quickAnswer
  {
    routes: [
    { method: "get", path: "/quickAnswers", middlewares: [isAuth], handler: QuickAnswerController.index },
    { method: "get", path: "/quickAnswers/:quickAnswerId", middlewares: [isAuth], handler: QuickAnswerController.show },
    { method: "post", path: "/quickAnswers", middlewares: [isAuth, upload.single("media")], handler: QuickAnswerController.store },
    { method: "put", path: "/quickAnswers/:quickAnswerId", middlewares: [isAuth, upload.single("media")], handler: QuickAnswerController.update },
    { method: "delete", path: "/quickAnswers/:quickAnswerId", middlewares: [isAuth], handler: QuickAnswerController.remove },
    { method: "delete", path: "/quickAnswers", middlewares: [isAuth], handler: QuickAnswerController.removeAll }
    ]
  },
  // setting
  {
    routes: [
    { method: "get", path: "/settings", middlewares: [isAuth], handler: SettingController.index },
    { method: "put", path: "/settings/:settingKey", middlewares: [isAuth], handler: SettingController.update }
    ]
  },
  // systemCleanup
  {
    routes: [
    { method: "get", path: "/system-cleanup", middlewares: [isAuth], handler: SystemCleanupController.index },
    { method: "post", path: "/system-cleanup", middlewares: [isAuth], handler: SystemCleanupController.store },
    { method: "post", path: "/system-cleanup/execute", middlewares: [isAuth], handler: SystemCleanupController.execute }
    ]
  },
  // systemHealth
  {
    routes: [
    { method: "get", path: "/system-health", middlewares: [isAuth], handler: SystemHealthController.index }
    ]
  },
  // system
  {
    routes: [
    { method: "post", path: "/restartpm2", middlewares: [isAuth], handler: sytemController.restartPm2 },
    { method: "get", path: "/disk-space", middlewares: [isAuth], handler: diskSpaceController.getDiskSpace },
    { method: "get", path: "/folder-contents", middlewares: [isAuth], handler: diskSpaceController.getFolderContent },
    { method: "get", path: "/memory-usage", middlewares: [isAuth], handler: memoryUsageController.getMemoryUsage },
    { method: "get", path: "/cpu-usage", middlewares: [isAuth], handler: cpuUsageController.cpuUsage },
    { method: "get", path: "/database-status", middlewares: [isAuth], handler: databaseMonitorController.getDatabaseStatus }
    ]
  },
  // systemUpdate
  {
    routes: [
    { method: "get", path: "/system-update/check", middlewares: [isAuth, isMasterAdmin], handler: SystemUpdateController.checkUpdates },
    { method: "post", path: "/system-update/install", middlewares: [isAuth, isMasterAdmin], handler: SystemUpdateController.installUpdate },
    { method: "get", path: "/system-update/status", middlewares: [isAuth, isMasterAdmin], handler: SystemUpdateController.getStatus },
    { method: "get", path: "/system-update/backups", middlewares: [isAuth, isMasterAdmin], handler: SystemUpdateController.getBackups },
    { method: "post", path: "/system-update/restore/:backupFileName", middlewares: [isAuth, isMasterAdmin], handler: SystemUpdateController.restoreFromBackup }
    ]
  },
  // tag
  {
    routes: [
    { method: "get", path: "/tags/list", middlewares: [isAuth], handler: TagController.list },
    { method: "get", path: "/tags", middlewares: [isAuth], handler: TagController.index },
    { method: "post", path: "/tags", middlewares: [isAuth], handler: TagController.store },
    { method: "put", path: "/tags/:tagId", middlewares: [isAuth], handler: TagController.update },
    { method: "get", path: "/tags/:tagId", middlewares: [isAuth], handler: TagController.show },
    { method: "delete", path: "/tags/:tagId", middlewares: [isAuth], handler: TagController.remove },
    { method: "delete", path: "/tags", middlewares: [isAuth], handler: TagController.removeAll },
    { method: "post", path: "/tags/sync", middlewares: [isAuth], handler: TagController.syncTags },
    { method: "get", path: "/tags-with-count", handler: TagController.indexCount }
    ]
  },
  // ticket
  {
    routes: [
    { method: "get", path: "/tickets", middlewares: [isAuth], handler: TicketController.index },
    { method: "get", path: "/tickets/count", middlewares: [isAuth], handler: TicketController.count },
    { method: "put", path: "/tickets/close-all", middlewares: [isAuth], handler: TicketController.closeTickets },
    { method: "get", path: "/tickets/:ticketId", middlewares: [isAuth], handler: TicketController.show },
    { method: "post", path: "/tickets", middlewares: [isAuth], handler: TicketController.store },
    { method: "put", path: "/tickets/:ticketId", middlewares: [isAuth], handler: TicketController.update },
    { method: "delete", path: "/tickets/:ticketId", middlewares: [isAuth], handler: TicketController.remove },
    { method: "get", path: "/tickets/contact/:contactId/open", middlewares: [isAuth], handler: TicketController.checkOpenTickets }
    ]
  },
  // userMonitor
  {
    routes: [
    { method: "get", path: "/user-monitor", middlewares: [isAuth], handler: UserMonitorController.index }
    ]
  },
  // user
  {
    routes: [
    { method: "get", path: "/users", middlewares: [isAuth], handler: UserController.index },
    { method: "post", path: "/users", middlewares: [isAuth], handler: UserController.store },
    { method: "put", path: "/users/:userId", middlewares: [isAuth], handler: UserController.update },
    { method: "get", path: "/users/:userId", middlewares: [isAuth], handler: UserController.show },
    { method: "delete", path: "/users/:userId", middlewares: [isAuth], handler: UserController.remove }
    ]
  },
  // version
  {
    routes: [
    { method: "get", path: "/version", middlewares: [isAuth, isMasterAdmin], handler: VersionController.getVersion },
    { method: "post", path: "/whatsapp-lib/update", middlewares: [isAuth, isMasterAdmin], handler: WhatsappLibController.updateWhatsappLibrary },
    { method: "post", path: "/whatsapp-lib/update-git", middlewares: [isAuth, isMasterAdmin], handler: WhatsappLibController.updateWhatsappLibraryFromGit }
    ]
  },
  // video
  {
    routes: [
    { method: "get", path: "/videos", middlewares: [isAuth], handler: VideoController.index },
    { method: "get", path: "/videos/:id", middlewares: [isAuth], handler: VideoController.show },
    { method: "post", path: "/videos", middlewares: [isAuth], handler: VideoController.store },
    { method: "put", path: "/videos/:id", middlewares: [isAuth], handler: VideoController.update },
    { method: "delete", path: "/videos/:id", middlewares: [isAuth], handler: VideoController.remove }
    ]
  },
  // whatsappNotification
  {
    routes: [
    { method: "post", path: "/whatsapp-notification/:whatsappId", middlewares: [isAuth], handler: WhatsappNotificationController.notifyChannel },
    { method: "post", path: "/whatsapp-notification/check/all", middlewares: [isAuth], handler: WhatsappNotificationController.notifyAllDisconnected }
    ]
  },
  // whatsapp
  {
    routes: [
    { method: "get", path: "/whatsapp/", middlewares: [isAuth], handler: WhatsAppController.index },
    { method: "post", path: "/whatsapp/", middlewares: [isAuth], handler: WhatsAppController.store },
    { method: "get", path: "/whatsapp/:whatsappId", middlewares: [isAuth], handler: WhatsAppController.show },
    { method: "put", path: "/whatsapp/:whatsappId", middlewares: [isAuth], handler: WhatsAppController.update },
    { method: "delete", path: "/whatsapp/:whatsappId", middlewares: [isAuth], handler: WhatsAppController.remove },
    { method: "post", path: "/whatsapp/:whatsappId/restart", middlewares: [isAuth], handler: WhatsAppController.restart },
    { method: "post", path: "/whatsapp/:whatsappId/shutdown", middlewares: [isAuth], handler: WhatsAppController.shutdown }
    ]
  },
  // whatsappSession
  {
    routes: [
    { method: "post", path: "/whatsappsession/:whatsappId", middlewares: [isAuth], handler: WhatsAppSessionController.store },
    { method: "put", path: "/whatsappsession/:whatsappId", middlewares: [isAuth], handler: WhatsAppSessionController.update },
    { method: "delete", path: "/whatsappsession/:whatsappId", middlewares: [isAuth], handler: WhatsAppSessionController.remove }
    ]
  },
  // rateLimitRoutes
  {
    routes: [
    { method: "get", path: "/rate-limit-status", handler: RateLimitController.status },
    { method: "get", path: "/rate-limit-test-auth", middlewares: [authLimiter], handler: RateLimitController.testAuth },
    { method: "get", path: "/rate-limit-test-api", middlewares: [apiLimiter], handler: RateLimitController.testApi },
    { method: "post", path: "/rate-limit-reset", handler: RateLimitController.reset }
    ]
  }
];
