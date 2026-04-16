import {
  CLINICAL_BASE_URL,
  DEFAULT_TIMEOUT,
  LONG_TIMEOUT,
  LONG_TIMEOUT_PATTERNS,
  IS_DEV,
} from "@/config/runtime";
import { readStoredAuthUser } from "@/services/authStorage";

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
  retry?: boolean;
  body?: BodyInit | object | null;
}

function getAuthToken(): string | null {
  return readStoredAuthUser()?.token ?? null;
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

function resolveTimeout(path: string, explicit?: number): number {
  if (explicit !== undefined) return explicit;
  if (LONG_TIMEOUT_PATTERNS.some((pattern) => path.includes(pattern))) return LONG_TIMEOUT;
  return DEFAULT_TIMEOUT;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResult<T>> {
  const {
    timeout: explicitTimeout,
    baseUrl = CLINICAL_BASE_URL,
    retry,
    body,
    ...fetchOptions
  } = options;

  const timeout = resolveTimeout(path, explicitTimeout);
  const url = `${baseUrl}${path}`;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const shouldRetry = retry ?? method === "GET";
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  let serializedBody: BodyInit | null | undefined;
  if (body === null || body === undefined) {
    serializedBody = undefined;
  } else if (
    isFormData ||
    typeof body === "string" ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    serializedBody = body as BodyInit;
  } else {
    serializedBody = JSON.stringify(body);
  }

  const doFetch = async (): Promise<ApiResult<T>> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        method,
        headers,
        body: serializedBody,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status === 401) {
        if (!path.includes("/auth/logout")) {
          onUnauthorized?.();
        }

        return {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Sess?o expirada. Fa?a login novamente." },
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
        return {
          success: false,
          error:
            responseBody.error || {
              code: `HTTP_${response.status}`,
              message: getHumanError(response.status, responseBody),
            },
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
    } catch (error: unknown) {
      clearTimeout(timer);
      const isAbort = error instanceof DOMException && error.name === "AbortError";

      return {
        success: false,
        error: {
          code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
          message: isAbort
            ? "Tempo limite excedido. Tente novamente."
            : "Integracao indisponivel. Verifique sua conexao.",
        },
        request_id: "local",
      };
    }
  };

  const result = await doFetch();
  if (
    !result.success &&
    shouldRetry &&
    (result.error.code === "NETWORK_ERROR" || result.error.code === "TIMEOUT")
  ) {
    if (IS_DEV) console.warn(`[apiClient] Retrying ${method} ${path}...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return doFetch();
  }

  return result;
}

function getHumanError(status: number, body: any): string {
  if (body?.error?.message) return body.error.message;

  switch (status) {
    case 400:
      return "Dados invalidos. Verifique os campos e tente novamente.";
    case 403:
      return "Sem permissao para esta acao.";
    case 404:
      return "Recurso não encontrado.";
    case 409:
      return "Conflito. Tente novamente.";
    case 500:
      return "Erro interno. Tente novamente em alguns instantes.";
    default:
      return `Erro inesperado (${status}).`;
  }
}

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

