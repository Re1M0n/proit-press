import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { Preferences } from "@capacitor/preferences";
import api from "./api";

const pushTokenKey = "proitPressPushToken";
let registrationInProgress = null;
let listenersReady = false;
let pendingRegistration = null;
let registeredListeners = [];

const ensurePushListeners = async () => {
  if (listenersReady) return;

  registeredListeners = await Promise.all([
    PushNotifications.addListener("registration", async ({ value }) => {
      const previous = await Preferences.get({ key: pushTokenKey });
      await Preferences.set({ key: pushTokenKey, value });
      if (previous.value && previous.value !== value) {
        await api.delete("/push-notifications/devices", { data: { token: previous.value } }).catch(() => {});
      }

      const { data } = await api.get("/push-notifications/status").catch(() => ({ data: { enabled: false } }));
      if (data.enabled && !pendingRegistration) {
        await api.post("/push-notifications/devices", { token: value, platform: "android" });
      }
      const pending = pendingRegistration;
      pendingRegistration = null;
      pending?.resolve(value);
    }),
    PushNotifications.addListener("registrationError", error => {
      console.error("No se pudo registrar ProIT Press en FCM:", error);
      pendingRegistration?.reject(new Error(error.error || "No se pudo registrar este dispositivo en Firebase."));
      pendingRegistration = null;
    }),
    PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const url = notification.data?.url;
      if (url) window.location.assign(url);
    })
  ]);
  listenersReady = true;
};

const registerNativePushDevice = async ({ requestPermission = true } = {}) => {
  if (!Capacitor.isNativePlatform()) {
    return { ready: false, reason: "La recepción en segundo plano requiere ProIT Press para Android." };
  }

  const permission = await PushNotifications.checkPermissions();
  const granted = permission.receive === "granted"
    ? permission
    : requestPermission ? await PushNotifications.requestPermissions() : permission;

  if (granted.receive !== "granted") {
    return { ready: false, reason: "No se concedió permiso para mostrar notificaciones." };
  }

  const previous = await Preferences.get({ key: pushTokenKey });
  if (!requestPermission && previous.value) {
    await ensurePushListeners();
    await api.post("/push-notifications/devices", { token: previous.value, platform: "android" });
    return { ready: true, token: previous.value };
  }

  await ensurePushListeners();
  const tokenResult = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRegistration = null;
      reject(new Error("No se pudo registrar este dispositivo en Firebase. Revisá la configuración FCM."));
    }, 15000);
    pendingRegistration = {
      resolve: token => { clearTimeout(timeout); resolve(token); },
      reject: error => { clearTimeout(timeout); reject(error); }
    };
  });

  try {
    await PushNotifications.register();
    const token = await tokenResult;
    await api.post("/push-notifications/devices", { token, platform: "android" });
    if (previous.value && previous.value !== token) {
      await api.delete("/push-notifications/devices", { data: { token: previous.value } }).catch(() => {});
    }
    return { ready: true, token };
  } catch (error) {
    const pending = pendingRegistration;
    pendingRegistration = null;
    pending?.reject(error);
    throw error;
  }
};

export const refreshMobilePushRegistration = async () => {
  if (!Capacitor.isNativePlatform()) return { ready: false };
  const { data } = await api.get("/push-notifications/status");
  if (!data.enabled) return { ready: false };
  return registerNativePushDevice({ requestPermission: false });
};

const pushServiceReady = async () => {
  const { data } = await api.get("/push-notifications/status");
  if (!data.configured) {
    return { ready: false, reason: "Las notificaciones todavía no están configuradas en el servidor. Contactá al administrador." };
  }
  return { ready: true };
};

const cleanupPushListeners = async () => {
  registeredListeners.forEach(listener => listener.remove());
  registeredListeners = [];
  listenersReady = false;
};

export const enableMobileMode = async () => {
  if (registrationInProgress) return registrationInProgress;

  registrationInProgress = (async () => {
    const service = await pushServiceReady();
    if (!service.ready) return service;

    if (!Capacitor.isNativePlatform()) {
      await api.put("/push-notifications/mode", { enabled: true });
      return { ready: true, native: false };
    }

    const status = await registerNativePushDevice();
    if (!status.ready) return status;
    await api.put("/push-notifications/mode", { enabled: true });
    return { ready: true, native: true };
  })();

  try {
    return await registrationInProgress;
  } finally {
    registrationInProgress = null;
  }
};

export const disableMobileMode = async () => {
  await api.put("/push-notifications/mode", { enabled: false });
  await cleanupPushListeners();
  return { ready: true };
};

export const isNativeApp = () => Capacitor.isNativePlatform();
