import { Capacitor } from "@capacitor/core";
import { loadSavedServerUrl } from "../services/serverConfig";
import { setApiBaseUrl } from "../services/api";
import { getBackendUrl } from "../config";
import { PushNotifications } from "@capacitor/push-notifications";

export const initializeNativeApp = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await loadSavedServerUrl();
    const serverUrl = getBackendUrl();
    if (serverUrl) setApiBaseUrl(serverUrl);
  } catch (error) {
    console.error("No se pudo cargar el servidor guardado de ProIT Press:", error);
  }

  try {
    await PushNotifications.createChannel({
      id: "proit-press-alerts",
      name: "Avisos de ProIT Press",
      description: "Avisos activados por vos cuando estás lejos de la PC",
      importance: 4,
      visibility: 1
    });
  } catch (error) {
    console.error("No se pudo preparar el canal de notificaciones de ProIT Press:", error);
  }
};
