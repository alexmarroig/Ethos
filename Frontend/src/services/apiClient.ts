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

export interface RetryNotice {
  path: string;
  method: string;
  reason: "NETWORK_ERROR" | "TIMEOUT";
  attempt: number;
  nextRetryInMs: number;
}

export interface ApiRequestMetric {
  path: string;
  method: string;
  durationMs: number;
  status?: number;
  ok: boolean;
  errorCode?: string;
  attempt: number;
}

interface EndpointMetricAggregate {
  path: string;
  method: string;
  count: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  lastStatus?: number;
  lastErrorCode?: string;
}

function getAuthToken(): string | null {
  return readStoredAuthUser()?.token ?? null;
}

let onUnauthorized: (() => void) | null = null;
let onRetrying: ((notice: RetryNotice) => void) | null = null;
let onRequestMetric: ((metric: ApiRequestMetric) => void) | null = null;
const endpointMetrics = new Map<string, EndpointMetricAggregate>();

export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

export function setOnRetrying(fn: ((notice: RetryNotice) => void) | null) {
  onRetrying = fn;
}

export function setOnRequestMetric(fn: ((metric: ApiRequestMetric) => void) | null) {
  onRequestMetric = fn;
}

export function getApiEndpointMetrics(): EndpointMetricAggregate[] {
  return Array.from(endpointMetrics.values());
}

const INITIAL_READ_TIMEOUT = 20_000;

let readinessPromise: Promise<void> | null = null;
let readinessMountedAt = Date.now();

export function resetReadiness(): void {
  readinessPromise = null;
  readinessMountedAt = Date.now();
}

export function primeReadiness(baseUrl: string = CLINICAL_BASE_URL, timeoutMs = 60_000): Promise<void> {
  if (readinessPromise) return readinessPromise;
  readinessMountedAt = Date.now();
  readinessPromise = (async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      await fetch(`${baseUrl}/health`, { signal: ctrl.signal });
    } catch {
      /* libera gate mesmo se falhar — evita bloqueio eterno */
    } finally {
      clearTimeout(t);
    }
  })();
  return readinessPromise;
}

export function isColdStartWindow(): boolean {
  return Date.now() - readinessMountedAt < 60_000;
}

function resolveTimeout(path: string, method: string, explicit?: number): number {
  if (explicit !== undefined) return explicit;
  if (LONG_TIMEOUT_PATTERNS.some((pattern) => path.includes(pattern))) return LONG_TIMEOUT;
  if (method === "GET") return INITIAL_READ_TIMEOUT;
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

  const url = `${baseUrl}${path}`;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const timeout = resolveTimeout(path, method, explicitTimeout);
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

  const doFetch = async (attempt: number): Promise<ApiResult<T>> => {
    const start = performance.now();
    const controller = new AbortController();
    if (fetchOptions.signal) {
      if (fetchOptions.signal.aborted) {
        controller.abort();
      } else {
        fetchOptions.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }
    }

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

        const unauthorized: ApiResult<T> = {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Sessão expirada. Faça login novamente." },
          request_id: "local",
          status: 401,
        };
        recordMetric(path, method, {
          durationMs: performance.now() - start,
          status: 401,
          ok: false,
          errorCode: unauthorized.error.code,
          attempt,
        });
        return unauthorized;
      }

      let responseBody: any;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = {};
      }

      if (!response.ok || responseBody.error) {
        const failure: ApiResult<T> = {
          success: false,
          error:
            responseBody.error || {
              code: `HTTP_${response.status}`,
              message: getHumanError(response.status, responseBody),
            },
          request_id: responseBody.request_id || "unknown",
          status: response.status,
        };
        recordMetric(path, method, {
          durationMs: performance.now() - start,
          status: response.status,
          ok: false,
          errorCode: failure.error.code,
          attempt,
        });
        return failure;
      }

      const success: ApiResult<T> = {
        success: true,
        data: responseBody.data ?? responseBody,
        request_id: responseBody.request_id || "unknown",
        status: response.status,
      };
      recordMetric(path, method, {
        durationMs: performance.now() - start,
        status: response.status,
        ok: true,
        attempt,
      });
      return success;
    } catch (error: unknown) {
      clearTimeout(timer);
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      const requestWasCancelled = Boolean(fetchOptions.signal?.aborted);
      const code = requestWasCancelled ? "CANCELLED" : isAbort ? "TIMEOUT" : "NETWORK_ERROR";

      recordMetric(path, method, {
        durationMs: performance.now() - start,
        ok: false,
        errorCode: code,
        attempt,
      });

      return {
        success: false,
        error: {
          code,
          message: requestWasCancelled
            ? "Requisição cancelada."
            : isAbort
              ? "Tempo limite excedido. Tente novamente."
              : "Integração indisponível. Verifique sua conexão.",
        },
        request_id: "local",
      };
    }
  };

  if (readinessPromise && baseUrl === CLINICAL_BASE_URL && !path.startsWith("/health")) {
    try { await readinessPromise; } catch { /* gate libera mesmo em falha */ }
  }

  let result = await doFetch(1);
  let attempt = 1;
  const maxAttempts = isColdStartWindow() ? 3 : 2;

  while (
    !result.success &&
    shouldRetry &&
    attempt < maxAttempts &&
    (result.error.code === "NETWORK_ERROR" || result.error.code === "TIMEOUT")
  ) {
    const nextAttempt = attempt + 1;
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
    onRetrying?.({
      path,
      method,
      reason: result.error.code,
      attempt: nextAttempt,
      nextRetryInMs: delay,
    });
    if (IS_DEV) console.warn(`[apiClient] Retrying ${method} ${path} (attempt ${nextAttempt})...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    result = await doFetch(nextAttempt);
    attempt = nextAttempt;
  }

  return result;
}

function recordMetric(path: string, method: string, metric: Omit<ApiRequestMetric, "path" | "method">) {
  const normalized: ApiRequestMetric = { path, method, ...metric };
  onRequestMetric?.(normalized);

  const key = `${method} ${path}`;
  const previous = endpointMetrics.get(key);

  if (!previous) {
    endpointMetrics.set(key, {
      path,
      method,
      count: 1,
      successCount: normalized.ok ? 1 : 0,
      failureCount: normalized.ok ? 0 : 1,
      avgDurationMs: normalized.durationMs,
      lastStatus: normalized.status,
      lastErrorCode: normalized.errorCode,
    });
    return;
  }

  const count = previous.count + 1;
  endpointMetrics.set(key, {
    path,
    method,
    count,
    successCount: previous.successCount + (normalized.ok ? 1 : 0),
    failureCount: previous.failureCount + (normalized.ok ? 0 : 1),
    avgDurationMs: (previous.avgDurationMs * previous.count + normalized.durationMs) / count,
    lastStatus: normalized.status ?? previous.lastStatus,
    lastErrorCode: normalized.errorCode ?? previous.lastErrorCode,
  });
}

function getHumanError(status: number, body: any): string {
  if (body?.error?.message) return body.error.message;

  switch (status) {
    case 400:
      return "Dados inválidos. Verifique os campos e tente novamente.";
    case 403:
      return "Sem permissão para esta ação.";
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

  put: <T = unknown>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "PUT", body: body as any }),

  delete: <T = unknown>(path: string, opts?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
};
