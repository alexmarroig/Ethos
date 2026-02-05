import crypto from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

type Role = "admin" | "user";
type UserStatus = "invited" | "active" | "disabled";

type User = { id: string; email: string; name: string; password_hash?: string; role: Role; status: UserStatus; created_at: string; stripe_customer_id?: string };
type Invite = { id: string; email: string; token_hash: string; expires_at: string; created_at: string; used_at?: string };
type SessionToken = { token: string; user_id: string; expires_at: string; created_at: string };
type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "none";
type Subscription = { id: string; user_id: string; stripe_customer_id: string; stripe_subscription_id: string; plan: "solo" | "pro"; interval: "month" | "year"; status: SubscriptionStatus; trial_ends_at?: string; current_period_end?: string; updated_at: string };
type Entitlement = { id: string; user_id: string; features: Record<string, boolean>; limits: Record<string, number>; source_subscription_status: SubscriptionStatus; grace_until?: string; created_at: string };
type Telemetry = { id: string; user_id: string; event_type: string; ts: string; duration_ms?: number; error_code?: string; app_version?: string; worker_version?: string };
type Audit = { id: string; actor_user_id: string; event: string; target_user_id?: string; ts: string };

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const v = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${v}`;
};
const verifyPassword = (password: string, stored: string) => {
  const [salt, v] = stored.split(":");
  if (!salt || !v) return false;
  const c = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(c), Buffer.from(v));
};

const db = {
  users: new Map<string, User>(),
  invites: new Map<string, Invite>(),
  sessions: new Map<string, SessionToken>(),
  subscriptions: new Map<string, Subscription>(),
  invoices: new Map<string, { id: string; user_id: string; stripe_invoice_id: string; status: string; created_at: string }>(),
  entitlement_snapshots: new Map<string, Entitlement>(),
  telemetry_events: new Map<string, Telemetry>(),
  audit_events: new Map<string, Audit>(),
};

const adminId = uid();
db.users.set(adminId, { id: adminId, email: "camila@ethos.local", name: "Camila", role: "admin", status: "active", password_hash: hashPassword("admin123"), created_at: now() });

const envelope = <T>(res: ServerResponse, request_id: string, statusCode: number, data: T) => {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ request_id, data }));
};
const fail = (res: ServerResponse, request_id: string, statusCode: number, code: string, message: string) => {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ request_id, error: { code, message } }));
};

const readJson = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, unknown>;
};

const auth = (req: IncomingMessage, res: ServerResponse, request_id: string, role?: Role) => {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "";
  const session = db.sessions.get(token);
  if (!session || Date.parse(session.expires_at) < Date.now()) return fail(res, request_id, 401, "UNAUTHORIZED", "Invalid session"), null;
  const user = db.users.get(session.user_id);
  if (!user || user.status !== "active") return fail(res, request_id, 401, "UNAUTHORIZED", "Invalid user"), null;
  if (role && user.role !== role) return fail(res, request_id, 403, "FORBIDDEN", "Forbidden"), null;
  return { token, user };
};

const deriveEntitlements = (subscription?: Subscription): Omit<Entitlement, "id" | "user_id" | "created_at"> => {
  if (!subscription || subscription.status === "none" || subscription.status === "canceled") {
    return { features: { transcription: false, export: true, backup: true, mobile_sync: false }, limits: { sessions_per_month: 10 }, source_subscription_status: "none", grace_until: undefined };
  }
  const grace_until = subscription.status === "past_due" ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString() : undefined;
  if (subscription.plan === "pro") return { features: { transcription: true, export: true, backup: true, mobile_sync: true }, limits: { sessions_per_month: 10000 }, source_subscription_status: subscription.status, grace_until };
  return { features: { transcription: true, export: true, backup: true, mobile_sync: true }, limits: { sessions_per_month: 300 }, source_subscription_status: subscription.status, grace_until };
};

const upsertEntitlement = (user_id: string) => {
  const sub = Array.from(db.subscriptions.values()).find((s) => s.user_id === user_id);
  const ent: Entitlement = { id: uid(), user_id, created_at: now(), ...deriveEntitlements(sub) };
  db.entitlement_snapshots.set(user_id, ent);
  return ent;
};

export const createControlPlane = () => createServer(async (req, res) => {
  const request_id = uid();
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (method === "POST" && url.pathname === "/v1/auth/invite") {
      const session = auth(req, res, request_id, "admin"); if (!session) return;
      const body = await readJson(req);
      if (typeof body.email !== "string" || !body.email.includes("@")) return fail(res, request_id, 422, "VALIDATION_ERROR", "Invalid email");
      const token = crypto.randomBytes(24).toString("hex");
      const invite: Invite = { id: uid(), email: body.email, token_hash: hash(token), expires_at: new Date(Date.now() + 86400000).toISOString(), created_at: now() };
      db.invites.set(invite.id, invite);
      db.audit_events.set(uid(), { id: uid(), actor_user_id: session.user.id, event: "INVITE_CREATED", ts: now() });
      return envelope(res, request_id, 201, { invite_id: invite.id, invite_token: token, expires_at: invite.expires_at });
    }
    if (method === "POST" && url.pathname === "/v1/auth/accept-invite") {
      const body = await readJson(req);
      const invite = Array.from(db.invites.values()).find((i) => i.token_hash === hash(String(body.token ?? "")) && !i.used_at);
      if (!invite || Date.parse(invite.expires_at) < Date.now()) return fail(res, request_id, 400, "INVALID_INVITE", "Invite invalid");
      invite.used_at = now();
      const user: User = { id: uid(), email: invite.email, name: String(body.name ?? ""), password_hash: hashPassword(String(body.password ?? "")), role: "user", status: "active", created_at: now() };
      db.users.set(user.id, user);
      upsertEntitlement(user.id);
      return envelope(res, request_id, 201, { id: user.id, email: user.email, role: user.role });
    }
    if (method === "POST" && url.pathname === "/v1/auth/login") {
      const body = await readJson(req);
      const user = Array.from(db.users.values()).find((u) => u.email.toLowerCase() === String(body.email ?? "").toLowerCase());
      if (!user || !user.password_hash || !verifyPassword(String(body.password ?? ""), user.password_hash)) return fail(res, request_id, 401, "INVALID_CREDENTIALS", "Invalid credentials");
      const token = crypto.randomBytes(24).toString("hex");
      db.sessions.set(token, { token, user_id: user.id, created_at: now(), expires_at: new Date(Date.now() + 86400000).toISOString() });
      return envelope(res, request_id, 200, { token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    }
    if (method === "GET" && url.pathname === "/v1/me") {
      const session = auth(req, res, request_id); if (!session) return;
      return envelope(res, request_id, 200, { id: session.user.id, email: session.user.email, role: session.user.role, name: session.user.name });
    }

    if (method === "POST" && url.pathname === "/v1/billing/checkout-session") {
      const session = auth(req, res, request_id); if (!session) return;
      const body = await readJson(req);
      const plan = body.plan === "pro" ? "pro" : "solo";
      const interval = body.interval === "year" ? "year" : "month";
      const sub: Subscription = { id: uid(), user_id: session.user.id, stripe_customer_id: `cus_${uid().slice(0, 8)}`, stripe_subscription_id: `sub_${uid().slice(0, 8)}`, plan, interval, status: "trialing", trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(), updated_at: now() };
      db.subscriptions.set(sub.user_id, sub);
      upsertEntitlement(session.user.id);
      return envelope(res, request_id, 200, { checkout_url: `https://stripe.test/checkout/${sub.stripe_subscription_id}`, subscription_id: sub.id });
    }
    if (method === "POST" && url.pathname === "/v1/billing/portal-session") {
      const session = auth(req, res, request_id); if (!session) return;
      return envelope(res, request_id, 200, { portal_url: `https://stripe.test/portal/${session.user.id}` });
    }
    if (method === "GET" && url.pathname === "/v1/billing/subscription") {
      const session = auth(req, res, request_id); if (!session) return;
      const sub = db.subscriptions.get(session.user.id);
      return envelope(res, request_id, 200, sub ?? { status: "none" });
    }

    if (method === "POST" && url.pathname === "/v1/webhooks/stripe") {
      const body = await readJson(req);
      const type = String(body.type ?? "");
      const user_id = String(body.user_id ?? "");
      const sub = db.subscriptions.get(user_id);
      if (!sub) return envelope(res, request_id, 202, { accepted: true, noop: true });
      if (type === "invoice.paid") sub.status = "active";
      if (type === "invoice.payment_failed") sub.status = "past_due";
      if (type === "customer.subscription.updated") sub.status = String(body.status ?? sub.status) as SubscriptionStatus;
      if (type === "customer.subscription.deleted") sub.status = "canceled";
      sub.updated_at = now();
      db.invoices.set(uid(), { id: uid(), user_id, stripe_invoice_id: String(body.invoice_id ?? `in_${uid().slice(0, 8)}`), status: type, created_at: now() });
      upsertEntitlement(user_id);
      return envelope(res, request_id, 202, { accepted: true });
    }

    if (method === "GET" && url.pathname === "/v1/entitlements") {
      const session = auth(req, res, request_id); if (!session) return;
      const ent = db.entitlement_snapshots.get(session.user.id) ?? upsertEntitlement(session.user.id);
      return envelope(res, request_id, 200, ent);
    }

    if (method === "POST" && url.pathname === "/v1/telemetry") {
      const session = auth(req, res, request_id); if (!session) return;
      const body = await readJson(req);
      const allowed = ["event_type", "ts", "duration_ms", "error_code", "app_version", "worker_version"];
      const keys = Object.keys(body);
      if (keys.some((k) => !allowed.includes(k))) return fail(res, request_id, 422, "VALIDATION_ERROR", "Clinical payload is forbidden");
      if (typeof body.event_type !== "string") return fail(res, request_id, 422, "VALIDATION_ERROR", "event_type required");
      const event: Telemetry = { id: uid(), user_id: session.user.id, event_type: body.event_type, ts: typeof body.ts === "string" ? body.ts : now(), duration_ms: typeof body.duration_ms === "number" ? body.duration_ms : undefined, error_code: typeof body.error_code === "string" ? body.error_code : undefined, app_version: typeof body.app_version === "string" ? body.app_version : undefined, worker_version: typeof body.worker_version === "string" ? body.worker_version : undefined };
      db.telemetry_events.set(event.id, event);
      return envelope(res, request_id, 202, { accepted: true });
    }

    if (method === "GET" && url.pathname === "/v1/admin/users") {
      const session = auth(req, res, request_id, "admin"); if (!session) return;
      return envelope(res, request_id, 200, Array.from(db.users.values()).map((u) => ({ id: u.id, email: u.email, role: u.role, status: u.status, created_at: u.created_at })));
    }
    if (method === "GET" && url.pathname === "/v1/admin/metrics/overview") {
      const session = auth(req, res, request_id, "admin"); if (!session) return;
      return envelope(res, request_id, 200, { users_total: db.users.size, active_subscriptions: Array.from(db.subscriptions.values()).filter((s) => s.status === "active" || s.status === "trialing").length, telemetry_events: db.telemetry_events.size, invoices: db.invoices.size });
    }
    if (method === "GET" && url.pathname === "/v1/admin/metrics/user-usage") {
      const session = auth(req, res, request_id, "admin"); if (!session) return;
      const user_id = url.searchParams.get("user_id");
      if (!user_id) return fail(res, request_id, 422, "VALIDATION_ERROR", "user_id required");
      const rows = Array.from(db.telemetry_events.values()).filter((e) => e.user_id === user_id);
      return envelope(res, request_id, 200, { user_id, events_total: rows.length, errors_total: rows.filter((r) => r.error_code).length });
    }
    if (method === "GET" && url.pathname === "/v1/admin/metrics/errors") {
      const session = auth(req, res, request_id, "admin"); if (!session) return;
      return envelope(res, request_id, 200, Array.from(db.telemetry_events.values()).filter((e) => e.error_code).map((e) => ({ user_id: e.user_id, event_type: e.event_type, error_code: e.error_code, ts: e.ts })));
    }
    if (method === "GET" && url.pathname === "/v1/admin/audit") {
      const session = auth(req, res, request_id, "admin"); if (!session) return;
      return envelope(res, request_id, 200, Array.from(db.audit_events.values()));
    }

    return fail(res, request_id, 404, "NOT_FOUND", "Route not found");
  } catch {
    return fail(res, request_id, 400, "BAD_REQUEST", "Invalid request");
  }
});
