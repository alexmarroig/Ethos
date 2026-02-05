import crypto from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  acceptInvite,
  addAudit,
  addAudio,
  addTelemetry,
  adminOverviewMetrics,
  createAnamnesis,
  createClinicalNoteDraft,
  createFinancialEntry,
  createFormEntry,
  createInvite,
  createJob,
  createReport,
  createScaleRecord,
  createSession,
  getByOwner,
  getJob,
  getUserFromToken,
  handleTranscriberWebhook,
  login,
  logout,
  paginate,
  patchSessionStatus,
  purgeUserData,
  runJob,
  validateClinicalNote,
} from "../application/service";
import { db } from "../infra/database";
import type { ApiError, ApiEnvelope, Role, SessionStatus } from "../domain/types";

const openApi = readFileSync(path.resolve(__dirname, "../../openapi.yaml"), "utf-8");
const CLINICAL_PATHS = [/^\/sessions/, /^\/clinical-notes/, /^\/reports/, /^\/anamnesis/, /^\/scales/, /^\/forms/, /^\/financial/, /^\/jobs/, /^\/export/, /^\/backup/, /^\/restore/, /^\/purge/];

const readJson = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw) as Record<string, unknown>;
};

const error = (res: ServerResponse, requestId: string, status: number, code: string, message: string) => {
  const payload: ApiError = { request_id: requestId, error: { code, message } };
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
};

const ok = <T>(res: ServerResponse, requestId: string, status: number, data: T) => {
  const body: ApiEnvelope<T> = { request_id: requestId, data };
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
};

const tokenFrom = (req: IncomingMessage) => req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;

const rate = new Map<string, { start: number; count: number }>();
const rateLimit = (req: IncomingMessage) => {
  const key = req.socket.remoteAddress ?? "local";
  const curr = rate.get(key);
  const now = Date.now();
  if (!curr || now - curr.start > 60_000) {
    rate.set(key, { start: now, count: 1 });
    return true;
  }
  curr.count += 1;
  return curr.count <= 200;
};

const requireAuth = (req: IncomingMessage, res: ServerResponse, requestId: string, role?: Role) => {
  const token = tokenFrom(req);
  if (!token) return error(res, requestId, 401, "UNAUTHORIZED", "Missing bearer token"), null;
  const user = getUserFromToken(token);
  if (!user || user.status !== "active") return error(res, requestId, 401, "UNAUTHORIZED", "Invalid session"), null;
  if (role && user.role !== role) return error(res, requestId, 403, "FORBIDDEN", "Missing permission"), null;
  return { user, token };
};

const parsePagination = (url: URL) => ({ page: Number(url.searchParams.get("page") ?? 1), pageSize: Number(url.searchParams.get("page_size") ?? 20) });

export const createEthosBackend = () => createServer(async (req, res) => {
  const requestId = crypto.randomUUID();
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://localhost");

  if (!rateLimit(req)) return error(res, requestId, 429, "RATE_LIMITED", "Too many requests");

  try {
    if (method === "GET" && url.pathname === "/openapi.yaml") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/yaml");
      return res.end(openApi);
    }
    if (method === "GET" && url.pathname === "/contracts") {
      return ok(res, requestId, 200, {
        openapi: "/openapi.yaml",
        response_envelope: { request_id: "string", data: "any" },
        error_envelope: { request_id: "string", error: { code: "string", message: "string" } },
        examples: { idempotency: "Idempotency-Key: 5b5a-..." },
      });
    }

    if (method === "POST" && url.pathname === "/auth/invite") {
      const auth = requireAuth(req, res, requestId, "admin"); if (!auth) return;
      const body = await readJson(req);
      if (typeof body.email !== "string" || !body.email.includes("@")) return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid email");
      const { invite, token } = createInvite(body.email);
      addAudit(auth.user.id, "INVITE_CREATED");
      return ok(res, requestId, 201, { invite_id: invite.id, invite_token: token, expires_at: invite.expires_at });
    }
    if (method === "POST" && url.pathname === "/auth/accept-invite") {
      const body = await readJson(req);
      if (typeof body.token !== "string" || typeof body.name !== "string" || typeof body.password !== "string") return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid payload");
      const user = acceptInvite(body.token, body.name, body.password);
      if (!user) return error(res, requestId, 400, "INVALID_INVITE", "Invite token invalid or expired");
      return ok(res, requestId, 201, { id: user.id, email: user.email, role: user.role });
    }
    if (method === "POST" && url.pathname === "/auth/login") {
      const body = await readJson(req);
      const result = login(String(body.email ?? ""), String(body.password ?? ""));
      if (!result) return error(res, requestId, 401, "INVALID_CREDENTIALS", "Invalid credentials");
      return ok(res, requestId, 200, { token: result.token, user: { id: result.user.id, email: result.user.email, role: result.user.role, name: result.user.name } });
    }
    if (method === "POST" && url.pathname === "/auth/logout") {
      const auth = requireAuth(req, res, requestId); if (!auth) return;
      logout(auth.token);
      return ok(res, requestId, 200, { ok: true });
    }

    const auth = requireAuth(req, res, requestId); if (!auth) return;
    if (auth.user.role === "admin" && CLINICAL_PATHS.some((r) => r.test(url.pathname))) return error(res, requestId, 403, "FORBIDDEN", "Admin cannot access clinical content");

    if (method === "GET" && url.pathname === "/admin/metrics/overview") {
      if (auth.user.role !== "admin") return error(res, requestId, 403, "FORBIDDEN", "Missing permission");
      return ok(res, requestId, 200, adminOverviewMetrics());
    }
    if (method === "GET" && url.pathname === "/admin/audit") {
      if (auth.user.role !== "admin") return error(res, requestId, 403, "FORBIDDEN", "Missing permission");
      return ok(res, requestId, 200, Array.from(db.audit.values()));
    }

    const idempotency = req.headers["idempotency-key"];
    const idemKey = typeof idempotency === "string" ? `${auth.user.id}:${method}:${url.pathname}:${idempotency}` : "";
    if (idemKey && db.idempotency.has(idemKey)) {
      const item = db.idempotency.get(idemKey)!;
      return ok(res, requestId, item.statusCode, item.body);
    }

    if (method === "POST" && url.pathname === "/sessions") {
      const body = await readJson(req);
      if (typeof body.patient_id !== "string" || typeof body.scheduled_at !== "string") return error(res, requestId, 422, "VALIDATION_ERROR", "patient_id and scheduled_at required");
      const created = createSession(auth.user.id, body.patient_id, body.scheduled_at);
      if (idemKey) db.idempotency.set(idemKey, { statusCode: 201, body: created, createdAt: new Date().toISOString() });
      return ok(res, requestId, 201, created);
    }
    if (method === "GET" && url.pathname === "/sessions") {
      const { page, pageSize } = parsePagination(url);
      const patientId = url.searchParams.get("patient_id");
      const base = Array.from(db.sessions.values()).filter((s) => s.owner_user_id === auth.user.id && (!patientId || s.patient_id === patientId));
      return ok(res, requestId, 200, paginate(base, page, pageSize));
    }
    const sessionById = url.pathname.match(/^\/sessions\/([^/]+)$/);
    if (method === "GET" && sessionById) {
      const session = getByOwner(db.sessions, auth.user.id, sessionById[1]);
      if (!session) return error(res, requestId, 404, "NOT_FOUND", "Session not found");
      return ok(res, requestId, 200, session);
    }

    const sessionStatus = url.pathname.match(/^\/sessions\/([^/]+)\/status$/);
    if (method === "PATCH" && sessionStatus) {
      const body = await readJson(req);
      const status = body.status as SessionStatus;
      if (!["scheduled", "confirmed", "missed", "completed"].includes(status)) return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid status");
      const session = patchSessionStatus(auth.user.id, sessionStatus[1], status);
      if (!session) return error(res, requestId, 404, "NOT_FOUND", "Session not found");
      return ok(res, requestId, 200, session);
    }

    const audio = url.pathname.match(/^\/sessions\/([^/]+)\/audio$/);
    if (method === "POST" && audio) {
      const body = await readJson(req);
      if (body.consent_confirmed !== true) return error(res, requestId, 422, "CONSENT_REQUIRED", "Explicit consent is required");
      if (!getByOwner(db.sessions, auth.user.id, audio[1])) return error(res, requestId, 404, "NOT_FOUND", "Session not found");
      const record = addAudio(auth.user.id, audio[1], String(body.file_path ?? "vault://audio.enc"));
      return ok(res, requestId, 201, record);
    }

    const transcribe = url.pathname.match(/^\/sessions\/([^/]+)\/transcribe$/);
    if (method === "POST" && transcribe) {
      const body = await readJson(req);
      if (!getByOwner(db.sessions, auth.user.id, transcribe[1])) return error(res, requestId, 404, "NOT_FOUND", "Session not found");
      const job = createJob(auth.user.id, "transcription", transcribe[1]);
      void runJob(job.id, { rawText: String(body.raw_text ?? "") });
      return ok(res, requestId, 202, { job_id: job.id, status: job.status });
    }

    const noteCreate = url.pathname.match(/^\/sessions\/([^/]+)\/clinical-note$/);
    if (method === "POST" && noteCreate) {
      const body = await readJson(req);
      if (typeof body.content !== "string") return error(res, requestId, 422, "VALIDATION_ERROR", "content required");
      const note = createClinicalNoteDraft(auth.user.id, noteCreate[1], body.content);
      return ok(res, requestId, 201, note);
    }

    const noteValidate = url.pathname.match(/^\/clinical-notes\/([^/]+)\/validate$/);
    if (method === "POST" && noteValidate) {
      const note = validateClinicalNote(auth.user.id, noteValidate[1]);
      if (!note) return error(res, requestId, 404, "NOT_FOUND", "Clinical note not found");
      return ok(res, requestId, 200, note);
    }

    if (method === "POST" && url.pathname === "/reports") {
      const body = await readJson(req);
      const report = createReport(auth.user.id, String(body.patient_id), (body.purpose as "instituição" | "profissional" | "paciente") ?? "profissional", String(body.content ?? ""));
      if (!report) return error(res, requestId, 422, "VALIDATED_NOTE_REQUIRED", "A validated note is required before creating reports");
      return ok(res, requestId, 201, report);
    }
    if (method === "GET" && url.pathname === "/reports") {
      const { page, pageSize } = parsePagination(url);
      const patientId = url.searchParams.get("patient_id");
      const items = Array.from(db.reports.values()).filter((x) => x.owner_user_id === auth.user.id && (!patientId || x.patient_id === patientId));
      return ok(res, requestId, 200, paginate(items, page, pageSize));
    }

    if (method === "POST" && url.pathname === "/anamnesis") {
      const body = await readJson(req);
      return ok(res, requestId, 201, createAnamnesis(auth.user.id, String(body.patient_id), String(body.template_id), (body.content ?? {}) as Record<string, unknown>));
    }
    if (method === "GET" && url.pathname === "/anamnesis") return ok(res, requestId, 200, paginate(Array.from(db.anamnesis.values()).filter((x) => x.owner_user_id === auth.user.id), ...Object.values(parsePagination(url))));

    if (method === "POST" && url.pathname === "/scales/record") {
      const body = await readJson(req);
      return ok(res, requestId, 201, createScaleRecord(auth.user.id, String(body.scale_id), String(body.patient_id), Number(body.score ?? 0)));
    }
    if (method === "GET" && url.pathname === "/scales/records") return ok(res, requestId, 200, paginate(Array.from(db.scales.values()).filter((x) => x.owner_user_id === auth.user.id), ...Object.values(parsePagination(url))));

    if (method === "POST" && url.pathname === "/forms/entry") {
      const body = await readJson(req);
      return ok(res, requestId, 201, createFormEntry(auth.user.id, String(body.patient_id), String(body.form_id), (body.content ?? {}) as Record<string, unknown>));
    }
    if (method === "GET" && url.pathname === "/forms") return ok(res, requestId, 200, paginate(Array.from(db.forms.values()).filter((x) => x.owner_user_id === auth.user.id), ...Object.values(parsePagination(url))));

    if (method === "POST" && url.pathname === "/financial/entry") {
      const body = await readJson(req);
      return ok(res, requestId, 201, createFinancialEntry(auth.user.id, { patient_id: String(body.patient_id), type: body.type === "payable" ? "payable" : "receivable", amount: Number(body.amount), due_date: String(body.due_date), status: body.status === "paid" ? "paid" : "open", description: String(body.description ?? "") }));
    }
    if (method === "GET" && url.pathname === "/financial/entries") return ok(res, requestId, 200, paginate(Array.from(db.financial.values()).filter((x) => x.owner_user_id === auth.user.id), ...Object.values(parsePagination(url))));

    if (method === "POST" && (url.pathname === "/export/pdf" || url.pathname === "/export/docx")) {
      const job = createJob(auth.user.id, "export");
      void runJob(job.id, {});
      return ok(res, requestId, 202, { job_id: job.id, status: job.status });
    }

    if (method === "POST" && url.pathname === "/backup") {
      const job = createJob(auth.user.id, "backup");
      void runJob(job.id, {});
      return ok(res, requestId, 202, { job_id: job.id, status: job.status });
    }
    if (method === "POST" && url.pathname === "/restore") return ok(res, requestId, 202, { restored: true });
    if (method === "POST" && url.pathname === "/purge") {
      purgeUserData(auth.user.id);
      return ok(res, requestId, 202, { purged: true });
    }

    const jobById = url.pathname.match(/^\/jobs\/([^/]+)$/);
    if (method === "GET" && jobById) {
      const job = getJob(auth.user.id, jobById[1]);
      if (!job) return error(res, requestId, 404, "NOT_FOUND", "Job not found");
      return ok(res, requestId, 200, job);
    }

    if (method === "POST" && (url.pathname === "/api/webhook" || url.pathname === "/webhooks/transcriber")) {
      const body = await readJson(req);
      if (typeof body.job_id !== "string" || typeof body.status !== "string") return error(res, requestId, 422, "VALIDATION_ERROR", "job_id and status required");
      const updated = handleTranscriberWebhook(body.job_id, body.status as "queued" | "running" | "completed" | "failed", typeof body.error_code === "string" ? body.error_code : undefined);
      if (!updated) return error(res, requestId, 404, "NOT_FOUND", "Job not found");
      return ok(res, requestId, 202, { accepted: true });
    }

    if (method === "POST" && url.pathname === "/ai/organize") {
      const body = await readJson(req);
      return ok(res, requestId, 200, { structured_text: String(body.text ?? "").trim(), compliance: "Apenas organização textual. Sem diagnóstico ou conduta." });
    }

    return error(res, requestId, 404, "NOT_FOUND", "Route not found");
  } catch {
    addTelemetry({ user_id: tokenFrom(req) ? getUserFromToken(tokenFrom(req)!)?.id : undefined, event_type: "ERROR", route: url.pathname, status_code: 500, error_code: "BAD_REQUEST" });
    return error(res, requestId, 400, "BAD_REQUEST", "Invalid request payload");
  }
});
