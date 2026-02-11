// apps/ethos-desktop/src/services/controlPlaneAdmin.ts

export type AdminOverviewMetrics = {
  users_total: number;
  telemetry_total: number;
};

export type AdminUser = {
  id: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "disabled";
};

type ControlPlaneError = { code: string; message: string };

type ControlPlaneResponse<T> = {
  request_id: string;
  data: T;
  error?: ControlPlaneError;
};

export type RequestExtras = {
  signal?: AbortSignal;
  timeoutMs?: number; // default interno
  cacheTtlMs?: number; // NEW: cache curto (default por endpoint)
};

// -----------------------------
// Helpers
// -----------------------------
function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function joinUrl(baseUrl: string, path: string) {
  const b = normalizeBaseUrl(baseUrl);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function isFormDataBody(body: any): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function safeText(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function isAbortError(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError";
}

async function readJsonSafely<T>(response: Response): Promise<ControlPlaneResponse<T> | null> {
  const contentType = response.headers.get("content-type") ?? "";
  const looksJson = contentType.toLowerCase().includes("application/json");

  // Alguns proxies retornam HTML/Texto em erro; tentamos JSON mesmo assim
  if (!looksJson) {
    try {
      return (await response.json()) as ControlPlaneResponse<T>;
    } catch {
      return null;
    }
  }

  try {
    return (await response.json()) as ControlPlaneResponse<T>;
  } catch {
    return null;
  }
}

function createTimeoutSignal(timeoutMs: number, outerSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener("abort", onAbort, { once: true });
  }

  const cleanup = () => {
    clearTimeout(timeoutId);
    outerSignal?.removeEventListener("abort", onAbort);
  };

  return { signal: controller.signal, cleanup };
}

// -----------------------------
// Error type (optional enrichment)
// -----------------------------
class ControlPlaneRequestError extends Error {
  status?: number;
  code?: string;
  requestId?: string;

  constructor(message: string, opts?: { status?: number; code?: string; requestId?: string }) {
    super(message);
    this.name = "ControlPlaneRequestError";
    this.status = opts?.status;
    this.code = opts?.code;
    this.requestId = opts?.requestId;
  }
}

// -----------------------------
// Very small in-memory cache + in-flight dedupe
// (performance + avoids double calls)
// -----------------------------
type CacheEntry = { expiresAt: number; value: unknown };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

function makeKey(method: string, url: string, body?: any, auth?: string) {
  // body pode ser grande; aqui só usamos string body quando for JSON.
  const b = typeof body === "string" ? body : "";
  const a = auth ?? "";
  return `${method.toUpperCase()} ${url} :: ${a} :: ${b}`;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// -----------------------------
// Core request
// -----------------------------
const request = async <T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
  extras: RequestExtras = {}
): Promise<T> => {
  const url = joinUrl(baseUrl, path);

  const timeoutMs = extras.timeoutMs ?? 12_000;
  const { signal, cleanup } = createTimeoutSignal(timeoutMs, extras.signal);

  // Headers
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries((options.headers as Record<string, string> | undefined) ?? {})) {
    if (typeof v === "string") headers[k] = v;
  }

  const body = (options as any).body;

  // Evita forçar content-type quando for FormData
  if (!isFormDataBody(body)) {
    const hasContentType = Object.keys(headers).some((k) => k.toLowerCase() === "content-type");
    if (!hasContentType) headers["content-type"] = "application/json";
  }

  const method = (options.method ?? "GET").toUpperCase();

  // Cache + inflight only for GET requests (safe)
  const auth = headers["authorization"] ?? headers["Authorization"];
  const cacheTtlMs = extras.cacheTtlMs ?? 0;
  const cacheKey = makeKey(method, url, body, auth);

  if (method === "GET" && cacheTtlMs > 0) {
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;

    const pending = inflight.get(cacheKey) as Promise<T> | undefined;
    if (pending) return pending;
  }

  const doFetch = (async () => {
    try {
      const response = await fetch(url, {
        ...options,
        method,
        headers,
        signal,
      });

      const payload = await readJsonSafely<T>(response);

      if (!response.ok) {
        const requestId = payload?.request_id;
        const apiMessage = payload?.error?.message;
        const apiCode = payload?.error?.code;

        const fallback = `Erro ao consultar control plane (HTTP ${response.status})`;
        const message = apiMessage ? apiMessage : fallback;
        const suffix = requestId ? ` [request_id=${requestId}]` : "";

        throw new ControlPlaneRequestError(`${message}${suffix}`, {
          status: response.status,
          code: apiCode,
          requestId,
        });
      }

      if (!payload) {
        throw new ControlPlaneRequestError("Resposta inválida do control plane (JSON ausente ou inválido).", {
          status: response.status,
        });
      }

      return payload.data;
    } catch (err) {
      if (isAbortError(err)) {
        throw new ControlPlaneRequestError("Requisição cancelada/expirada (timeout).");
      }
      // Preserva mensagens já enriquecidas
      if (err instanceof ControlPlaneRequestError) throw err;
      throw new ControlPlaneRequestError(safeText(err));
    } finally {
      cleanup();
    }
  })();

  // Store inflight + cache
  if (method === "GET" && cacheTtlMs > 0) {
    inflight.set(cacheKey, doFetch as Promise<unknown>);
    try {
      const result = await doFetch;
      setCached(cacheKey, result, cacheTtlMs);
      return result;
    } finally {
      inflight.delete(cacheKey);
    }
  }

  return doFetch;
};

// -----------------------------
// Public API
// -----------------------------
export const loginControlPlane = async (
  baseUrl: string,
  email: string,
  password: string,
  extras?: RequestExtras
) => {
  return request<{ user: { id: string; email: string; role: "admin" | "user" }; token: string }>(
    baseUrl,
    "/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    extras
  );
};

// NEW default caching: small TTL to avoid spamming when user toggles UI quickly
export const fetchAdminOverview = async (baseUrl: string, token: string, extras?: RequestExtras) => {
  return request<AdminOverviewMetrics>(
    baseUrl,
    "/v1/admin/metrics/overview",
    {
      headers: { authorization: `Bearer ${token}` },
    },
    { cacheTtlMs: 2500, ...(extras ?? {}) }
  );
};

export const fetchAdminUsers = async (baseUrl: string, token: string, extras?: RequestExtras) => {
  return request<AdminUser[]>(
    baseUrl,
    "/v1/admin/users",
    {
      headers: { authorization: `Bearer ${token}` },
    },
    { cacheTtlMs: 2500, ...(extras ?? {}) }
  );
};
