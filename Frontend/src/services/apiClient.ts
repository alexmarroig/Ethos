// ETHOS API Client
// Wrapper around fetch with timeout, auth, retry for GET, multipart support, and error handling

import {
  CLINICAL_BASE_URL,
  DEFAULT_TIMEOUT,
  LONG_TIMEOUT,
  LONG_TIMEOUT_PATTERNS,
  IS_DEV,
} from "@/config/runtime";
import { getDemoApiResponse } from "@/services/demoMode";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  request_id: string;
  error?: undefined;
  status?: number;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
  request_id: string;
  data?: undefined;
  status?: number;
}

export type ApiResult<T = unknown> = ApiSuccess<T> | ApiError;

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  timeout?: number;
  baseUrl?: string;
  retry?: boolean;          // only for idempotent GETs, default true for GET
  body?: BodyInit | object | null;
}

/* ------------------------------------------------------------------ */
/*  Auth helpers                                                       */
/* ------------------------------------------------------------------ */

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("ethos_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.token || null;
    }
  } catch {
    // ignore
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Logout callback (set by AuthContext to avoid circular import)       */
/* ------------------------------------------------------------------ */

let _onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(fn: () => void) {
  _onUnauthorized = fn;
}

/* ------------------------------------------------------------------ */
/*  Timeout resolver                                                   */
/* ------------------------------------------------------------------ */

function resolveTimeout(path: string, explicit?: number): number {
  if (explicit !== undefined) return explicit;
  if (LONG_TIMEOUT_PATTERNS.some((p) => path.includes(p))) return LONG_TIMEOUT;
  return DEFAULT_TIMEOUT;
}

/* ------------------------------------------------------------------ */
/*  Core request function                                              */
/* ------------------------------------------------------------------ */

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResult<T>> {
  const {
    timeout: explicitTimeout,
    baseUrl = CLINICAL_BASE_URL,
    retry,
    body,
    ...fetchOpts
  } = options;

  const timeout = resolveTimeout(path, explicitTimeout);
  const url = `${baseUrl}${path}`;
  const method = (fetchOpts.method || "GET").toUpperCase();
  const shouldRetry = retry ?? (method === "GET");

  // In demo session (dev token), use local deterministic responses for key GET routes.
  const demoResult = getDemoApiResponse<T>(path, method);
  if (demoResult) {
    return demoResult as ApiResult<T>;
  }

  // Build headers — skip Content-Type for FormData (browser sets boundary)
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((fetchOpts.headers as Record<string, string>) || {}),
  };

  // Serialize body
  let serializedBody: BodyInit | null | undefined;
  if (body === null || body === undefined) {
    serializedBody = undefined;
  } else if (isFormData || typeof body === "string" || body instanceof Blob || body instanceof ArrayBuffer) {
    serializedBody = body as BodyInit;
  } else {
    serializedBody = JSON.stringify(body);
  }

  const doFetch = async (): Promise<ApiResult<T>> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOpts,
        method,
        headers,
        body: serializedBody,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Handle 401 globally — skip for logout and dev tokens to avoid infinite loop
      if (response.status === 401) {
        const currentToken = getAuthToken();
        const isDevToken = currentToken?.startsWith("dev-") ?? false;
        if (!path.includes("/auth/logout") && !isDevToken) {
          _onUnauthorized?.();
        }
        return {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Sessão expirada. Faça login novamente." },
          request_id: "local",
          status: 401,
        };
      }

      let responseBody: any;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = {};
      }

      if (!response.ok || responseBody.error) {
        const errorMsg = getHumanError(response.status, responseBody);
        return {
          success: false,
          error: responseBody.error || { code: `HTTP_${response.status}`, message: errorMsg },
          request_id: responseBody.request_id || "unknown",
          status: response.status,
        };
      }

      return {
        success: true,
        data: responseBody.data ?? responseBody,
        request_id: responseBody.request_id || "unknown",
        status: response.status,
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
            : "Integração indisponível. Verifique sua conexão.",
        },
        request_id: "local",
      };
    }
  };

  // Execute with optional retry (GET only, max 1 retry with 1s backoff)
  const result = await doFetch();
  if (!result.success && shouldRetry && (result.error.code === "NETWORK_ERROR" || result.error.code === "TIMEOUT")) {
    if (IS_DEV) console.warn(`[apiClient] Retrying ${method} ${path}...`);
    await new Promise((r) => setTimeout(r, 1000));
    return doFetch();
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Human-friendly error messages                                      */
/* ------------------------------------------------------------------ */

function getHumanError(status: number, body: any): string {
  if (body?.error?.message) return body.error.message;
  switch (status) {
    case 400: return "Dados inválidos. Verifique os campos e tente novamente.";
    case 403: return "Sem permissão para esta ação.";
    case 404: return "Recurso não encontrado.";
    case 409: return "Conflito. Tente novamente.";
    case 500: return "Erro interno. Tente novamente em alguns instantes.";
    default: return `Erro inesperado (${status}).`;
  }
}

/* ------------------------------------------------------------------ */
/*  Convenience methods                                                */
/* ------------------------------------------------------------------ */

export const api = {
  get: <T = unknown>(path: string, opts?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "GET" }),

  post: <T = unknown>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "POST", body: body as any }),

  patch: <T = unknown>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "PATCH", body: body as any }),

  delete: <T = unknown>(path: string, opts?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
};
