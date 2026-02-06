import crypto from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

type Role = "admin" | "supervisor" | "assistente";
type User = { id: string; email: string; name: string; role: Role; status: "active" | "disabled"; password_hash: string; created_at: string };
type Invite = { id: string; email: string; token_hash: string; expires_at: string; created_at: string; used_at?: string };
type Session = { token: string; user_id: string; expires_at: string };

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
  entitlements: Entitlements;
  source_subscription_status: "none" | "active" | "past_due";
  grace_days: number;
  grace_until?: string;
};

type Telemetry = { id: string; user_id: string; event_type: string; ts: string; [key: string]: unknown };

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

const db = {
  users: new Map<string, User>(),
  invites: new Map<string, Invite>(),
  sessions: new Map<string, Session>(),
  entitlements: new Map<string, EntitlementSnapshot>(),
  telemetry: new Map<string, Telemetry>(),
  audit: new Map<string, { id: string; actor_user_id: string; event: string; ts: string }>(),
};

const adminId = uid();
db.users.set(adminId, { id: adminId, email: "camila@ethos.local", name: "Camila", role: "admin", status: "active", password_hash: hashPassword("admin123"), created_at: now() });

const defaultEntitlements: Entitlements = {
  exports_enabled: true,
  backup_enabled: true,
  forms_enabled: true,
  scales_enabled: true,
  finance_enabled: true,
  transcription_minutes_per_month: 3000,
  max_patients: 2000,
  max_sessions_per_month: 2000,
};

const send = <T>(res: ServerResponse, requestId: string, status: number, data: T) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ request_id: requestId, data }));
};

const fail = (res: ServerResponse, requestId: string, status: number, code: string, message: string) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ request_id: requestId, error: { code, message } }));
};

const readJson = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, unknown>;
};

const requireAuth = (req: IncomingMessage, res: ServerResponse, requestId: string, role?: Role) => {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "";
  const session = db.sessions.get(token);
  if (!session || Date.parse(session.expires_at) < Date.now()) return fail(res, requestId, 401, "UNAUTHORIZED", "Invalid session"), null;
  const user = db.users.get(session.user_id);
  if (!user || user.status !== "active") return fail(res, requestId, 401, "UNAUTHORIZED", "Invalid user"), null;
  if (role && user.role !== role) return fail(res, requestId, 403, "FORBIDDEN", "Forbidden"), null;
  return { token, user };
};

const upsertEntitlements = (userId: string, status: EntitlementSnapshot["source_subscription_status"] = "active") => {
  const snapshot: EntitlementSnapshot = {
    user_id: userId,
    entitlements: defaultEntitlements,
    source_subscription_status: status,
    grace_days: 14,
    grace_until: status === "past_due" ? new Date(Date.now() + 14 * 86_400_000).toISOString() : undefined,
  };
  db.entitlements.set(userId, snapshot);
  return snapshot;
};

const forbiddenTelemetryKeys = ["text", "transcript", "patient", "audio", "file_path", "content", "clinical_text"];

export const createControlPlane = () => createServer(async (req, res) => {
  const requestId = uid();
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://localhost");

  try {
    if (method === "POST" && url.pathname === "/v1/auth/login") {
      const body = await readJson(req);
      const user = Array.from(db.users.values()).find((item) => item.email.toLowerCase() === String(body.email ?? "").toLowerCase());
      if (!user || !verifyPassword(String(body.password ?? ""), user.password_hash)) return fail(res, requestId, 401, "UNAUTHORIZED", "Invalid credentials");
      const token = crypto.randomBytes(24).toString("hex");
      db.sessions.set(token, { token, user_id: user.id, expires_at: new Date(Date.now() + 86_400_000).toISOString() });
      return send(res, requestId, 200, { user: { id: user.id, email: user.email, role: user.role }, token });
    }

    if (method === "POST" && url.pathname === "/v1/auth/accept-invite") {
      const body = await readJson(req);
      const token = String(body.token ?? "");
      const invite = Array.from(db.invites.values()).find((item) => item.token_hash === hash(token) && !item.used_at);
      if (!invite || Date.parse(invite.expires_at) < Date.now()) return fail(res, requestId, 400, "INVALID_INVITE", "Invite invalid or expired");
      invite.used_at = now();
      const user: User = {
        id: uid(),
        email: invite.email,
        name: String(body.name ?? ""),
        role: "assistente",
        status: "active",
        password_hash: hashPassword(String(body.password ?? "")),
        created_at: now(),
      };
      db.users.set(user.id, user);
      upsertEntitlements(user.id, "active");
      return send(res, requestId, 201, { id: user.id, email: user.email });
    }


    if (method === "POST" && url.pathname === "/v1/webhooks/stripe") {
      if (!req.headers["stripe-signature"]) return fail(res, requestId, 401, "INVALID_SIGNATURE", "Missing stripe signature");
      const body = await readJson(req);
      if (body.type === "invoice.payment_failed" && typeof body.user_id === "string") upsertEntitlements(body.user_id, "past_due");
      return send(res, requestId, 202, { accepted: true });
    }

    const auth = requireAuth(req, res, requestId);
    if (!auth) return;

    if (method === "POST" && url.pathname === "/v1/auth/invite") {
      if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
      const body = await readJson(req);
      const inviteToken = crypto.randomBytes(24).toString("hex");
      const invite: Invite = { id: uid(), email: String(body.email ?? ""), token_hash: hash(inviteToken), expires_at: new Date(Date.now() + 86_400_000).toISOString(), created_at: now() };
      db.invites.set(invite.id, invite);
      db.audit.set(uid(), { id: uid(), actor_user_id: auth.user.id, event: "INVITE_CREATED", ts: now() });
      return send(res, requestId, 201, { invite_id: invite.id, invite_token: inviteToken });
    }

    if (method === "GET" && url.pathname === "/v1/me") return send(res, requestId, 200, { id: auth.user.id, email: auth.user.email, name: auth.user.name });
    if (method === "PATCH" && url.pathname === "/v1/me") {
      const body = await readJson(req);
      auth.user.name = String(body.name ?? auth.user.name);
      return send(res, requestId, 200, { id: auth.user.id, name: auth.user.name });
    }

    if (method === "POST" && url.pathname === "/v1/billing/checkout-session") return send(res, requestId, 200, { checkout_url: "https://billing.local/checkout" });
    if (method === "GET" && url.pathname === "/v1/billing/subscription") return send(res, requestId, 200, { status: "active" });
    if (method === "POST" && url.pathname === "/v1/billing/portal-session") return send(res, requestId, 200, { portal_url: "https://billing.local/portal" });

    if (method === "GET" && url.pathname === "/v1/entitlements") return send(res, requestId, 200, db.entitlements.get(auth.user.id) ?? upsertEntitlements(auth.user.id));

    if (method === "POST" && url.pathname === "/v1/telemetry") {
      const body = await readJson(req);
      if (forbiddenTelemetryKeys.some((key) => key in body)) return fail(res, requestId, 422, "VALIDATION_ERROR", "Telemetry contains forbidden keys");
      const event: Telemetry = { id: uid(), user_id: auth.user.id, event_type: String(body.event_type ?? "UNKNOWN"), ts: String(body.ts ?? now()), ...body };
      db.telemetry.set(event.id, event);
      return send(res, requestId, 202, { accepted: true });
    }

    if (method === "GET" && url.pathname === "/v1/admin/users") {
      if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
      return send(res, requestId, 200, Array.from(db.users.values()).map((user) => ({ id: user.id, email: user.email, role: user.role, status: user.status })));
    }

    const adminUserPatch = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)$/);
    if (method === "PATCH" && adminUserPatch) {
      if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
      const body = await readJson(req);
      const user = db.users.get(adminUserPatch[1]);
      if (!user) return fail(res, requestId, 404, "NOT_FOUND", "User not found");
      if (body.status === "active" || body.status === "disabled") user.status = body.status;
      return send(res, requestId, 200, { id: user.id, status: user.status });
    }

    if (method === "GET" && url.pathname === "/v1/admin/metrics/overview") {
      if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
      return send(res, requestId, 200, { users_total: db.users.size, telemetry_total: db.telemetry.size });
    }
    if (method === "GET" && url.pathname === "/v1/admin/metrics/user-usage") {
      if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
      const userId = url.searchParams.get("user_id") ?? "";
      const usage = Array.from(db.telemetry.values()).filter((item) => item.user_id === userId).length;
      return send(res, requestId, 200, { user_id: userId, events: usage });
    }
    if (method === "GET" && url.pathname === "/v1/admin/metrics/errors") {
      if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
      const errors = Array.from(db.telemetry.values()).filter((item) => item.event_type === "ERROR").length;
      return send(res, requestId, 200, { errors });
    }
    if (method === "GET" && url.pathname === "/v1/admin/audit") {
      if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
      return send(res, requestId, 200, Array.from(db.audit.values()));
    }

    return fail(res, requestId, 404, "NOT_FOUND", "Route not found");
  } catch {
    return fail(res, requestId, 500, "INTERNAL_ERROR", "Unexpected server error");
  }
});
