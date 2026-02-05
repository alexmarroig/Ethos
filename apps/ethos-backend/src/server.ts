import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  acceptInvite,
  addAudit,
  addTelemetry,
  adminErrors,
  adminOverviewMetrics,
  adminSanitizedUsers,
  adminUserMetrics,
  createAnamnesis,
  createClinicalNoteDraft,
  createFinancialEntry,
  createFormEntry,
  createInvite,
  createReport,
  createScaleRecord,
  createSession,
  createTranscriptionJob,
  db,
  getClinicalNote,
  getReport,
  getSession,
  getTranscriptionJob,
  getUserFromSessionToken,
  listAnamnesis,
  listFinancialEntries,
  listForms,
  listReports,
  listScaleRecords,
  listScales,
  listSessionClinicalNotes,
  listSessions,
  login,
  logout,
  patchSessionStatus,
  purgeUserData,
  runTranscriptionJob,
  validateClinicalNote,
  addAudio,
} from "./store";
import type { Role, SessionStatus } from "./types";

type Json = Record<string, unknown>;

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 240;
const rateMap = new Map<string, { count: number; start: number }>();

const CLINICAL_ROUTES = [/^\/sessions/, /^\/clinical-notes/, /^\/reports/, /^\/anamnesis/, /^\/scales/, /^\/forms/, /^\/financial/, /^\/jobs/, /^\/backup/, /^\/restore/, /^\/purge/, /^\/export/];

const isClinicalPath = (p: string) => CLINICAL_ROUTES.some((r) => r.test(p));

const readJson = async (req: IncomingMessage): Promise<Json> => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  const text = Buffer.concat(chunks).toString("utf-8") || "{}";
  const parsed = JSON.parse(text) as Json;
  if (Object.keys(parsed).length > 100) throw new Error("PAYLOAD_TOO_COMPLEX");
  return parsed;
};

const send = (res: ServerResponse, statusCode: number, body: unknown) => {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
};

const parseToken = (req: IncomingMessage) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
};

const sanitizeLog = (method: string, route: string, statusCode: number, code: string, userId?: string) => {
  process.stdout.write(`${JSON.stringify({ level: statusCode >= 500 ? "error" : "info", method, route, statusCode, code, user_id: userId, ts: new Date().toISOString() })}\n`);
};

const requireAuth = (req: IncomingMessage, res: ServerResponse) => {
  const token = parseToken(req);
  if (!token) {
    send(res, 401, { error: "Unauthorized", code: "UNAUTHORIZED" });
    return null;
  }
  const user = getUserFromSessionToken(token);
  if (!user || user.status !== "active") {
    send(res, 401, { error: "Unauthorized", code: "UNAUTHORIZED" });
    return null;
  }
  return { token, user };
};

const requireRole = (role: Role, req: IncomingMessage, res: ServerResponse) => {
  const auth = requireAuth(req, res);
  if (!auth) return null;
  if (auth.user.role !== role) {
    send(res, 403, { error: "Forbidden", code: "FORBIDDEN" });
    return null;
  }
  return auth;
};

const enforceRateLimit = (req: IncomingMessage, res: ServerResponse) => {
  const ip = req.socket.remoteAddress ?? "local";
  const current = rateMap.get(ip);
  const now = Date.now();
  if (!current || now - current.start > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, start: now });
    return true;
  }
  current.count += 1;
  if (current.count > RATE_MAX) {
    send(res, 429, { error: "Too many requests", code: "RATE_LIMITED" });
    return false;
  }
  return true;
};

const openApiPath = path.resolve(__dirname, "../openapi.yaml");
const openApi = readFileSync(openApiPath, "utf-8");

export const createEthosBackend = () =>
  createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const pathUrl = req.url ?? "/";

    if (!enforceRateLimit(req, res)) return;

    try {
      if (method === "GET" && pathUrl === "/openapi.yaml") {
        res.statusCode = 200;
        res.setHeader("content-type", "application/yaml");
        res.end(openApi);
        return;
      }

      if (method === "POST" && pathUrl === "/auth/invite") {
        const auth = requireRole("admin", req, res);
        if (!auth) return;
        const body = await readJson(req);
        if (typeof body.email !== "string" || !body.email.includes("@")) return send(res, 422, { error: "Invalid email", code: "VALIDATION_ERROR" });
        const { invite, rawToken } = createInvite(body.email);
        addAudit(auth.user.id, "INVITE_CREATED");
        return send(res, 201, { invite_id: invite.id, email: invite.email, expires_at: invite.expires_at, invite_token: rawToken });
      }

      if (method === "POST" && pathUrl === "/auth/accept-invite") {
        const body = await readJson(req);
        if (typeof body.token !== "string" || typeof body.name !== "string" || typeof body.password !== "string") return send(res, 422, { error: "Invalid payload", code: "VALIDATION_ERROR" });
        const user = acceptInvite(body.token, body.name, body.password);
        if (!user) return send(res, 400, { error: "Invalid invite token", code: "INVALID_INVITE" });
        addAudit(user.id, "INVITE_ACCEPTED", user.id);
        return send(res, 201, { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status });
      }

      if (method === "POST" && pathUrl === "/auth/login") {
        const body = await readJson(req);
        if (typeof body.email !== "string" || typeof body.password !== "string") return send(res, 422, { error: "Invalid payload", code: "VALIDATION_ERROR" });
        const logged = login(body.email, body.password);
        if (!logged) return send(res, 401, { error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
        return send(res, 200, { token: logged.token, user: { id: logged.user.id, email: logged.user.email, name: logged.user.name, role: logged.user.role } });
      }

      if (method === "POST" && pathUrl === "/auth/logout") {
        const auth = requireAuth(req, res);
        if (!auth) return;
        logout(auth.token);
        return send(res, 200, { ok: true });
      }

      if (method === "GET" && pathUrl === "/me") {
        const auth = requireAuth(req, res);
        if (!auth) return;
        return send(res, 200, { id: auth.user.id, email: auth.user.email, name: auth.user.name, role: auth.user.role, status: auth.user.status });
      }

      if (method === "PATCH" && pathUrl === "/me") {
        const auth = requireAuth(req, res);
        if (!auth) return;
        const body = await readJson(req);
        if (typeof body.name === "string") auth.user.name = body.name;
        return send(res, 200, { id: auth.user.id, email: auth.user.email, name: auth.user.name, role: auth.user.role, status: auth.user.status });
      }

      if (method === "GET" && pathUrl === "/contracts") {
        return send(res, 200, {
          openapi: "/openapi.yaml",
          routes: openApi.split("\n").filter((line) => /^\s{2}\/[a-z]/.test(line)).map((line) => line.trim().replace(":", "")),
          error_codes: ["UNAUTHORIZED", "FORBIDDEN", "VALIDATION_ERROR", "NOT_FOUND", "RATE_LIMITED", "INVALID_INVITE", "INVALID_CREDENTIALS"],
        });
      }

      const adminUsersById = pathUrl.match(/^\/admin\/users\/([^/]+)$/);
      if (method === "GET" && pathUrl === "/admin/users") {
        const auth = requireRole("admin", req, res);
        if (!auth) return;
        return send(res, 200, adminSanitizedUsers());
      }
      if (method === "GET" && adminUsersById) {
        const auth = requireRole("admin", req, res);
        if (!auth) return;
        const user = db.users.get(adminUsersById[1]);
        if (!user) return send(res, 404, { error: "User not found", code: "NOT_FOUND" });
        return send(res, 200, { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, created_at: user.created_at, last_seen_at: user.last_seen_at });
      }
      if (method === "PATCH" && adminUsersById) {
        const auth = requireRole("admin", req, res);
        if (!auth) return;
        const target = db.users.get(adminUsersById[1]);
        if (!target) return send(res, 404, { error: "User not found", code: "NOT_FOUND" });
        const body = await readJson(req);
        if (body.status === "active" || body.status === "invited" || body.status === "disabled") target.status = body.status;
        if (body.role === "user" || body.role === "admin") target.role = body.role;
        addAudit(auth.user.id, "ADMIN_USER_PATCHED", target.id);
        return send(res, 200, { id: target.id, role: target.role, status: target.status });
      }

      const adminUsersDisable = pathUrl.match(/^\/admin\/users\/([^/]+)\/(disable|enable)$/);
      if (method === "POST" && adminUsersDisable) {
        const auth = requireRole("admin", req, res);
        if (!auth) return;
        const target = db.users.get(adminUsersDisable[1]);
        if (!target) return send(res, 404, { error: "User not found", code: "NOT_FOUND" });
        target.status = adminUsersDisable[2] === "disable" ? "disabled" : "active";
        addAudit(auth.user.id, `ADMIN_USER_${adminUsersDisable[2].toUpperCase()}D`, target.id);
        return send(res, 200, { id: target.id, status: target.status });
      }

      if (method === "GET" && pathUrl === "/admin/metrics/overview") {
        const auth = requireRole("admin", req, res);
        if (!auth) return;
        return send(res, 200, adminOverviewMetrics());
      }

      if (method === "GET" && pathUrl.startsWith("/admin/metrics/user-usage")) {
        const auth = requireRole("admin", req, res);
        if (!auth) return;
        const url = new URL(pathUrl, "http://localhost");
        const userId = url.searchParams.get("user_id");
        if (!userId) return send(res, 422, { error: "user_id required", code: "VALIDATION_ERROR" });
        return send(res, 200, adminUserMetrics(userId, url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined));
      }

      if (method === "GET" && pathUrl === "/admin/metrics/errors") {
        const auth = requireRole("admin", req, res);
        if (!auth) return;
        return send(res, 200, adminErrors().map((e) => ({ user_id: e.user_id, event_type: e.event_type, ts: e.ts, error_code: e.error_code })));
      }

      if (method === "GET" && pathUrl === "/admin/audit") {
        const auth = requireRole("admin", req, res);
        if (!auth) return;
        return send(res, 200, Array.from(db.audit.values()));
      }

      const auth = requireAuth(req, res);
      if (!auth) return;
      if (auth.user.role === "admin" && isClinicalPath(pathUrl)) {
        return send(res, 403, { error: "Admin cannot access clinical content", code: "FORBIDDEN" });
      }

      if (method === "POST" && pathUrl === "/sessions") {
        const body = await readJson(req);
        if (typeof body.patient_id !== "string" || typeof body.scheduled_at !== "string") return send(res, 422, { error: "Invalid payload", code: "VALIDATION_ERROR" });
        const session = createSession(auth.user.id, body.patient_id, body.scheduled_at);
        addTelemetry(auth.user.id, "SESSION_CREATED");
        return send(res, 201, session);
      }
      if (method === "GET" && pathUrl === "/sessions") return send(res, 200, listSessions(auth.user.id));

      const sessionById = pathUrl.match(/^\/sessions\/([^/]+)$/);
      if (method === "GET" && sessionById) {
        const session = getSession(auth.user.id, sessionById[1]);
        if (!session) return send(res, 404, { error: "Session not found", code: "NOT_FOUND" });
        return send(res, 200, session);
      }

      const sessionStatus = pathUrl.match(/^\/sessions\/([^/]+)\/status$/);
      if (method === "PATCH" && sessionStatus) {
        const body = await readJson(req);
        const status = body.status as SessionStatus;
        if (!["scheduled", "confirmed", "missed", "completed"].includes(status)) return send(res, 422, { error: "Invalid status", code: "VALIDATION_ERROR" });
        const patched = patchSessionStatus(auth.user.id, sessionStatus[1], status);
        if (!patched) return send(res, 404, { error: "Session not found", code: "NOT_FOUND" });
        return send(res, 200, patched);
      }

      const sessionAudio = pathUrl.match(/^\/sessions\/([^/]+)\/audio$/);
      if (method === "POST" && sessionAudio) {
        const body = await readJson(req);
        if (!body.consent_confirmed) return send(res, 422, { error: "Consent required", code: "CONSENT_REQUIRED" });
        const session = getSession(auth.user.id, sessionAudio[1]);
        if (!session) return send(res, 404, { error: "Session not found", code: "NOT_FOUND" });
        const record = addAudio(auth.user.id, session.id, String(body.file_path ?? "vault://audio.enc"), true);
        addTelemetry(auth.user.id, "AUDIO_UPLOADED");
        return send(res, 201, record);
      }

      const sessionTranscribe = pathUrl.match(/^\/sessions\/([^/]+)\/transcribe$/);
      if (method === "POST" && sessionTranscribe) {
        const body = await readJson(req);
        const session = getSession(auth.user.id, sessionTranscribe[1]);
        if (!session) return send(res, 404, { error: "Session not found", code: "NOT_FOUND" });
        const job = createTranscriptionJob(auth.user.id, session.id);
        void runTranscriptionJob(job.id, String(body.raw_text ?? ""));
        return send(res, 202, { job_id: job.id, status: job.status });
      }

      const jobsById = pathUrl.match(/^\/jobs\/([^/]+)$/);
      if (method === "GET" && jobsById) {
        const job = getTranscriptionJob(auth.user.id, jobsById[1]);
        if (!job) return send(res, 404, { error: "Job not found", code: "NOT_FOUND" });
        return send(res, 200, { id: job.id, status: job.status, progress: job.progress, error_code: job.error_code });
      }

      const sessionClinicalNotes = pathUrl.match(/^\/sessions\/([^/]+)\/clinical-notes$/);
      if (method === "GET" && sessionClinicalNotes) return send(res, 200, listSessionClinicalNotes(auth.user.id, sessionClinicalNotes[1]));

      const noteCreate = pathUrl.match(/^\/sessions\/([^/]+)\/clinical-note$/);
      if (method === "POST" && noteCreate) {
        const body = await readJson(req);
        const session = getSession(auth.user.id, noteCreate[1]);
        if (!session) return send(res, 404, { error: "Session not found", code: "NOT_FOUND" });
        const note = createClinicalNoteDraft(auth.user.id, session.id, String(body.content ?? ""));
        addTelemetry(auth.user.id, "NOTE_GENERATED");
        return send(res, 201, note);
      }

      const noteById = pathUrl.match(/^\/clinical-notes\/([^/]+)$/);
      if (method === "GET" && noteById) {
        const note = getClinicalNote(auth.user.id, noteById[1]);
        if (!note) return send(res, 404, { error: "Clinical note not found", code: "NOT_FOUND" });
        return send(res, 200, note);
      }

      const noteValidate = pathUrl.match(/^\/clinical-notes\/([^/]+)\/validate$/);
      if (method === "POST" && noteValidate) {
        const note = validateClinicalNote(auth.user.id, noteValidate[1]);
        if (!note) return send(res, 404, { error: "Clinical note not found", code: "NOT_FOUND" });
        addTelemetry(auth.user.id, "NOTE_VALIDATED");
        return send(res, 200, note);
      }

      if (method === "POST" && pathUrl === "/reports") {
        const body = await readJson(req);
        const report = createReport(auth.user.id, String(body.patient_id), body.purpose as never, String(body.content ?? ""));
        if (!report) return send(res, 422, { error: "Validated note required", code: "VALIDATED_NOTE_REQUIRED" });
        addTelemetry(auth.user.id, "REPORT_CREATED");
        return send(res, 201, report);
      }
      if (method === "GET" && pathUrl === "/reports") return send(res, 200, listReports(auth.user.id));

      const reportById = pathUrl.match(/^\/reports\/([^/]+)$/);
      if (method === "GET" && reportById) {
        const report = getReport(auth.user.id, reportById[1]);
        if (!report) return send(res, 404, { error: "Report not found", code: "NOT_FOUND" });
        return send(res, 200, report);
      }

      if (method === "POST" && pathUrl === "/anamnesis") {
        const body = await readJson(req);
        return send(res, 201, createAnamnesis(auth.user.id, String(body.patient_id), String(body.template_id), (body.content as Json) ?? {}));
      }
      if (method === "GET" && pathUrl === "/anamnesis") return send(res, 200, listAnamnesis(auth.user.id));

      if (method === "POST" && pathUrl === "/scales/record") {
        const body = await readJson(req);
        return send(res, 201, createScaleRecord(auth.user.id, String(body.scale_id), String(body.patient_id), Number(body.score)));
      }
      if (method === "GET" && pathUrl === "/scales") return send(res, 200, listScales(auth.user.id));
      if (method === "GET" && pathUrl.startsWith("/scales/records")) {
        const url = new URL(pathUrl, "http://localhost");
        return send(res, 200, listScaleRecords(auth.user.id, url.searchParams.get("patient_id") ?? undefined));
      }

      if (method === "POST" && pathUrl === "/forms/entry") {
        const body = await readJson(req);
        const entry = createFormEntry(auth.user.id, String(body.patient_id), String(body.form_id), (body.content as Json) ?? {});
        return send(res, 201, { ...entry, note: "Não integrado automaticamente ao prontuário." });
      }
      if (method === "GET" && pathUrl === "/forms") return send(res, 200, listForms(auth.user.id));

      if (method === "POST" && pathUrl === "/financial/entry") {
        const body = await readJson(req);
        return send(res, 201, createFinancialEntry(auth.user.id, {
          patient_id: String(body.patient_id),
          type: (body.type === "payable" ? "payable" : "receivable"),
          amount: Number(body.amount),
          due_date: String(body.due_date),
          status: body.status === "paid" ? "paid" : "open",
          description: String(body.description ?? ""),
        }));
      }
      if (method === "GET" && pathUrl === "/financial/entries") return send(res, 200, listFinancialEntries(auth.user.id));
      if (method === "POST" && pathUrl === "/financial/reminder") {
        const body = await readJson(req);
        return send(res, 200, { reminder_text: `Lembrete amigável: pagamento de ${body.amount} vence em ${body.due_date}.`, sent: false });
      }

      if (method === "POST" && pathUrl === "/export/pdf") {
        addTelemetry(auth.user.id, "EXPORT_PDF");
        return send(res, 202, { file_path: "vault://exports/clinical.pdf" });
      }
      if (method === "POST" && pathUrl === "/export/docx") return send(res, 202, { file_path: "vault://exports/clinical.docx" });
      if (method === "POST" && pathUrl === "/backup") {
        addTelemetry(auth.user.id, "BACKUP");
        return send(res, 202, { backup_path: `vault://backup/${auth.user.id}.enc` });
      }
      if (method === "POST" && pathUrl === "/restore") {
        addTelemetry(auth.user.id, "RESTORE");
        return send(res, 202, { restored: true });
      }
      if (method === "POST" && pathUrl === "/purge") {
        purgeUserData(auth.user.id);
        return send(res, 202, { purged: true });
      }

      if (method === "POST" && pathUrl === "/ai/organize") {
        const body = await readJson(req);
        return send(res, 200, { structured_text: String(body.text ?? "").trim(), compliance: "Apenas organização textual. Sem diagnóstico ou conduta." });
      }

      if (method === "POST" && pathUrl === "/api/webhook") {
        const body = await readJson(req);
        if (typeof body.user_id !== "string" || typeof body.event_type !== "string") return send(res, 422, { error: "Invalid payload", code: "VALIDATION_ERROR" });
        const eventType = body.event_type as Parameters<typeof addTelemetry>[1];
        addTelemetry(body.user_id, eventType, typeof body.duration_ms === "number" ? body.duration_ms : undefined, typeof body.error_code === "string" ? body.error_code : undefined);
        return send(res, 202, { accepted: true });
      }

      sanitizeLog(method, pathUrl, 404, "NOT_FOUND", auth.user.id);
      return send(res, 404, { error: "Not Found", code: "NOT_FOUND" });
    } catch (error) {
      const routeUser = parseToken(req);
      const user = routeUser ? getUserFromSessionToken(routeUser) : null;
      if (user) addTelemetry(user.id, "ERROR", undefined, "INTERNAL_ERROR");
      sanitizeLog(method, pathUrl, 400, error instanceof Error ? error.message : "BAD_REQUEST", user?.id);
      return send(res, 400, { error: "Invalid request", code: "BAD_REQUEST" });
    }
  });
