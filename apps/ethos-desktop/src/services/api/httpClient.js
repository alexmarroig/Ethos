"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.createHttpClient = createHttpClient;
class ApiError extends Error {
    status;
    code;
    requestId;
    isOffline;
    constructor(message, options = {}) {
        super(message);
        this.name = "ApiError";
        this.status = options.status;
        this.code = options.code;
        this.requestId = options.requestId;
        this.isOffline = options.isOffline;
    }
}
exports.ApiError = ApiError;
const DEFAULT_TIMEOUT_MS = 12_000;
const normalizeBaseUrl = (baseUrl) => baseUrl.replace(/\/+$/, "");
const joinUrl = (baseUrl, path) => `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
const isLogoutPath = (path) => /\/auth\/logout\/?$/.test(path);
const defaultRequestId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const isAbortError = (error) => error instanceof DOMException && error.name === "AbortError";
const isApiErrorPayload = (payload) => typeof payload === "object" && payload !== null && ("request_id" in payload || "error" in payload);
const makeCacheKey = (namespace, method, path) => `${namespace}:${method}:${path}`;
const readCachedResponse = (namespace, method, path) => {
    if (typeof localStorage === "undefined")
        return null;
    try {
        const raw = localStorage.getItem(makeCacheKey(namespace, method, path));
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
};
const writeCachedResponse = (namespace, method, path, value) => {
    if (typeof localStorage === "undefined")
        return;
    try {
        localStorage.setItem(makeCacheKey(namespace, method, path), JSON.stringify(value));
    }
    catch {
        // best effort cache
    }
};
async function readJson(response) {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
        return null;
    }
    try {
        return await response.json();
    }
    catch {
        return null;
    }
}
function assertPathAndMethod(clientName, contract, path, method) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const methods = contract[normalizedPath];
    if (!methods) {
        throw new ApiError(`[${clientName}] Endpoint fora do contrato: ${normalizedPath}`);
    }
    if (!methods.includes(method.toLowerCase())) {
        throw new ApiError(`[${clientName}] Método ${method} fora do contrato para ${normalizedPath}`);
    }
}
function createTimeoutController(timeoutMs, outerSignal) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const onOuterAbort = () => controller.abort();
    if (outerSignal) {
        if (outerSignal.aborted)
            controller.abort();
        else
            outerSignal.addEventListener("abort", onOuterAbort, { once: true });
    }
    const cleanup = () => {
        clearTimeout(timeout);
        outerSignal?.removeEventListener("abort", onOuterAbort);
    };
    return { signal: controller.signal, cleanup };
}
function createHttpClient(options) {
    const { baseUrl, contract, name, getAuthToken, getRequestId = defaultRequestId, onSessionInvalid, offline, } = options;
    const request = async (path, requestOptions = {}) => {
        const normalizedPath = String(path).startsWith("/") ? String(path) : `/${String(path)}`;
        const method = (requestOptions.method ?? "GET").toUpperCase();
        assertPathAndMethod(name, contract, normalizedPath, method);
        const offlineEnabled = Boolean(offline?.enabled);
        if (offlineEnabled && method === "GET" && typeof navigator !== "undefined" && !navigator.onLine) {
            const cached = readCachedResponse(offline.cacheNamespace, method, normalizedPath);
            if (cached)
                return cached;
            throw new ApiError("Sem conexão com a API clínica e sem cache local.", { isOffline: true });
        }
        const headers = new Headers(requestOptions.headers ?? {});
        headers.set("x-request-id", getRequestId());
        const authToken = getAuthToken?.();
        if (authToken)
            headers.set("Authorization", `Bearer ${authToken}`);
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
                body: body === undefined || body instanceof FormData || typeof body === "string" ? body : JSON.stringify(body),
            });
            const payload = await readJson(response);
            const apiPayload = isApiErrorPayload(payload) ? payload : undefined;
            if (!response.ok) {
                if ((response.status === 401 || response.status === 403) && onSessionInvalid && !isLogoutPath(normalizedPath)) {
                    await onSessionInvalid(response.status === 401 ? "unauthorized" : "forbidden");
                }
                const message = apiPayload?.error?.message ?? `[${name}] HTTP ${response.status} em ${normalizedPath}`;
                throw new ApiError(message, {
                    status: response.status,
                    code: apiPayload?.error?.code,
                    requestId: apiPayload?.request_id,
                });
            }
            const data = payload?.data ?? payload;
            if (offlineEnabled && method === "GET") {
                writeCachedResponse(offline.cacheNamespace, method, normalizedPath, data);
            }
            return data;
        }
        catch (error) {
            if (error instanceof ApiError)
                throw error;
            if (offlineEnabled && method === "GET") {
                const cached = readCachedResponse(offline.cacheNamespace, method, normalizedPath);
                if (cached)
                    return cached;
            }
            if (isAbortError(error)) {
                throw new ApiError(`[${name}] Timeout/cancelamento da requisição.`);
            }
            throw new ApiError(error instanceof Error ? error.message : String(error));
        }
        finally {
            cleanup();
        }
    };
    return { request };
}
