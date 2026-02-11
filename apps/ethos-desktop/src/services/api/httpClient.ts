export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "TRACE";

export type ApiErrorPayload = {
  request_id?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly isOffline?: boolean;

  constructor(
    message: string,
    options: { status?: number; code?: string; requestId?: string; isOffline?: boolean } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.isOffline = options.isOffline;
  }
}

type HttpRequestOptions = Omit<RequestInit, "method" | "body"> & {
  method?: HttpMethod;
  body?: unknown;
  timeoutMs?: number;
};

type SessionContext = {
  revalidateSession: (reason: "unauthorized" | "forbidden") => void | Promise<void>;
};

type OfflineSettings = {
  enabled: boolean;
  cacheNamespace: string;
};

type CreateHttpClientOptions<TContract extends Record<string, readonly string[]>> = {
  baseUrl: string | (() => string);
  name: string;
  contract: TContract;
  getAuthToken?: () => string | null;
  getRequestId?: () => string;
  onSessionInvalid?: SessionContext["revalidateSession"];
  offline?: OfflineSettings;
};

const DEFAULT_TIMEOUT_MS = 12_000;

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");
const joinUrl = (baseUrl: string, path: string) => `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;

const defaultRequestId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

const isApiErrorPayload = (payload: unknown): payload is ApiErrorPayload =>
  typeof payload === "object" && payload !== null && ("request_id" in payload || "error" in payload);

const makeCacheKey = (namespace: string, method: HttpMethod, path: string) => `${namespace}:${method}:${path}`;

const readCachedResponse = <T>(namespace: string, method: HttpMethod, path: string): T | null => {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(makeCacheKey(namespace, method, path));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeCachedResponse = <T>(namespace: string, method: HttpMethod, path: string, value: T): void => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(makeCacheKey(namespace, method, path), JSON.stringify(value));
  } catch {
    // best effort cache
  }
};

async function readJson(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function assertPathAndMethod(
  clientName: string,
  contract: Record<string, readonly string[]>,
  path: string,
  method: HttpMethod,
): void {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const methods = contract[normalizedPath];

  if (!methods) {
    throw new ApiError(`[${clientName}] Endpoint fora do contrato: ${normalizedPath}`);
  }

  if (!methods.includes(method.toLowerCase())) {
    throw new ApiError(`[${clientName}] Método ${method} fora do contrato para ${normalizedPath}`);
  }
}

function createTimeoutController(timeoutMs: number, outerSignal?: AbortSignal | null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const onOuterAbort = () => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener("abort", onOuterAbort, { once: true });
  }

  const cleanup = () => {
    clearTimeout(timeout);
    outerSignal?.removeEventListener("abort", onOuterAbort);
  };

  return { signal: controller.signal, cleanup };
}

export function createHttpClient<TContract extends Record<string, readonly string[]>>(
  options: CreateHttpClientOptions<TContract>,
) {
  const {
    baseUrl,
    contract,
    name,
    getAuthToken,
    getRequestId = defaultRequestId,
    onSessionInvalid,
    offline,
  } = options;

  const request = async <TResponse>(path: keyof TContract | string, requestOptions: HttpRequestOptions = {}): Promise<TResponse> => {
    const normalizedPath = String(path).startsWith("/") ? String(path) : `/${String(path)}`;
    const method = (requestOptions.method ?? "GET").toUpperCase() as HttpMethod;
    assertPathAndMethod(name, contract, normalizedPath, method);

    const offlineEnabled = Boolean(offline?.enabled);
    if (offlineEnabled && method === "GET" && typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = readCachedResponse<TResponse>(offline!.cacheNamespace, method, normalizedPath);
      if (cached) return cached;
      throw new ApiError("Sem conexão com a API clínica e sem cache local.", { isOffline: true });
    }

    const headers = new Headers(requestOptions.headers ?? {});
    headers.set("x-request-id", getRequestId());

    const authToken = getAuthToken?.();
    if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

    const body = requestOptions.body;
    if (body !== undefined && !(body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const timeoutMs = requestOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const { signal, cleanup } = createTimeoutController(timeoutMs, requestOptions.signal);

    try {
      const resolvedBaseUrl = typeof baseUrl === "function" ? baseUrl() : baseUrl;
      const response = await fetch(joinUrl(resolvedBaseUrl, normalizedPath), {
        ...requestOptions,
        method,
        headers,
        signal,
        body: body === undefined || body instanceof FormData || typeof body === "string" ? (body as BodyInit | undefined) : JSON.stringify(body),
      });

      const payload = await readJson(response);
      const apiPayload = isApiErrorPayload(payload) ? payload : undefined;

      if (!response.ok) {
        if ((response.status === 401 || response.status === 403) && onSessionInvalid) {
          await onSessionInvalid(response.status === 401 ? "unauthorized" : "forbidden");
        }

        const message = apiPayload?.error?.message ?? `[${name}] HTTP ${response.status} em ${normalizedPath}`;
        throw new ApiError(message, {
          status: response.status,
          code: apiPayload?.error?.code,
          requestId: apiPayload?.request_id,
        });
      }

      const data = (payload as { data?: TResponse } | null)?.data ?? (payload as TResponse);

      if (offlineEnabled && method === "GET") {
        writeCachedResponse(offline!.cacheNamespace, method, normalizedPath, data);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      if (offlineEnabled && method === "GET") {
        const cached = readCachedResponse<TResponse>(offline!.cacheNamespace, method, normalizedPath);
        if (cached) return cached;
      }

      if (isAbortError(error)) {
        throw new ApiError(`[${name}] Timeout/cancelamento da requisição.`);
      }

      throw new ApiError(error instanceof Error ? error.message : String(error));
    } finally {
      cleanup();
    }
  };

  return { request };
}
