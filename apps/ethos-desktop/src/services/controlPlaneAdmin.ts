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

type RequestExtras = {
  signal?: AbortSignal;
  timeoutMs?: number; // default interno
};

// -----------------------------
// Helpers
// -----------------------------
function normalizeBaseUrl(baseUrl: string) {
  // remove trailing slashes
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

async function readJsonSafely<T>(response: Response): Promise<ControlPlaneResponse<T> | null> {
  // Alguns proxies retornam HTML/Texto em erro. Então: tenta JSON, senão null.
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    // tenta mesmo assim, mas com fallback
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
// Core request
// -----------------------------
const request = async <T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
  extras: RequestExtras = {}
): Promise<T> => {
  const url = joinUrl(baseUrl, path);

  // Timeout (default 12s) + abort chaining
  const timeoutMs = extras.timeoutMs ?? 12_000;
  const { signal, cleanup } = createTimeoutSignal(timeoutMs, extras.signal);

  try {
    // Headers: só seta content-type JSON se o body for JSON (string) e não FormData
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };

    const body = (options as any).body;

    // Evita forçar content-type quando for FormData (senão quebra boundary)
    if (!isFormDataBody(body)) {
      // Se já tiver content-type, respeita; senão, padrão JSON.
      if (!Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
        headers["content-type"] = "application/json";
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal,
    });

    const payload = await readJsonSafely<T>(response);

    if (!response.ok) {
      const requestId = payload?.request_id;
      const apiMessage = payload?.error?.message;
      const fallback = `Erro ao consultar control plane (HTTP ${response.status})`;
      const message = apiMessage ? apiMessage : fallback;
      const suffix = requestId ? ` [request_id=${requestId}]` : "";
      throw new Error(`${message}${suffix}`);
    }

    if (!payload) {
      // ok mas sem JSON decente
      throw new Error("Resposta inválida do control plane (JSON ausente ou inválido).");
    }

    return payload.data;
  } catch (err) {
    // AbortError: normal (timeout/cancel)
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Requisição cancelada/expirada (timeout).");
    }
    throw new Error(safeText(err));
  } finally {
    cleanup();
  }
};

// -----------------------------
// Public API (compatível)
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

export const fetchAdminOverview = async (baseUrl: string, token: string, extras?: RequestExtras) => {
  return request<AdminOverviewMetrics>(
    baseUrl,
    "/v1/admin/metrics/overview",
    {
      headers: { authorization: `Bearer ${token}` },
    },
    extras
  );
};

export const fetchAdminUsers = async (baseUrl: string, token: string, extras?: RequestExtras) => {
  return request<AdminUser[]>(
    baseUrl,
    "/v1/admin/users",
    {
      headers: { authorization: `Bearer ${token}` },
    },
    extras
  );
};
