import crypto from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

type Role = "admin" | "user";
type UserStatus = "invited" | "active" | "disabled";
type Plan = "SOLO" | "PRO";
type Cycle = "monthly" | "annual";
type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "none";

type User = {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  role: Role;
  status: UserStatus;
  created_at: string;
  last_seen_at?: string;
};

type Invite = {
  id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
};

type SessionToken = { token: string; user_id: string; created_at: string; expires_at: string };

type Subscription = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  price_id: string;
  plan: Plan;
  cycle: Cycle;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  trial_end?: string;
  last_ok_at?: string;
  updated_at: string;
};

type Invoice = {
  id: string;
  user_id: string;
  stripe_invoice_id: string;
  status: string;
  amount_due: number;
  currency: string;
  hosted_invoice_url?: string;
  created_at: string;
};

type Entitlements = {
  exports_enabled: boolean;
  backup_enabled: boolean;
  forms_enabled: boolean;
  scales_enabled: boolean;
  finance_enabled: boolean;
  transcription_minutes_per_month: number;
  max_patients: number;
  max_sessions_per_month: number;
};

type EntitlementSnapshot = {
  user_id: string;
  entitlements_json: Entitlements;
  effective_from: string;
  source_event: string;
  updated_at: string;
};

type Telemetry = {
  id: string;
  user_id: string;
  event_type: string;
  ts: string;
  duration_ms?: number;
  error_code?: string;
  app_version?: string;
  worker_version?: string;
  platform?: string;
};

type Audit = {
  id: string;
  user_id: string;
  event_type: string;
  ts: string;
  meta_sanitized_json?: Record<string, unknown>;
};

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const hash = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const value = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${value}`;
};
const verifyPassword = (password: string, stored: string) => {
  const [salt, value] = stored.split(":");
  if (!salt || !value) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(check));
};

const telemetryWhitelist = new Set([
  "APP_OPEN",
  "AUTH_LOGIN",
  "TRANSCRIPTION_JOB_CREATED",
  "TRANSCRIPTION_JOB_COMPLETED",
  "TRANSCRIPTION_JOB_FAILED",
  "NOTE_VALIDATED",
  "EXPORT_PDF",
  "EXPORT_DOCX",
  "BACKUP_CREATED",
  "ERROR",
]);
const forbiddenTelemetryKeys = ["text", "transcript", "patient", "audio", "file_path", "content"];

const SOLO: Entitlements = {
  exports_enabled: true,
  backup_enabled: true,
  forms_enabled: true,
  scales_enabled: true,
  finance_enabled: true,
  transcription_minutes_per_month: 600,
  max_patients: 200,
  max_sessions_per_month: 200,
};
const PRO: Entitlements = {
  exports_enabled: true,
  backup_enabled: true,
  forms_enabled: true,
  scales_enabled: true,
  finance_enabled: true,
  transcription_minutes_per_month: 3000,
  max_patients: 2000,
  max_sessions_per_month: 2000,

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
  invoices: new Map<string, Invoice>(),
  entitlement_snapshots: new Map<string, EntitlementSnapshot>(),
  invoices: new Map<string, { id: string; user_id: string; stripe_invoice_id: string; status: string; created_at: string }>(),
  entitlement_snapshots: new Map<string, Entitlement>(),
  telemetry_events: new Map<string, Telemetry>(),
  audit_events: new Map<string, Audit>(),
};

const adminId = uid();
db.users.set(adminId, {
  id: adminId,
  email: "camila@ethos.local",
  name: "Camila",
  password_hash: hashPassword("admin123"),
  role: "admin",
  status: "active",
  created_at: now(),
});

const getEntitlementsForSubscription = (sub?: Subscription): Entitlements => {
  if (!sub) return SOLO;
  return sub.plan === "PRO" ? PRO : SOLO;
};

const upsertSnapshot = (userId: string, source_event: string) => {
  const sub = db.subscriptions.get(userId);
  const snap: EntitlementSnapshot = {
    user_id: userId,
    entitlements_json: getEntitlementsForSubscription(sub),
    effective_from: now(),
    source_event,
    updated_at: now(),
  };
  db.entitlement_snapshots.set(userId, snap);
  return snap;
};

const send = <T>(res: ServerResponse, request_id: string, statusCode: number, data: T) => {
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

const requireAuth = (req: IncomingMessage, res: ServerResponse, request_id: string, role?: Role) => {
const auth = (req: IncomingMessage, res: ServerResponse, request_id: string, role?: Role) => {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "";
  const session = db.sessions.get(token);
  if (!session || Date.parse(session.expires_at) < Date.now()) return fail(res, request_id, 401, "UNAUTHORIZED", "Invalid session"), null;
  const user = db.users.get(session.user_id);
  if (!user || user.status !== "active") return fail(res, request_id, 401, "UNAUTHORIZED", "Invalid user"), null;
  if (role && user.role !== role) return fail(res, request_id, 403, "FORBIDDEN", "Forbidden"), null;
  return { token, user };
};

const toPlanCycle = (priceId: string): { plan: Plan; cycle: Cycle } => {
  const v = priceId.toLowerCase();
  const plan: Plan = v.includes("pro") ? "PRO" : "SOLO";
  const cycle: Cycle = v.includes("year") || v.includes("annual") ? "annual" : "monthly";
  return { plan, cycle };
};

const parseWindow = (url: URL) => {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  return {
    from: from ? Date.parse(from) : Number.NEGATIVE_INFINITY,
    to: to ? Date.parse(to) : Number.POSITIVE_INFINITY,
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
      const auth = requireAuth(req, res, request_id, "admin"); if (!auth) return;
      const body = await readJson(req);
      if (typeof body.email !== "string" || !body.email.includes("@")) return fail(res, request_id, 422, "VALIDATION_ERROR", "Invalid email");
      const rawToken = crypto.randomBytes(24).toString("hex");
      const invite: Invite = {
        id: uid(),
        email: body.email,
        token_hash: hash(rawToken),
        expires_at: typeof body.expires_at === "string" ? body.expires_at : new Date(Date.now() + 86400000).toISOString(),
        created_at: now(),
      };
      db.invites.set(invite.id, invite);
      db.audit_events.set(uid(), { id: uid(), user_id: auth.user.id, event_type: "AUTH_INVITE_CREATED", ts: now(), meta_sanitized_json: { invite_id: invite.id } });
      return send(res, request_id, 201, { invite_id: invite.id, invite_token: rawToken, expires_at: invite.expires_at });
    }

    if (method === "POST" && url.pathname === "/v1/auth/accept-invite") {
      const body = await readJson(req);
      const token = String(body.token ?? "");
      const invite = Array.from(db.invites.values()).find((v) => v.token_hash === hash(token) && !v.used_at);
      if (!invite || Date.parse(invite.expires_at) < Date.now()) return fail(res, request_id, 400, "INVALID_INVITE", "Invite invalid or expired");
      invite.used_at = now();
      const user: User = {
        id: uid(),
        email: invite.email,
        name: String(body.name ?? ""),
        password_hash: hashPassword(String(body.password ?? "")),
        role: "user",
        status: "active",
        created_at: now(),
      };
      db.users.set(user.id, user);
      upsertSnapshot(user.id, "invite_accept");
      return send(res, request_id, 201, { id: user.id, email: user.email, role: user.role, status: user.status });
    }

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
      user.last_seen_at = now();
      db.audit_events.set(uid(), { id: uid(), user_id: user.id, event_type: "AUTH_LOGIN", ts: now() });
      return send(res, request_id, 200, { token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    }

    if (method === "POST" && url.pathname === "/v1/auth/logout") {
      const auth = requireAuth(req, res, request_id); if (!auth) return;
      db.sessions.delete(auth.token);
      return send(res, request_id, 200, { ok: true });
    }

    if (method === "GET" && url.pathname === "/v1/me") {
      const auth = requireAuth(req, res, request_id); if (!auth) return;
      return send(res, request_id, 200, { id: auth.user.id, email: auth.user.email, name: auth.user.name, role: auth.user.role, status: auth.user.status });
    }

    if (method === "PATCH" && url.pathname === "/v1/me") {
      const auth = requireAuth(req, res, request_id); if (!auth) return;
      const body = await readJson(req);
      if (typeof body.name === "string") auth.user.name = body.name;
      return send(res, request_id, 200, { id: auth.user.id, name: auth.user.name });
    }

    if (method === "POST" && url.pathname === "/v1/billing/checkout-session") {
      const auth = requireAuth(req, res, request_id); if (!auth) return;
      const body = await readJson(req);
      const price_id = String(body.price_id ?? "solo_monthly");
      const { plan, cycle } = toPlanCycle(price_id);
      const sub: Subscription = {
        user_id: auth.user.id,
        stripe_customer_id: `cus_${uid().slice(0, 8)}`,
        stripe_subscription_id: `sub_${uid().slice(0, 8)}`,
        status: "trialing",
        price_id,
        plan,
        cycle,
        current_period_end: new Date(Date.now() + (cycle === "annual" ? 365 : 30) * 86400000).toISOString(),
        cancel_at_period_end: false,
        trial_end: new Date(Date.now() + 7 * 86400000).toISOString(),
        last_ok_at: now(),
        updated_at: now(),
      };
      db.subscriptions.set(auth.user.id, sub);
      upsertSnapshot(auth.user.id, "checkout.session.created");
      return send(res, request_id, 200, { url: `https://checkout.stripe.test/${sub.stripe_subscription_id}`, price_id, trial_days: 7 });
    }

    if (method === "POST" && url.pathname === "/v1/billing/portal-session") {
      const auth = requireAuth(req, res, request_id); if (!auth) return;
      return send(res, request_id, 200, { url: `https://billing.stripe.test/portal/${auth.user.id}` });
    }

    if (method === "GET" && url.pathname === "/v1/billing/subscription") {
      const auth = requireAuth(req, res, request_id); if (!auth) return;
      const sub = db.subscriptions.get(auth.user.id);
      return send(res, request_id, 200, sub ?? { status: "none", plan: "SOLO", cycle: "monthly" });
    }

    if (method === "POST" && url.pathname === "/v1/webhooks/stripe") {
      const signature = req.headers["stripe-signature"];
      if (!signature || typeof signature !== "string") return fail(res, request_id, 401, "INVALID_SIGNATURE", "Missing Stripe-Signature");
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
      if (!sub) return send(res, request_id, 202, { accepted: true, noop: true });

      if (type === "customer.subscription.created") sub.status = "trialing";
      if (type === "customer.subscription.updated") sub.status = String(body.status ?? sub.status) as SubscriptionStatus;
      if (type === "customer.subscription.deleted") sub.status = "canceled";
      if (type === "checkout.session.completed") sub.status = "trialing";
      if (type === "invoice.paid") {
        sub.status = "active";
        sub.last_ok_at = now();
      }
      if (type === "invoice.payment_failed") sub.status = "past_due";
      if (type === "payment_method.attached") sub.status = sub.status;

      sub.updated_at = now();
      const invoice: Invoice = {
        id: uid(),
        user_id,
        stripe_invoice_id: String(body.invoice_id ?? `in_${uid().slice(0, 8)}`),
        status: type,
        amount_due: Number(body.amount_due ?? 0),
        currency: String(body.currency ?? "usd"),
        hosted_invoice_url: typeof body.hosted_invoice_url === "string" ? body.hosted_invoice_url : undefined,
        created_at: now(),
      };
      db.invoices.set(invoice.id, invoice);
      upsertSnapshot(user_id, type);
      db.audit_events.set(uid(), { id: uid(), user_id, event_type: "BILLING_WEBHOOK_APPLIED", ts: now(), meta_sanitized_json: { type } });
      return send(res, request_id, 202, { accepted: true });
    }

    if (method === "GET" && url.pathname === "/v1/entitlements") {
      const auth = requireAuth(req, res, request_id); if (!auth) return;
      const sub = db.subscriptions.get(auth.user.id);
      const snapshot = db.entitlement_snapshots.get(auth.user.id) ?? upsertSnapshot(auth.user.id, "entitlements.read");
      const grace_deadline = sub?.last_ok_at ? new Date(Date.parse(sub.last_ok_at) + 14 * 86400000).toISOString() : undefined;
      const is_in_grace = !!grace_deadline && Date.parse(grace_deadline) > Date.now();
      return send(res, request_id, 200, {
        entitlements: snapshot.entitlements_json,
        subscription_status: sub?.status ?? "none",
        plan: sub?.plan ?? "SOLO",
        cycle: sub?.cycle ?? "monthly",
        grace_days: 14,
        grace_until: grace_deadline,
        is_in_grace,
        last_ok_at: sub?.last_ok_at,
        updated_at: snapshot.updated_at,
      });
    }

    if (method === "POST" && url.pathname === "/v1/telemetry") {
      const auth = requireAuth(req, res, request_id); if (!auth) return;
      const body = await readJson(req);
      if (Object.keys(body).some((k) => forbiddenTelemetryKeys.some((bad) => k.toLowerCase().includes(bad)))) return fail(res, request_id, 422, "VALIDATION_ERROR", "Forbidden telemetry key");
      if (typeof body.event_type !== "string" || !telemetryWhitelist.has(body.event_type)) return fail(res, request_id, 422, "VALIDATION_ERROR", "event_type not allowed");

      const event: Telemetry = {
        id: uid(),
        user_id: auth.user.id,
        event_type: body.event_type,
        ts: typeof body.ts === "string" ? body.ts : now(),
        duration_ms: typeof body.duration_ms === "number" ? body.duration_ms : undefined,
        error_code: typeof body.error_code === "string" ? body.error_code : undefined,
        app_version: typeof body.app_version === "string" ? body.app_version : undefined,
        worker_version: typeof body.worker_version === "string" ? body.worker_version : undefined,
        platform: typeof body.platform === "string" ? body.platform : undefined,
      };
      db.telemetry_events.set(event.id, event);
      return send(res, request_id, 202, { accepted: true });
    }

    if (method === "GET" && url.pathname === "/v1/admin/users") {
      const auth = requireAuth(req, res, request_id, "admin"); if (!auth) return;
      const rows = Array.from(db.users.values()).map((u) => {
        const sub = db.subscriptions.get(u.id);
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          status: u.status,
          plan: sub?.plan ?? "SOLO",
          status_sub: sub?.status ?? "none",
          last_seen_at: u.last_seen_at,
          created_at: u.created_at,
        };
      });
      return send(res, request_id, 200, rows);
    }

    const adminPatchUser = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)$/);
    if (method === "PATCH" && adminPatchUser) {
      const auth = requireAuth(req, res, request_id, "admin"); if (!auth) return;
      const user = db.users.get(adminPatchUser[1]);
      if (!user) return fail(res, request_id, 404, "NOT_FOUND", "User not found");
      const body = await readJson(req);
      if (body.status === "active" || body.status === "disabled") user.status = body.status;
      if (body.role === "admin" || body.role === "user") user.role = body.role;
      db.audit_events.set(uid(), { id: uid(), user_id: auth.user.id, event_type: "ADMIN_USER_PATCH", ts: now(), meta_sanitized_json: { target_user_id: user.id } });
      return send(res, request_id, 200, { id: user.id, status: user.status, role: user.role });
    }

    if (method === "GET" && url.pathname === "/v1/admin/metrics/overview") {
      const auth = requireAuth(req, res, request_id, "admin"); if (!auth) return;
      const win = parseWindow(url);
      const inWindow = (ts?: string) => !!ts && Date.parse(ts) >= win.from && Date.parse(ts) <= win.to;
      const users = Array.from(db.users.values());
      const subs = Array.from(db.subscriptions.values());
      const telemetry = Array.from(db.telemetry_events.values()).filter((e) => inWindow(e.ts));
      const audits = Array.from(db.audit_events.values()).filter((a) => inWindow(a.ts));

      return send(res, request_id, 200, {
        active_subscriptions: subs.filter((s) => s.status === "active" || s.status === "trialing").length,
        new_accounts: users.filter((u) => inWindow(u.created_at)).length,
        trial_conversion: subs.filter((s) => s.status === "active").length,
        churn: subs.filter((s) => s.status === "canceled").length,
        usage: {
          transcription_minutes: Math.round(telemetry.filter((e) => e.event_type.includes("TRANSCRIPTION")).reduce((acc, cur) => acc + ((cur.duration_ms ?? 0) / 60000), 0)),
          notes_validated: telemetry.filter((e) => e.event_type === "NOTE_VALIDATED").length,
          exports: telemetry.filter((e) => e.event_type === "EXPORT_PDF" || e.event_type === "EXPORT_DOCX").length,
          backups: telemetry.filter((e) => e.event_type === "BACKUP_CREATED").length,
        },
        audit_events: audits.length,
      });
    }

    if (method === "GET" && url.pathname === "/v1/admin/metrics/user-usage") {
      const auth = requireAuth(req, res, request_id, "admin"); if (!auth) return;
      const user_id = url.searchParams.get("user_id");
      if (!user_id) return fail(res, request_id, 422, "VALIDATION_ERROR", "user_id required");
      const win = parseWindow(url);
      const rows = Array.from(db.telemetry_events.values()).filter((t) => t.user_id === user_id && Date.parse(t.ts) >= win.from && Date.parse(t.ts) <= win.to);
      return send(res, request_id, 200, {
        user_id,
        events_total: rows.length,
        transcription_minutes: Math.round(rows.filter((r) => r.event_type.includes("TRANSCRIPTION")).reduce((acc, cur) => acc + ((cur.duration_ms ?? 0) / 60000), 0)),
        exports: rows.filter((r) => r.event_type.startsWith("EXPORT")).length,
        backups: rows.filter((r) => r.event_type === "BACKUP_CREATED").length,
        errors: rows.filter((r) => r.error_code).length,
      });
    }

    if (method === "GET" && url.pathname === "/v1/admin/metrics/errors") {
      const auth = requireAuth(req, res, request_id, "admin"); if (!auth) return;
      const win = parseWindow(url);
      const rows = Array.from(db.telemetry_events.values()).filter((r) => r.error_code && Date.parse(r.ts) >= win.from && Date.parse(r.ts) <= win.to);
      const grouped = new Map<string, number>();
      for (const row of rows) {
        const key = `${row.error_code}|${row.app_version ?? "na"}|${row.worker_version ?? "na"}`;
        grouped.set(key, (grouped.get(key) ?? 0) + 1);
      }
      return send(res, request_id, 200, Array.from(grouped.entries()).map(([k, count]) => {
        const [error_code, app_version, worker_version] = k.split("|");
        return { error_code, app_version, worker_version, count };
      }));
    }

    if (method === "GET" && url.pathname === "/v1/admin/audit") {
      const auth = requireAuth(req, res, request_id, "admin"); if (!auth) return;
      const win = parseWindow(url);
      const rows = Array.from(db.audit_events.values()).filter((a) => Date.parse(a.ts) >= win.from && Date.parse(a.ts) <= win.to);
      return send(res, request_id, 200, rows);
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
