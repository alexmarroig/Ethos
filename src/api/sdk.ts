export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type ApiErrorPayload = {
  request_id?: string;
  error?: { code?: string; message?: string };
};

export class EthosApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "EthosApiError";
  }
}

export type AuthProvider = {
  getToken: () => string | null;
  clearToken?: () => void;
};

export type SdkConfig = {
  baseUrl: string;
  auth: AuthProvider;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
};

const normalizeApiError = (status: number, payload: ApiErrorPayload) => {
  const code = payload.error?.code ?? `HTTP_${status}`;
  const message = payload.error?.message ?? "Unexpected API error";
  return new EthosApiError(message, status, code, payload.request_id);
};

export class EthosSdk {
  constructor(private readonly config: SdkConfig) {}

  async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const token = this.config.auth.getToken();
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload;
      if (res.status === 401) {
        this.config.auth.clearToken?.();
        this.config.onUnauthorized?.();
      }
      if (res.status === 403) this.config.onForbidden?.();
      if ([401, 403, 422, 500].includes(res.status)) throw normalizeApiError(res.status, payload);
      throw normalizeApiError(res.status, payload);
    }

    const payload = (await res.json()) as { data: T };
    return payload.data;
  }

  patients = {
    list: () => this.request<any[]>("GET", "/patients"),
    getById: (id: string) => this.request<any>("GET", `/patients/${id}`),
  };

  sessions = {
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return this.request<any>("GET", `/sessions${qs}`);
    },
    transcribe: (sessionId: string, rawText = "") => this.request<{ jobId: string }>("POST", `/sessions/${sessionId}/transcribe`, { raw_text: rawText }),
  };

  financial = {
    listEntries: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return this.request<any>("GET", `/financial/entries${qs}`);
    },
  };
}
