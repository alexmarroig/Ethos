// ETHOS Control Plane Client
// Separate HTTP client for cloud endpoints — NEVER sends PHI

import { CONTROL_BASE_URL } from "@/config/runtime";
import type { ApiResult } from "./apiClient";

const DEFAULT_TIMEOUT = 15_000;
const STORAGE_KEY = "ethos_control_token";

export function getControlToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setControlToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearControlToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function controlRequest<T = unknown>(
  path: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<ApiResult<T>> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOpts } = options;
  const url = `${CONTROL_BASE_URL}/v1${path}`;

  const token = getControlToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOpts.headers as Record<string, string> || {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOpts,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);
    const body = await response.json();

    if (!response.ok || body.error) {
      return {
        success: false,
        error: body.error || { code: `HTTP_${response.status}`, message: response.statusText },
        request_id: body.request_id || "unknown",
      };
    }

    return {
      success: true,
      data: body.data ?? body,
      request_id: body.request_id || "unknown",
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    return {
      success: false,
      error: {
        code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
        message: isAbort
          ? "Tempo limite excedido. Tente novamente."
          : "Serviço cloud indisponível. Verifique sua conexão.",
      },
      request_id: "local",
    };
  }
}

// Convenience methods
export const controlApi = {
  get: <T = unknown>(path: string, opts?: RequestInit & { timeout?: number }) =>
    controlRequest<T>(path, { ...opts, method: "GET" }),

  post: <T = unknown>(path: string, body?: unknown, opts?: RequestInit & { timeout?: number }) =>
    controlRequest<T>(path, { ...opts, method: "POST", body: body ? JSON.stringify(body) : undefined }),

  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestInit & { timeout?: number }) =>
    controlRequest<T>(path, { ...opts, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),

  delete: <T = unknown>(path: string, opts?: RequestInit & { timeout?: number }) =>
    controlRequest<T>(path, { ...opts, method: "DELETE" }),
};
