import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { emitSessionExpired } from "./auth-events";
import { readCookie } from "./cookies";
import { env } from "./env";

const WRITE_METHODS = new Set(["post", "put", "patch", "delete"]);

const NO_REFRESH_ENDPOINTS = ["/auth/login/", "/auth/refresh/"];

const BOOTSTRAP_ENDPOINT = "/auth/me/";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const http = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = config.method?.toLowerCase();
  if (method && WRITE_METHODS.has(method)) {
    const csrfToken = readCookie("csrftoken");
    if (csrfToken) {
      config.headers.set("X-CSRFToken", csrfToken);
    }
  }
  return config;
});

let refreshPromise: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  refreshPromise ??= http
    .post("/auth/refresh/")
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { config, response } = error;
    if (!config || response?.status !== 401) {
      return Promise.reject(error);
    }

    if (NO_REFRESH_ENDPOINTS.some((endpoint) => config.url?.includes(endpoint))) {
      return Promise.reject(error);
    }
    const isBootstrap = config.url?.includes(BOOTSTRAP_ENDPOINT) ?? false;
    if (config._retry) {
      if (!isBootstrap) emitSessionExpired();
      return Promise.reject(error);
    }

    try {
      config._retry = true;
      await refreshSession();
      return http(config);
    } catch (refreshError) {
      if (!isBootstrap) emitSessionExpired();
      return Promise.reject(refreshError);
    }
  },
);
