export type Fetcher = typeof fetch;

export class EthosControlPlaneClient {
  constructor(private readonly baseUrl: string, private readonly fetcher: Fetcher = fetch, private token?: string) {}
  setToken(token: string) { this.token = token; }
  private async req(path: string, method = "GET", body?: unknown) {
    const res = await this.fetcher(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<any>;
  }
  login(email: string, password: string) { return this.req("/v1/auth/login", "POST", { email, password }); }
  me() { return this.req("/v1/me"); }
  entitlements() { return this.req("/v1/entitlements"); }
  billingSubscription() { return this.req("/v1/billing/subscription"); }
  billingCheckout(plan: "solo" | "pro", interval: "month" | "year") { return this.req("/v1/billing/checkout-session", "POST", { plan, interval }); }
}

export class EthosClinicalPlaneClient {
  constructor(private readonly baseUrl: string, private readonly fetcher: Fetcher = fetch, private token?: string) {}
  setToken(token: string) { this.token = token; }
  private async req(path: string, method = "GET", body?: unknown) {
    const res = await this.fetcher(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<any>;
  }
  listSessions() { return this.req("/sessions"); }
  createSession(patient_id: string, scheduled_at: string) { return this.req("/sessions", "POST", { patient_id, scheduled_at }); }
  transcribe(sessionId: string, raw_text: string) { return this.req(`/sessions/${sessionId}/transcribe`, "POST", { raw_text }); }
  getJob(jobId: string) { return this.req(`/jobs/${jobId}`); }
  syncEntitlements(snapshot: unknown) { return this.req("/local/entitlements/sync", "POST", { snapshot }); }
}

export class EthosPatientClient {
  constructor(private readonly baseUrl: string, private readonly fetcher: Fetcher = fetch, private token?: string) {}
  setToken(token: string) { this.token = token; }
  private async req(path: string, method = "GET", body?: unknown) {
    const res = await this.fetcher(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<any>;
  }
  login(email: string, password: string) { return this.req("/auth/login", "POST", { email, password }); }
  permissions() { return this.req("/patient/permissions"); }
  listSessions() { return this.req("/patient/sessions"); }
  confirmSession(sessionId: string) { return this.req(`/patient/sessions/${sessionId}/confirm`, "POST"); }
  recordScale(scale_id: string, score: number) { return this.req("/patient/scales/record", "POST", { scale_id, score }); }
  diaryEntry(content: string) { return this.req("/patient/diary/entries", "POST", { content }); }
  sendMessage(message: string) { return this.req("/patient/messages", "POST", { message }); }
}
