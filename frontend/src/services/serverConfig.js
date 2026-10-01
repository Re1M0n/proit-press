import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const SERVER_URL_KEY = "proitPressServerUrl";

export const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    const configuredUrl = window.localStorage.getItem(SERVER_URL_KEY);
    if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  }

  if (Capacitor.isNativePlatform()) return "";
  return process.env.REACT_APP_BACKEND_URL || "";
};

export const normalizeBackendUrl = (input) => {
  const value = String(input || "").trim();
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  let parsed;

  try {
    parsed = new URL(candidate);
  } catch (_error) {
    throw new Error("Ingresá una dirección de servidor válida.");
  }

  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error("Usá una dirección HTTPS, por ejemplo soporte.ejemplo.com o https://soporte.ejemplo.com.");
  }

  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("La URL del servidor no puede incluir credenciales ni parámetros.");
  }

  if (parsed.protocol === "http:" && !["localhost", "127.0.0.1", "10.0.2.2"].includes(parsed.hostname)) {
    console.warn("El servidor usa HTTP sin cifrado; para acceder desde otra red, configurá HTTPS.");
  }

  return parsed.toString().replace(/\/$/, "");
};

export const getBackendConnectionErrorMessage = (error, attemptedUrl) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.error;

  if (status === 401 || status === 403) {
    return `El servidor respondió en ${attemptedUrl}, pero rechazó la prueba de conexión (HTTP ${status}).`;
  }
  if (status === 404) {
    return `Se llegó a ${attemptedUrl}, pero la ruta de verificación no existe (HTTP 404). Revisá que sea la dirección del backend.`;
  }
  if (status >= 500) {
    return `El servidor ${attemptedUrl} respondió con un error interno (HTTP ${status}). Probá nuevamente más tarde o contactá al administrador.`;
  }
  if (serverMessage && typeof serverMessage === "string") return serverMessage;

  const networkError = error?.code === "ERR_NETWORK" || error?.message === "Network Error" ||
    ["ECONNABORTED", "ETIMEDOUT", "ERR_CONNECTION_REFUSED", "ERR_SSL_PROTOCOL_ERROR"].includes(error?.code);
  if (networkError) {
    const protocolHint = attemptedUrl?.startsWith("https://")
      ? "Se intentó usar HTTPS. Confirmá que el servidor tenga HTTPS habilitado y que el dominio y puerto sean correctos."
      : "Confirmá que el dominio y puerto sean correctos y que el servidor esté accesible.";
    return `No se pudo conectar con ${attemptedUrl || "el servidor"}. ${protocolHint} Revisá también internet, firewall y CORS. Si el servidor solo admite HTTP, ingresá la dirección empezando por http://.`;
  }

  return error?.message || "No se pudo conectar al servidor. Revisá la dirección y volvé a intentar.";
};

export const saveBackendUrl = async (input) => {
  const normalizedUrl = normalizeBackendUrl(input);
  window.localStorage.setItem(SERVER_URL_KEY, normalizedUrl);
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: SERVER_URL_KEY, value: normalizedUrl });
  }

  return normalizedUrl;
};

export const loadSavedServerUrl = async () => {
  if (!Capacitor.isNativePlatform()) return;
  const { value } = await Preferences.get({ key: SERVER_URL_KEY });
  if (value) window.localStorage.setItem(SERVER_URL_KEY, value);
};
