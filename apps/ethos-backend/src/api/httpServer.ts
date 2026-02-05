import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import {
  acceptInvite,
  addAudit,
  addAudio,
  addTelemetry,
  adminOverviewMetrics,
  canUseFeature,
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
  getClinicalNote,
  getJob,
  getUserFromToken,
  handleTranscriberWebhook,
  listPatients,
  listScales,
  listSessionClinicalNotes,
  login,
  logout,
  paginate,
  patchSessionStatus,
  purgeUserData,
  resolveLocalEntitlements,
  runJob,
  syncLocalEntitlements,
  validateClinicalNote,
} from "../application/service";
import type { ApiEnvelope, ApiError, Role, SessionStatus } from "../domain/types";
import { db } from "../infra/database";

const openApi = readFileSync(path.resolve(__dirname, "../../openapi.yaml"), "utf-8");
const CLINICAL_PATHS = [/^\/sessions/, /^\/clinical-notes/, /^\/reports/, /^\/anamnesis/, /^\/scales/, /^\/forms/, /^\/financial/, /^\/jobs/, /^\/export/, /^\/backup/, /^\/restore/, /^\/purge/];

const readJson = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
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
  const payload: ApiEnvelope<T> = { request_id: requestId, data };
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
};

const tokenFrom = (req: IncomingMessage) => req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;

const requireAuth = (req: IncomingMessage, res: ServerResponse, requestId: string, role?: Role) => {
  const token = tokenFrom(req);
  if (!token) return error(res, requestId, 401, "UNAUTHORIZED", "Missing bearer token"), null;
  const user = getUserFromToken(token);
  if (!user || user.status !== "active") return error(res, requestId, 401, "UNAUTHORIZED", "Invalid session"), null;
  if (role && user.role !== role) return error(res, requestId, 403, "FORBIDDEN", "Missing permission"), null;
  return { token, user };
};

const parsePagination = (url: URL) => ({
  page: Number(url.searchParams.get("page") ?? 1),
  pageSize: Number(url.searchParams.get("page_size") ?? 20),
});

export const createEthosBackend = () => createServer(async (req, res) => {
  const requestId = crypto.randomUUID();
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://localhost");

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
      });
    }

    if (method === "POST" && url.pathname === "/auth/login") {
      const body = await readJson(req);
      const session = login(String(body.email ?? ""), String(body.password ?? ""));
      if (!session) return error(res, requestId, 401, "UNAUTHORIZED", "Invalid credentials");
      return ok(res, requestId, 200, { user: session.user, token: session.token });
    }

    if (method === "POST" && url.pathname === "/auth/invite") {
      const auth = requireAuth(req, res, requestId, "admin");
      if (!auth) return;
      const body = await readJson(req);
      if (typeof body.email !== "string" || !body.email.includes("@")) return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid email");
      const { invite, token } = createInvite(body.email);
      addAudit(auth.user.id, "INVITE_CREATED");
      return ok(res, requestId, 201, { invite_id: invite.id, invite_token: token, expires_at: invite.expires_at });
    }

    if (method === "POST" && url.pathname === "/auth/accept-invite") {
      const body = await readJson(req);
      const user = acceptInvite(String(body.token ?? ""), String(body.name ?? ""), String(body.password ?? ""));
      if (!user) return error(res, requestId, 422, "INVITE_INVALID", "Invite invalid or expired");
      return ok(res, requestId, 201, user);
    }

    if (method === "POST" && url.pathname === "/auth/logout") {
      const auth = requireAuth(req, res, requestId);
      if (!auth) return;
      logout(auth.token);
      return ok(res, requestId, 200, { success: true });
    }

    const auth = requireAuth(req, res, requestId);
    if (!auth) return;
    const isClinicalPath = CLINICAL_PATHS.some((pattern) => pattern.test(url.pathname));
    if (isClinicalPath && auth.user.role !== "user") return error(res, requestId, 403, "FORBIDDEN", "Clinical routes are user-only");

    if (method === "POST" && url.pathname === "/local/entitlements/sync") {
      const body = await readJson(req);
      const snapshot = (body.snapshot ?? {}) as Parameters<typeof syncLocalEntitlements>[1];
      return ok(res, requestId, 200, syncLocalEntitlements(auth.user.id, snapshot));
    }

    if (method === "GET" && url.pathname === "/local/entitlements") {
      return ok(res, requestId, 200, resolveLocalEntitlements(auth.user.id));
    }

    const idemKey = req.headers["idempotency-key"]?.toString();
    if (method === "POST" && url.pathname === "/sessions" && idemKey) {
      const existing = db.idempotency.get(idemKey);
      if (existing) return ok(res, requestId, existing.statusCode, existing.body);
    }

    if (method === "POST" && url.pathname === "/sessions") {
      if (!canUseFeature(auth.user.id, "new_session")) return error(res, requestId, 402, "ENTITLEMENT_BLOCK", "Subscription required to create new sessions");
      const body = await readJson(req);
      if (typeof body.patient_id !== "string" || typeof body.scheduled_at !== "string") return error(res, requestId, 422, "VALIDATION_ERROR", "patient_id and scheduled_at required");
      const session = createSession(auth.user.id, body.patient_id, body.scheduled_at);
      if (idemKey) db.idempotency.set(idemKey, { statusCode: 201, body: session, createdAt: new Date().toISOString() });
      return ok(res, requestId, 201, session);
    }

    if (method === "GET" && url.pathname === "/sessions") {
      const { page, pageSize } = parsePagination(url);
      const items = Array.from(db.sessions.values()).filter((item) => item.owner_user_id === auth.user.id);
      return ok(res, requestId, 200, paginate(items, page, pageSize));
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

    const sessionAudio = url.pathname.match(/^\/sessions\/([^/]+)\/audio$/);
    if (method === "POST" && sessionAudio) {
      const body = await readJson(req);
      if (body.consent_confirmed !== true) return error(res, requestId, 422, "CONSENT_REQUIRED", "Explicit consent is required");
      if (!getByOwner(db.sessions, auth.user.id, sessionAudio[1])) return error(res, requestId, 404, "NOT_FOUND", "Session not found");
      return ok(res, requestId, 201, addAudio(auth.user.id, sessionAudio[1], String(body.file_path ?? "vault://audio.enc")));
    }

    const sessionTranscribe = url.pathname.match(/^\/sessions\/([^/]+)\/transcribe$/);
    if (method === "POST" && sessionTranscribe) {
      if (!canUseFeature(auth.user.id, "transcription")) return error(res, requestId, 402, "ENTITLEMENT_BLOCK", "Transcription unavailable for this subscription");
      if (!getByOwner(db.sessions, auth.user.id, sessionTranscribe[1])) return error(res, requestId, 404, "NOT_FOUND", "Session not found");
      const body = await readJson(req);
      const job = createJob(auth.user.id, "transcription", sessionTranscribe[1]);
      void runJob(job.id, { rawText: String(body.raw_text ?? "") });
      return ok(res, requestId, 202, { job_id: job.id, status: job.status });
    }

    const noteCreate = url.pathname.match(/^\/sessions\/([^/]+)\/clinical-note$/);
    if (method === "POST" && noteCreate) {
      const body = await readJson(req);
      if (typeof body.content !== "string") return error(res, requestId, 422, "VALIDATION_ERROR", "content required");
      return ok(res, requestId, 201, createClinicalNoteDraft(auth.user.id, noteCreate[1], body.content));
    }

    const noteValidate = url.pathname.match(/^\/clinical-notes\/([^/]+)\/validate$/);
    if (method === "POST" && noteValidate) {
      const note = validateClinicalNote(auth.user.id, noteValidate[1]);
      if (!note) return error(res, requestId, 404, "NOT_FOUND", "Clinical note not found");
      return ok(res, requestId, 200, note);
    }

    const noteById = url.pathname.match(/^\/clinical-notes\/([^/]+)$/);
    if (method === "GET" && noteById) {
      const note = getClinicalNote(auth.user.id, noteById[1]);
      if (!note) return error(res, requestId, 404, "NOT_FOUND", "Clinical note not found");
      return ok(res, requestId, 200, note);
    }

    const sessionNotes = url.pathname.match(/^\/sessions\/([^/]+)\/clinical-notes$/);
    if (method === "GET" && sessionNotes) {
      const { page, pageSize } = parsePagination(url);
      return ok(res, requestId, 200, paginate(listSessionClinicalNotes(auth.user.id, sessionNotes[1]), page, pageSize));
    }

    if (method === "POST" && url.pathname === "/reports") {
      const body = await readJson(req);
      const report = createReport(auth.user.id, String(body.patient_id ?? ""), String(body.purpose ?? "profissional") as "instituição" | "profissional" | "paciente", String(body.content ?? ""));
      if (!report) return error(res, requestId, 422, "VALIDATED_NOTE_REQUIRED", "A validated note is required before creating reports");
      return ok(res, requestId, 201, report);
    }

    if (method === "GET" && url.pathname === "/reports") {
      const { page, pageSize } = parsePagination(url);
      const items = Array.from(db.reports.values()).filter((item) => item.owner_user_id === auth.user.id);
      return ok(res, requestId, 200, paginate(items, page, pageSize));
    }

    if (method === "POST" && url.pathname === "/anamnesis") {
      const body = await readJson(req);
      return ok(res, requestId, 201, createAnamnesis(auth.user.id, String(body.patient_id ?? ""), String(body.template_id ?? "default"), (body.content as Record<string, unknown>) ?? {}));
    }

    if (method === "GET" && url.pathname === "/anamnesis") {
      const { page, pageSize } = parsePagination(url);
      const items = Array.from(db.anamnesis.values()).filter((item) => item.owner_user_id === auth.user.id);
      return ok(res, requestId, 200, paginate(items, page, pageSize));
    }

    if (method === "GET" && url.pathname === "/scales") return ok(res, requestId, 200, listScales());

    if (method === "POST" && url.pathname === "/scales/record") {
      const body = await readJson(req);
      return ok(res, requestId, 201, createScaleRecord(auth.user.id, String(body.scale_id ?? ""), String(body.patient_id ?? ""), Number(body.score ?? 0)));
    }

    if (method === "GET" && url.pathname === "/scales/records") {
      const { page, pageSize } = parsePagination(url);
      const items = Array.from(db.scales.values()).filter((item) => item.owner_user_id === auth.user.id);
      return ok(res, requestId, 200, paginate(items, page, pageSize));
    }

    if (method === "POST" && url.pathname === "/forms/entry") {
      const body = await readJson(req);
      return ok(res, requestId, 201, createFormEntry(auth.user.id, String(body.patient_id ?? ""), String(body.form_id ?? ""), (body.content as Record<string, unknown>) ?? {}));
    }

    if (method === "GET" && url.pathname === "/forms") {
      const { page, pageSize } = parsePagination(url);
      const items = Array.from(db.forms.values()).filter((item) => item.owner_user_id === auth.user.id);
      return ok(res, requestId, 200, paginate(items, page, pageSize));
    }

    if (method === "POST" && url.pathname === "/financial/entry") {
      const body = await readJson(req);
      return ok(res, requestId, 201, createFinancialEntry(auth.user.id, {
        patient_id: String(body.patient_id ?? ""),
        type: (body.type as "receivable" | "payable") ?? "receivable",
        amount: Number(body.amount ?? 0),
        due_date: String(body.due_date ?? new Date().toISOString()),
        status: "open",
        description: String(body.description ?? ""),
      }));
    }

    if (method === "GET" && url.pathname === "/financial/entries") {
      const { page, pageSize } = parsePagination(url);
      const items = Array.from(db.financial.values()).filter((item) => item.owner_user_id === auth.user.id);
      return ok(res, requestId, 200, paginate(items, page, pageSize));
    }

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

    if (method === "POST" && url.pathname === "/restore") {
      return ok(res, requestId, 202, { accepted: true });
    }

    if (method === "POST" && url.pathname === "/purge") {
      purgeUserData(auth.user.id);
      return ok(res, requestId, 202, { accepted: true });
    }

    const jobById = url.pathname.match(/^\/jobs\/([^/]+)$/);
    if (method === "GET" && jobById) {
      const job = getJob(auth.user.id, jobById[1]);
      if (!job) return error(res, requestId, 404, "NOT_FOUND", "Job not found");
      return ok(res, requestId, 200, job);
    }

    if (method === "POST" && (url.pathname === "/api/webhook" || url.pathname === "/webhooks/transcriber")) {
      const body = await readJson(req);
      const updated = handleTranscriberWebhook(String(body.job_id ?? ""), String(body.status ?? "failed") as any, typeof body.error_code === "string" ? body.error_code : undefined);
      if (!updated) return error(res, requestId, 404, "NOT_FOUND", "Job not found");
      return ok(res, requestId, 202, { accepted: true });
    }

    if (method === "GET" && url.pathname === "/patients") return ok(res, requestId, 200, listPatients(auth.user.id));

    if (method === "POST" && url.pathname === "/ai/organize") {
      const body = await readJson(req);
      const text = String(body.text ?? "").trim();
      return ok(res, requestId, 200, { summary: text, tokens_estimate: text.split(/\s+/).filter(Boolean).length });
    }

    if (method === "GET" && url.pathname === "/admin/metrics/overview") {
      if (auth.user.role !== "admin") return error(res, requestId, 403, "FORBIDDEN", "Missing permission");
      return ok(res, requestId, 200, adminOverviewMetrics());
    }

    if (method === "GET" && url.pathname === "/admin/audit") {
      if (auth.user.role !== "admin") return error(res, requestId, 403, "FORBIDDEN", "Missing permission");
      return ok(res, requestId, 200, Array.from(db.audit.values()));
    }

    return error(res, requestId, 404, "NOT_FOUND", "Route not found");
  } catch (err) {
    addTelemetry({ user_id: authUserId(req), event_type: "HTTP_ERROR", route: url.pathname, status_code: 500, error_code: (err as Error).name });
    return error(res, requestId, 500, "INTERNAL_ERROR", "Unexpected server error");
  }
});

const authUserId = (req: IncomingMessage) => {
  const token = tokenFrom(req);
  if (!token) return undefined;
  return getUserFromToken(token)?.id;
};
