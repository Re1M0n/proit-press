import { existsSync } from "fs";
import { Op } from "sequelize";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import PushToken from "../../models/PushToken";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

let firebaseUnavailableLogged = false;
const channelNotificationTimes = new Map<number, number>();
const ticketNotificationTimes = new Map<number, number>();
const MAX_THROTTLE_ENTRIES = 10000;

const recordNotificationTime = (times: Map<number, number>, key: number, time: number): void => {
  if (times.size >= MAX_THROTTLE_ENTRIES && !times.has(key)) {
    const oldestKey = times.keys().next().value;
    if (oldestKey !== undefined) times.delete(oldestKey);
  }
  times.set(key, time);
};

export const isFirebaseConfigured = (): boolean => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      return Boolean(account.project_id && account.client_email && account.private_key);
    } catch (_error) {
      return false;
    }
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return Boolean(credentialsPath && existsSync(credentialsPath));
};

const getMessagingClient = () => {
  if (!isFirebaseConfigured()) {
    if (!firebaseUnavailableLogged) {
      console.warn("[PUSH] Firebase no está configurado; las notificaciones push quedan deshabilitadas.");
      firebaseUnavailableLogged = true;
    }
    return null;
  }

  try {
    if (!getApps().length) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      initializeApp({
        credential: serviceAccount
          ? cert(JSON.parse(serviceAccount))
          : applicationDefault()
      });
    }
    return getMessaging();
  } catch (error) {
    console.error("[PUSH] No se pudo inicializar Firebase Admin:", (error as Error).message);
    return null;
  }
};

const sendToUsers = async (
  userIds: number[],
  notification: { title: string; body: string },
  data: Record<string, string>
): Promise<void> => {
  if (!userIds.length) return;
  const messaging = getMessagingClient();
  if (!messaging) return;

  const enabledUsers = await User.findAll({
    attributes: ["id"],
    where: { id: { [Op.in]: userIds }, active: true, mobileNotificationsEnabled: true }
  });
  const enabledUserIds = enabledUsers.map(user => user.id);
  if (!enabledUserIds.length) return;

  const devices = await PushToken.findAll({
    where: { userId: { [Op.in]: enabledUserIds } }
  });
  if (!devices.length) return;

  for (let index = 0; index < devices.length; index += 500) {
    const batch = devices.slice(index, index + 500);
    const result = await messaging.sendEachForMulticast({
      tokens: batch.map(device => device.token),
      notification,
      data,
      android: { priority: "high", notification: { channelId: "proit-press-alerts" } }
    });

    const invalidTokens = batch
      .filter((_, tokenIndex) => {
        const response = result.responses[tokenIndex];
        const code = response?.error?.code;
        return code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token";
      })
      .map(device => device.id);

    if (invalidTokens.length) {
      await PushToken.destroy({ where: { id: { [Op.in]: invalidTokens } } });
    }
  }
};

export const notifyIncomingTicketMessage = async (
  ticket: Ticket,
  message: { body?: string; fromMe?: boolean }
): Promise<void> => {
  if (message.fromMe || ticket.status === "closed") return;
  const now = Date.now();
  const lastNotification = ticketNotificationTimes.get(ticket.id) || 0;
  if (now - lastNotification < 5 * 60 * 1000) return;

  const users = await User.findAll({
    where: { active: true, mobileNotificationsEnabled: true },
    include: [{ model: Queue, as: "queues", attributes: ["id"] }]
  });
  const recipients = users.filter(user => {
    if (ticket.status === "open") return Number(ticket.userId) === user.id;
    if (ticket.status !== "pending" || ticket.userId) return false;
    return !ticket.queueId || user.queues?.some(queue => queue.id === ticket.queueId);
  });

  if (!recipients.length) return;
  recordNotificationTime(ticketNotificationTimes, ticket.id, now);
  await sendToUsers(
    recipients.map(user => user.id),
    { title: "Nuevo mensaje en ProIT Press", body: "Tenés un mensaje que requiere atención." },
    { type: "message", ticketId: String(ticket.id), url: `/tickets/${ticket.id}` }
  );
};

export const notifyChannelDisconnected = async (
  whatsapp: Whatsapp,
  _reason?: string
): Promise<void> => {
  const now = Date.now();
  const lastNotification = channelNotificationTimes.get(whatsapp.id) || 0;
  if (now - lastNotification < 30 * 60 * 1000) return;

  const admins = await User.findAll({
    where: {
      active: true,
      mobileNotificationsEnabled: true,
      profile: { [Op.in]: ["admin", "masteradmin"] }
    }
  });
  if (!admins.length) return;
  const tokens = await PushToken.count({ where: { userId: { [Op.in]: admins.map(user => user.id) } } });
  if (!tokens) return;

  recordNotificationTime(channelNotificationTimes, whatsapp.id, now);
  await sendToUsers(
    admins.map(user => user.id),
    { title: `Canal desconectado: ${whatsapp.name}`, body: "Se interrumpió la conexión del canal." },
    { type: "channel-disconnected", channelId: String(whatsapp.id), url: "/channels" }
  );
};
