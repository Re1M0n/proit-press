import axios from "axios";
import { Capacitor } from "@capacitor/core";
import { getBackendUrl } from "./serverConfig";

const api = axios.create({
  baseURL: getBackendUrl(),
  withCredentials: true
});

export const setApiBaseUrl = (url) => {
  api.defaults.baseURL = url;
};

let isRefreshing = false;
let failedQueue = [];
let lastRefreshTime = 0;
const REFRESH_THRESHOLD = 25 * 60 * 1000; 

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const handleLogout = () => {
  api.delete("/auth/logout").catch(() => {});
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

const isAuthEndpoint = url =>
  url?.includes("/auth/login") ||
  url?.includes("/auth/refresh_token") ||
  url?.includes("/auth/logout");

const getStoredAccessToken = () => {
  const storedToken = localStorage.getItem("token");
  if (!storedToken) return null;
  try {
    return JSON.parse(storedToken);
  } catch (_error) {
    return storedToken;
  }
};

const refreshToken = async () => {
  try {
    const { data: { token, user }, headers } = await api.post("/auth/refresh_token");
    const nextRefreshToken = headers["x-refresh-token"];
    if (nextRefreshToken) localStorage.setItem("refreshToken", nextRefreshToken);

    localStorage.setItem("token", JSON.stringify(token));
    api.defaults.headers.Authorization = `Bearer ${token}`;
    lastRefreshTime = Date.now();
    return { token, user };
  } catch (err) {
    if (err?.response?.data?.error === "ERR_USER_INACTIVE") {
      throw err;
    }
    handleLogout();
    throw err;
  }
};

let userInactive = false;

const setUserInactiveFlag = (value) => {
  userInactive = value;
};

api.interceptors.request.use(
  async config => {
    if (Capacitor.isNativePlatform()) config.headers["X-Client-App"] = "proit-press-android";
    if (userInactive && !config.url.includes("/auth/logout")) {
      return Promise.reject(new Error("User is inactive"));
    }

    if (config.url?.includes("/auth/refresh_token")) {
      const nativeRefreshToken = localStorage.getItem("refreshToken");
      if (Capacitor.isNativePlatform() && nativeRefreshToken) {
        config.headers["X-Refresh-Token"] = nativeRefreshToken;
      }
      return config;
    }

    if (isAuthEndpoint(config.url)) return config;

    const token = getStoredAccessToken();
    if (token) {
      const now = Date.now();
      if (now - lastRefreshTime > REFRESH_THRESHOLD) {
        try {
          const { token: newToken } = await refreshToken();
          config.headers.Authorization = `Bearer ${newToken}`;
        } catch (err) {
          if (err?.response?.data?.error === "ERR_USER_INACTIVE") {
            setUserInactiveFlag(true);
          }
          console.error("Error refreshing token:", err);
          return Promise.reject(err);
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error?.response?.data?.error === "ERR_SESSION_EXPIRED" || error?.response?.data?.error === "ERR_USER_INACTIVE") {
      if (error?.response?.data?.error === "ERR_USER_INACTIVE") {
        return Promise.reject(error);
      }

      // Si el propio request de /auth/login devuelve ERR_SESSION_EXPIRED (p.
      // ej. una sesión vieja que el backend cerró en el primer intento), no hay
      // que recargar la página ni limpiar credenciales: la pantalla de login
      // muestra el error y el usuario puede reintentar sin recarga.
      const isLoginRequest = originalRequest?.url?.includes("/auth/login");

      if (!isLoginRequest) {
        handleLogout();
      }

      return Promise.reject(error);
    }

    if (error?.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint(originalRequest?.url)) {
      if (!getStoredAccessToken() && !localStorage.getItem("refreshToken")) {
        return Promise.reject(error);
      }
      if (isRefreshing) {
        try {
          const token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { token } = await refreshToken();
        processQueue(null, token);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const markUserAsInactive = () => {
  setUserInactiveFlag(true);
};

export default api;