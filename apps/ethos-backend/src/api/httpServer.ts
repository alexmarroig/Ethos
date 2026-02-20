import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import {
  acceptInvite,
  acceptContract,
  addAudit,
  addAudio,
  addDocumentVersion,
  addTelemetry,
  adminOverviewMetrics,
  canUseFeature,
  closeCase,
  confirmPatientSession,
  createAnamnesis,
  createAnonymizedCase,
  createClinicalNoteDraft,
  createContract,
  createDocument,
  createFinancialEntry,
  createFormEntry,
  createInvite,
  createJob,
  createPatientAccess,
  createPrivateComment,
  createReport,
  createScaleRecord,
  createSession,
  createTemplate,
  deleteTemplate,
  evaluateObservability,
  exportCase,
  exportContract,
  getByOwner,
  getClinicalNote,
  getContract,
  getContractByPortalToken,
  getJob,
  getPatient,
  getPatientAccessForUser,
  getRetentionPolicy,
  getTemplate,
  getUserFromToken,
  handleTranscriberWebhook,
  ingestErrorLog,
  ingestPerformanceSample,
  listAnonymizedCases,
  listContracts,
  listDocumentTemplates,
  listDocumentsByCase,
  listDocumentVersions,
  listObservabilityAlerts,
  listPatientSessions,
  listPatients,
  listPrivateComments,
  listScales,
  listSessionClinicalNotes,
  listTemplates,
  login,
  logout,
  paginate,
  patchSessionStatus,
  purgeUserData,
  recordPatientDiaryEntry,
  recordPatientScale,
  recordProntuarioAudit,
  renderTemplate,
  resolveLocalEntitlements,
  runJob,
  sendContract,
  sendPatientAsyncMessage,
  syncLocalEntitlements,
  updateRetentionPolicy,
  updateTemplate,
  validateClinicalNote,
} from "../application/service";
import {
  createNotificationTemplate,
  dispatchDueNotifications,
  grantNotificationConsent,
  listNotificationLogs,
  listNotificationSchedules,
  listNotificationTemplates,
  scheduleNotification,
} from "../application/notifications";
import type { ApiEnvelope, ApiError, NotificationChannel, Role, SessionStatus } from "../domain/types";
import { db, getIdempotencyEntry, setIdempotencyEntry } from "../infra/database";
import { parseAllowedOrigins } from "./cors";

const openApiPath = path.resolve(__dirname, "../../openapi.yaml");
const openApi = existsSync(openApiPath) ? readFileSync(openApiPath, "utf-8") : "openapi: 3.0.0\ninfo:\n  title: Ethos Clinic API\n  version: 0.0.0";

const allowedMethods = "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD";
const allowedHeaders = "Authorization,Content-Type,Idempotency-Key";

// ✅ Correção importante: “user” (psicólogo) precisa ser clínico.
const CLINICAL_ROLES: Role[] = ["user", "assistente", "supervisor"];

const CLINICAL_PATHS = [
  /^\/(sessions|cases)/,
  /^\/clinical-notes/,
  /^\/reports/,
  /^\/anamnesis/,
  /^\/scales/,
  /^\/forms/,
  /^\/financial/,
  /^\/documents/,
  /^\/document-templates/,
  /^\/jobs/,
  /^\/notifications/,
  /^\/export/,
  /^\/backup/,
  /^\/restore/,
  /^\/purge/,
  /^\/retention-policy/,
  /^\/contracts/,
  /^\/templates/,
];

class BadRequestError extends Error {
  readonly statusCode = 400;
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

const jsonHeaders = (res: ServerResponse, requestId: string) => {
  res.setHeader("content-type", "application/json");
  res.setHeader("x-request-id", requestId);
  res.setHeader("cache-control", "no-store");
};

const error = (res: ServerResponse, requestId: string, status: number, code: string, message: string) => {
  const payload: ApiError = { request_id: requestId, error: { code, message } };
  res.statusCode = status;
  jsonHeaders(res, requestId);
  res.end(JSON.stringify(payload));
};

const ok = <T>(res: ServerResponse, requestId: string, status: number, data: T) => {
  const payload: ApiEnvelope<T> = { request_id: requestId, data };
  res.statusCode = status;
  jsonHeaders(res, requestId);
  res.end(JSON.stringify(payload));
};

const tokenFrom = (req: IncomingMessage) =>
  req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;

const authUserId = (req: IncomingMessage) => {
  const token = tokenFrom(req);
  if (!token) return undefined;
  return getUserFromToken(token)?.id;
};

const getRemoteIp = (req: IncomingMessage) => {
  const forwarded = req.headers["x-forwarded-for"]?.toString();
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.socket.remoteAddress ?? "unknown";
};

const readJson = async (req: IncomingMessage) => {
  const contentType = req.headers["content-type"]?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new BadRequestError("INVALID_JSON", "Expected 'content-type: application/json'");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8").trim();

  if (!raw) {
    throw new BadRequestError("INVALID_JSON", "Request body must be a valid JSON object");
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new BadRequestError("INVALID_JSON", "Request body must be a valid JSON object");
  }
};

const readText = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
};

const requireAuth = (req: IncomingMessage, res: ServerResponse, requestId: string) => {
  const token = tokenFrom(req);
  if (!token) return error(res, requestId, 401, "UNAUTHORIZED", "Missing bearer token"), null;
  const user = getUserFromToken(token);
  if (!user || user.status !== "active") return error(res, requestId, 401, "UNAUTHORIZED", "Invalid session"), null;
  return { token, user };
};

const requireRole = (res: ServerResponse, requestId: string, role: Role, userRole: Role) => {
  if (userRole !== role) {
    error(res, requestId, 403, "FORBIDDEN", "Missing permission");
    return false;
  }
  return true;
};

const requireAnyRole = (res: ServerResponse, requestId: string, allowed: Role[], userRole: Role, msg?: string) => {
  if (!allowed.includes(userRole)) {
    error(res, requestId, 403, "FORBIDDEN", msg ?? "Missing permission");
    return false;
  }
  return true;
};

const requireClinicalAccess = (res: ServerResponse, requestId: string, userRole: Role) => {
  return requireAnyRole(res, requestId, CLINICAL_ROLES, userRole, "Clinical routes are restricted to clinical roles");
};

const requirePatientAccess = (res: ServerResponse, requestId: string, patientUserId: string) => {
  const access = getPatientAccessForUser(patientUserId);
  if (!access) {
    error(res, requestId, 403, "FORBIDDEN", "Patient access not configured");
    return null;
  }
  return access;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const parsePagination = (url: URL) => {
  const pageParam = url.searchParams.get("page");
  const pageSizeParam = url.searchParams.get("page_size");

  const page = pageParam === null ? DEFAULT_PAGE : Number(pageParam);
  if (!Number.isInteger(page)) return { error: "Invalid page" as const };

  const pageSize = pageSizeParam === null ? DEFAULT_PAGE_SIZE : Number(pageSizeParam);
  if (!Number.isInteger(pageSize)) return { error: "Invalid page_size" as const };

  return {
    page: page >= 1 ? page : DEFAULT_PAGE,
    pageSize: pageSize >= 1 && pageSize <= MAX_PAGE_SIZE ? pageSize : DEFAULT_PAGE_SIZE,
  };
};

const getPaginationOrError = (res: ServerResponse, requestId: string, url: URL) => {
  const pagination = parsePagination(url);
  if ("error" in pagination) {
    error(res, requestId, 422, "VALIDATION_ERROR", pagination.error ?? "Invalid pagination");
    return null;
  }
  return pagination;
};

const hashRequestBody = (body: Record<string, unknown>) =>
  crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");

const idempotencyCacheKey = (userId: string, method: string, pathname: string, idempotencyKey: string, bodyHash: string) =>
  `${userId}:${method}:${pathname}:${idempotencyKey}:${bodyHash}`;

const originFrom = (req: IncomingMessage) => {
  const origin = req.headers.origin;
  if (typeof origin === "string") return origin;
  if (Array.isArray(origin)) return origin[0];
  return undefined;
};

const isOriginAllowed = (origin: string | undefined, allowedOrigins: Set<string>) => !origin || allowedOrigins.has(origin);

const setCorsHeaders = (res: ServerResponse, origin: string | undefined) => {
  res.setHeader("access-control-allow-methods", allowedMethods);
  res.setHeader("access-control-allow-headers", allowedHeaders);
  if (origin) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
  }
};

const writeHealth = (res: ServerResponse, requestId: string, method: string, serviceName: string, serviceVersion: string | undefined) => {
  const payload = {
    ok: true,
    service: serviceName,
    ts: Date.now(),
    ...(serviceVersion ? { version: serviceVersion } : {}),
  };

  res.statusCode = 200;
  res.setHeader("content-type", "application/json");
  res.setHeader("x-request-id", requestId);
  res.setHeader("cache-control", "no-store");
  if (method === "HEAD") {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload));
};

export const createEthosBackend = () =>
  createServer(async (req, res) => {
    const allowedOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
    const serviceName = (process.env.SERVICE_NAME ?? "clinical").trim() || "clinical";
    const serviceVersion = process.env.RENDER_GIT_COMMIT ?? process.env.npm_package_version;
    const requestId = crypto.randomUUID();
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://localhost");
    const origin = originFrom(req);
    const originAllowed = isOriginAllowed(origin, allowedOrigins);

    try {
      if (!originAllowed) {
        res.statusCode = 403;
        return res.end();
      }

      setCorsHeaders(res, origin);

      if (method === "OPTIONS") {
        res.statusCode = 204;
        return res.end();
      }

      if ((method === "GET" || method === "HEAD") && url.pathname === "/health") {
        return writeHealth(res, requestId, method, serviceName, serviceVersion);
      }

      // Public docs
      if (method === "GET" && url.pathname === "/openapi.yaml") {
        res.statusCode = 200;
        res.setHeader("content-type", "application/yaml");
        res.setHeader("x-request-id", requestId);
        res.setHeader("cache-control", "no-store");
        return res.end(openApi);
      }

      // Portal público: obter contrato por portal token
      if (method === "GET" && url.pathname.startsWith("/portal/contracts/")) {
        const token = url.pathname.split("/")[3];
        if (!token) return error(res, requestId, 404, "NOT_FOUND", "Contract token not found");
        const contract = getContractByPortalToken(token);
        if (!contract) return error(res, requestId, 404, "NOT_FOUND", "Contract not found");
        return ok(res, requestId, 200, contract);
      }

      // Portal público: aceitar contrato
      if (method === "POST" && url.pathname.startsWith("/portal/contracts/") && url.pathname.endsWith("/accept")) {
        const parts = url.pathname.split("/");
        const token = parts[3];
        if (!token) return error(res, requestId, 404, "NOT_FOUND", "Contract token not found");
        const body = await readJson(req);
        const acceptedBy = String(body.accepted_by ?? "");
        if (!acceptedBy) return error(res, requestId, 422, "VALIDATION_ERROR", "accepted_by is required");
        const contract = acceptContract(token, acceptedBy, getRemoteIp(req));
        if (!contract) return error(res, requestId, 404, "NOT_FOUND", "Contract not found");
        return ok(res, requestId, 200, contract);
      }

      if (method === "GET" && url.pathname === "/contracts") {
        return ok(res, requestId, 200, []);
      }

      // Auth
      if (method === "POST" && url.pathname === "/auth/login") {
        const body = await readJson(req);
        const session = login(String(body.email ?? ""), String(body.password ?? ""));
        if (!session) return error(res, requestId, 401, "UNAUTHORIZED", "Invalid credentials");
        return ok(res, requestId, 200, { user: session.user, token: session.token });
      }

      if (method === "POST" && url.pathname === "/auth/invite") {
        const auth = requireAuth(req, res, requestId);
        if (!auth) return;
        if (!requireRole(res, requestId, "admin", auth.user.role)) return;

        const body = await readJson(req);
        if (typeof body.email !== "string" || !body.email.includes("@")) {
          return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid email");
        }
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
        const token = tokenFrom(req);
        if (token) logout(token);
        return ok(res, requestId, 200, { success: true });
      }

      // A partir daqui: autenticado
      const auth = requireAuth(req, res, requestId);
      if (!auth) return;

      // Gate para rotas clínicas (corrigido)
      const isClinicalPath = CLINICAL_PATHS.some((pattern) => pattern.test(url.pathname));
      if (isClinicalPath && !requireClinicalAccess(res, requestId, auth.user.role)) return;

      // Patient access management (apenas psicólogo “user”)
      if (method === "POST" && url.pathname === "/patients/access") {
        if (!requireRole(res, requestId, "user", auth.user.role)) return;

        const body = await readJson(req);
        if (
          typeof body.patient_id !== "string" ||
          typeof body.patient_email !== "string" ||
          typeof body.patient_name !== "string"
        ) {
          return error(res, requestId, 422, "VALIDATION_ERROR", "patient_id, patient_email, and patient_name required");
        }

        const result = createPatientAccess(auth.user.id, {
          patient_id: body.patient_id,
          patient_email: body.patient_email,
          patient_name: body.patient_name,
          patient_password: typeof body.patient_password === "string" ? body.patient_password : undefined,
          permissions:
            typeof body.permissions === "object" && body.permissions !== null
              ? {
                  scales: Boolean((body.permissions as any).scales),
                  diary: Boolean((body.permissions as any).diary),
                  session_confirmation: Boolean((body.permissions as any).session_confirmation),
                  async_messages_per_day: Number((body.permissions as any).async_messages_per_day ?? 3),
                }
              : undefined,
        });

        if ("error" in result) return error(res, requestId, 409, "EMAIL_IN_USE", "Email already in use by a non-patient");

        return ok(res, requestId, 201, {
          access: result.access,
          patient_user: { id: result.patientUser.id, email: result.patientUser.email, name: result.patientUser.name },
          temporary_password: result.temporaryPassword ?? null,
        });
      }

      // Patient-only routes
      if (method === "GET" && url.pathname === "/patient/permissions") {
        if (!requireRole(res, requestId, "patient", auth.user.role)) return;
        const access = requirePatientAccess(res, requestId, auth.user.id);
        if (!access) return;
        return ok(res, requestId, 200, {
          permissions: access.permissions,
          patient_id: access.patient_id,
          owner_user_id: access.owner_user_id,
        });
      }

      if (method === "GET" && url.pathname === "/patient/sessions") {
        if (!requireRole(res, requestId, "patient", auth.user.role)) return;
        const access = requirePatientAccess(res, requestId, auth.user.id);
        if (!access) return;

        const pagination = getPaginationOrError(res, requestId, url);
        if (!pagination) return;

        return ok(res, requestId, 200, paginate(listPatientSessions(access), pagination.page, pagination.pageSize));
      }

      const patientSessionConfirm = url.pathname.match(/^\/patient\/sessions\/([^/]+)\/confirm$/);
      if (method === "POST" && patientSessionConfirm) {
        if (!requireRole(res, requestId, "patient", auth.user.role)) return;
        const access = requirePatientAccess(res, requestId, auth.user.id);
        if (!access) return;

        const result = confirmPatientSession(access, patientSessionConfirm[1]);
        if ("error" in result) {
          if (result.error === "PERMISSION_DENIED") return error(res, requestId, 403, "FORBIDDEN", "Session confirmation not allowed");
          return error(res, requestId, 404, "NOT_FOUND", "Session not found");
        }
        return ok(res, requestId, 200, result.session);
      }

      if (method === "POST" && url.pathname === "/patient/scales/record") {
        if (!requireRole(res, requestId, "patient", auth.user.role)) return;
        const access = requirePatientAccess(res, requestId, auth.user.id);
        if (!access) return;

        const body = await readJson(req);
        const result = recordPatientScale(access, String(body.scale_id ?? ""), Number(body.score ?? 0));
        if ("error" in result) return error(res, requestId, 403, "FORBIDDEN", "Scale responses not allowed");
        return ok(res, requestId, 201, result.record);
      }

      if (method === "POST" && url.pathname === "/patient/diary/entries") {
        if (!requireRole(res, requestId, "patient", auth.user.role)) return;
        const access = requirePatientAccess(res, requestId, auth.user.id);
        if (!access) return;

        const body = await readJson(req);
        if (typeof body.content !== "string" || !body.content.trim()) {
          return error(res, requestId, 422, "VALIDATION_ERROR", "content required");
        }
        const result = recordPatientDiaryEntry(access, body.content.trim());
        if ("error" in result) return error(res, requestId, 403, "FORBIDDEN", "Diary entries not allowed");
        return ok(res, requestId, 201, result.entry);
      }

      if (method === "POST" && url.pathname === "/patient/messages") {
        if (!requireRole(res, requestId, "patient", auth.user.role)) return;
        const access = requirePatientAccess(res, requestId, auth.user.id);
        if (!access) return;

        const body = await readJson(req);
        if (typeof body.message !== "string" || !body.message.trim()) {
          return error(res, requestId, 422, "VALIDATION_ERROR", "message required");
        }
        const result = sendPatientAsyncMessage(access, body.message.trim());
        if ("error" in result) {
          if (result.error === "LIMIT_REACHED") return error(res, requestId, 429, "LIMIT_REACHED", "Async message limit reached");
          return error(res, requestId, 403, "FORBIDDEN", "Async messages not allowed");
        }
        return ok(res, requestId, 201, {
          message: result.payload,
          remaining: result.remaining,
          disclaimer: result.disclaimer,
        });
      }

      // Local entitlements
      if (method === "POST" && url.pathname === "/local/entitlements/sync") {
        const body = await readJson(req);
        const snapshot = (body.snapshot ?? {}) as Parameters<typeof syncLocalEntitlements>[1];
        return ok(res, requestId, 200, syncLocalEntitlements(auth.user.id, snapshot));
      }

      if (method === "GET" && url.pathname === "/local/entitlements") {
        return ok(res, requestId, 200, resolveLocalEntitlements(auth.user.id));
      }

      // Contracts (clínico)
      if (method === "GET" && url.pathname === "/contracts") {
        return ok(res, requestId, 200, listContracts(auth.user.id));
      }

      if (method === "POST" && url.pathname === "/contracts") {
        const body = await readJson(req);
        const requiredFields = ["patient_id", "psychologist", "patient", "terms"];
        const missing = requiredFields.filter((field) => body[field] === undefined);
        if (missing.length > 0) return error(res, requestId, 422, "VALIDATION_ERROR", `Missing fields: ${missing.join(", ")}`);

        const contract = createContract(auth.user.id, {
          patient_id: String(body.patient_id ?? ""),
          psychologist: body.psychologist as { name: string; license: string; email: string; phone?: string },
          patient: body.patient as { name: string; email: string; document: string },
          terms: body.terms as { value: string; periodicity: string; absence_policy: string; payment_method: string },
        });
        return ok(res, requestId, 201, contract);
      }

      if (method === "POST" && url.pathname.startsWith("/contracts/") && url.pathname.endsWith("/send")) {
        const contractId = url.pathname.split("/")[2];
        const contract = sendContract(auth.user.id, contractId);
        if (!contract) return error(res, requestId, 404, "NOT_FOUND", "Contract not found");
        return ok(res, requestId, 200, {
          contract,
          portal_url: contract.portal_token ? `/portal/contracts/${contract.portal_token}` : null,
        });
      }

      if (method === "GET" && url.pathname.startsWith("/contracts/") && url.pathname.endsWith("/export")) {
        const contractId = url.pathname.split("/")[2];
        const format = url.searchParams.get("format") === "docx" ? "docx" : "pdf";
        const payload = exportContract(auth.user.id, contractId, format);
        if (!payload) return error(res, requestId, 404, "NOT_FOUND", "Contract not found");
        return ok(res, requestId, 200, payload);
      }

      if (method === "GET" && url.pathname.startsWith("/contracts/")) {
        const contractId = url.pathname.split("/")[2];
        const contract = getContract(auth.user.id, contractId);
        if (!contract) return error(res, requestId, 404, "NOT_FOUND", "Contract not found");
        return ok(res, requestId, 200, contract);
      }

      // Sessions (com idempotência)
      const idemKey = req.headers["idempotency-key"]?.toString();

      if (method === "POST" && url.pathname === "/sessions") {
        if (!canUseFeature(auth.user.id, "new_session")) {
          return error(res, requestId, 402, "ENTITLEMENT_BLOCK", "Subscription required to create new sessions");
        }
        const body = await readJson(req);
        if (typeof body.patient_id !== "string" || typeof body.scheduled_at !== "string") {
          return error(res, requestId, 422, "VALIDATION_ERROR", "patient_id and scheduled_at required");
        }

        const idemCacheKey = idemKey ? idempotencyCacheKey(auth.user.id, method, url.pathname, idemKey, hashRequestBody(body)) : null;
        if (idemCacheKey) {
          const existing = getIdempotencyEntry(idemCacheKey);
          if (existing) return ok(res, requestId, existing.statusCode, existing.body);
        }

        const session = createSession(auth.user.id, body.patient_id, body.scheduled_at);

        if (idemCacheKey) {
          setIdempotencyEntry(idemCacheKey, { statusCode: 201, body: session, createdAt: new Date().toISOString() });
        }

        return ok(res, requestId, 201, session);
      }

      if (method === "GET" && url.pathname === "/sessions") {
        const pagination = getPaginationOrError(res, requestId, url);
        if (!pagination) return;

        const patientIdFilter = url.searchParams.get("patient_id");
        const statusFilter = url.searchParams.get("status");
        const fromFilter = url.searchParams.get("from");
        const toFilter = url.searchParams.get("to");

        const items = Array.from(db.sessions.values()).filter((item) => {
          if (item.owner_user_id !== auth.user.id) return false;
          if (patientIdFilter && item.patient_id !== patientIdFilter) return false;
          if (statusFilter && item.status !== statusFilter) return false;
          if (fromFilter && Date.parse(item.scheduled_at) < Date.parse(fromFilter)) return false;
          if (toFilter && Date.parse(item.scheduled_at) > Date.parse(toFilter)) return false;
          return true;
        });
        return ok(res, requestId, 200, paginate(items, pagination.page, pagination.pageSize));
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
        if (!["scheduled", "confirmed", "missed", "completed"].includes(status)) {
          return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid status");
        }
        const session = patchSessionStatus(auth.user.id, sessionStatus[1], status);
        if (!session) return error(res, requestId, 404, "NOT_FOUND", "Session not found");
        return ok(res, requestId, 200, session);
      }

      const sessionAudio = url.pathname.match(/^\/sessions\/([^/]+)\/audio$/);
      if (method === "POST" && sessionAudio) {
        if (!getByOwner(db.sessions, auth.user.id, sessionAudio[1])) return error(res, requestId, 404, "NOT_FOUND", "Session not found");

        const contentType = req.headers["content-type"]?.toLowerCase() ?? "";
        if (contentType.includes("multipart/form-data")) {
          const raw = await readText(req);
          if (!raw.includes('name="consent_confirmed"') || !raw.includes("true")) {
            return error(res, requestId, 422, "CONSENT_REQUIRED", "Explicit consent is required");
          }
          if (!raw.includes('name="audio_file"')) {
            return error(res, requestId, 422, "VALIDATION_ERROR", "multipart field 'audio_file' is required");
          }
          return ok(res, requestId, 201, addAudio(auth.user.id, sessionAudio[1], "vault://audio.enc"));
        }

        const body = await readJson(req);
        if (body.consent_confirmed !== true) return error(res, requestId, 422, "CONSENT_REQUIRED", "Explicit consent is required");
        return ok(res, requestId, 201, addAudio(auth.user.id, sessionAudio[1], String(body.file_path ?? "vault://audio.enc")));
      }

      const sessionTranscribe = url.pathname.match(/^\/sessions\/([^/]+)\/transcribe$/);
      if (method === "POST" && sessionTranscribe) {
        if (!canUseFeature(auth.user.id, "transcription")) {
          return error(res, requestId, 402, "ENTITLEMENT_BLOCK", "Transcription unavailable for this subscription");
        }
        if (!getByOwner(db.sessions, auth.user.id, sessionTranscribe[1])) return error(res, requestId, 404, "NOT_FOUND", "Session not found");

        const body = await readJson(req);
        const job = createJob(auth.user.id, "transcription", sessionTranscribe[1]);
        void runJob(job.id, { rawText: String(body.raw_text ?? "") });
        return ok(res, requestId, 202, { jobId: job.id, job_id: job.id, status: job.status });
      }

      // Clinical notes
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
        recordProntuarioAudit(auth.user.id, "ACCESS", "clinical_note", note.id);
        return ok(res, requestId, 200, note);
      }

      const sessionNotes = url.pathname.match(/^\/sessions\/([^/]+)\/clinical-notes$/);
      if (method === "GET" && sessionNotes) {
        const pagination = getPaginationOrError(res, requestId, url);
        if (!pagination) return;

        // Nota: você registrava audit usando sessionNotes[1] como id. Mantive, mas se quiser melhor:
        // ideal seria registrar por "session_id" explicitamente.
        recordProntuarioAudit(auth.user.id, "ACCESS", "clinical_note", sessionNotes[1]);

        return ok(
          res,
          requestId,
          200,
          paginate(listSessionClinicalNotes(auth.user.id, sessionNotes[1]), pagination.page, pagination.pageSize),
        );
      }

      const notePrivateComments = url.pathname.match(/^\/clinical-notes\/([^/]+)\/private-comments$/);
      if (method === "POST" && notePrivateComments) {
        const body = await readJson(req);
        if (typeof body.content !== "string" || body.content.trim().length === 0) {
          return error(res, requestId, 422, "VALIDATION_ERROR", "content required");
        }
        const comment = createPrivateComment(auth.user.id, notePrivateComments[1], body.content.trim());
        if (!comment) return error(res, requestId, 404, "NOT_FOUND", "Clinical note not found");
        return ok(res, requestId, 201, comment);
      }

      if (method === "GET" && notePrivateComments) {
        const pagination = getPaginationOrError(res, requestId, url);
        if (!pagination) return;
        return ok(res, requestId, 200, paginate(listPrivateComments(auth.user.id, notePrivateComments[1]), pagination.page, pagination.pageSize));
      }

      // Casos anonimizados
      if (method === "POST" && url.pathname === "/cases/anonymized") {
        const body = await readJson(req);
        const title = typeof body.title === "string" ? body.title.trim() : "";
        const summary = typeof body.summary === "string" ? body.summary.trim() : "";
        const tags = Array.isArray(body.tags) ? body.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
        if (!title || !summary) return error(res, requestId, 422, "VALIDATION_ERROR", "title and summary required");
        return ok(res, requestId, 201, createAnonymizedCase(auth.user.id, { title, summary, tags }));
      }

      if (method === "GET" && url.pathname === "/cases/anonymized") {
        const pagination = getPaginationOrError(res, requestId, url);
        if (!pagination) return;
        return ok(res, requestId, 200, paginate(listAnonymizedCases(auth.user.id), pagination.page, pagination.pageSize));
      }

      // Notifications
      if (method === "POST" && url.pathname === "/notifications/templates") {
        const body = await readJson(req);
        if (typeof body.name !== "string" || typeof body.channel !== "string" || typeof body.content !== "string") {
          return error(res, requestId, 422, "VALIDATION_ERROR", "name, channel and content required");
        }
        if (body.channel !== "email" && body.channel !== "whatsapp") return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid channel");
        const channel: NotificationChannel = body.channel;

        const template = createNotificationTemplate(auth.user.id, {
          name: body.name,
          channel,
          content: body.content,
          subject: typeof body.subject === "string" ? body.subject : undefined,
        });
        return ok(res, requestId, 201, template);
      }

      if (method === "GET" && url.pathname === "/notifications/templates") {
        return ok(res, requestId, 200, listNotificationTemplates(auth.user.id));
      }

      if (method === "POST" && url.pathname === "/notifications/consents") {
        const body = await readJson(req);
        if (typeof body.patient_id !== "string" || typeof body.channel !== "string") {
          return error(res, requestId, 422, "VALIDATION_ERROR", "patient_id and channel required");
        }
        if (body.channel !== "email" && body.channel !== "whatsapp") return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid channel");
        const channel: NotificationChannel = body.channel;

        const consent = grantNotificationConsent(auth.user.id, {
          patientId: body.patient_id,
          channel,
          source: typeof body.source === "string" ? body.source : "manual",
        });
        return ok(res, requestId, 201, consent);
      }

      if (method === "POST" && url.pathname === "/notifications/schedule") {
        const body = await readJson(req);
        if (
          typeof body.session_id !== "string" ||
          typeof body.template_id !== "string" ||
          typeof body.scheduled_for !== "string" ||
          typeof body.recipient !== "string"
        ) {
          return error(res, requestId, 422, "VALIDATION_ERROR", "session_id, template_id, scheduled_for, recipient required");
        }
        if (Number.isNaN(Date.parse(body.scheduled_for))) return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid scheduled_for");

        const session = getByOwner(db.sessions, auth.user.id, body.session_id);
        if (!session) return error(res, requestId, 404, "NOT_FOUND", "Session not found");

        const template = db.notificationTemplates.get(body.template_id);
        if (!template || template.owner_user_id !== auth.user.id) return error(res, requestId, 404, "NOT_FOUND", "Template not found");

        const result = await scheduleNotification(auth.user.id, {
          session,
          template,
          scheduledFor: body.scheduled_for,
          recipient: body.recipient,
        });

        if ("error" in result) return error(res, requestId, 422, result.error, "Consent required before scheduling");
        return ok(res, requestId, 201, result);
      }

      if (method === "GET" && url.pathname === "/notifications/schedules") {
        return ok(res, requestId, 200, listNotificationSchedules(auth.user.id));
      }

      if (method === "GET" && url.pathname === "/notifications/logs") {
        return ok(res, requestId, 200, listNotificationLogs(auth.user.id));
      }

      if (method === "POST" && url.pathname === "/notifications/dispatch-due") {
        const body = await readJson(req);
        const asOf = typeof body.as_of === "string" ? Date.parse(body.as_of) : Date.now();
        if (Number.isNaN(asOf)) return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid as_of");
        const dispatched = await dispatchDueNotifications(auth.user.id, asOf);
        return ok(res, requestId, 200, dispatched);
      }

      // Reports
      if (method === "POST" && url.pathname === "/reports") {
        const body = await readJson(req);
        const report = createReport(
          auth.user.id,
          String(body.patient_id ?? ""),
          String(body.purpose ?? "profissional") as "instituição" | "profissional" | "paciente",
          String(body.content ?? ""),
        );
        if (!report) return error(res, requestId, 422, "VALIDATED_NOTE_REQUIRED", "A validated note for the patient is required before creating reports");
        return ok(res, requestId, 201, report);
      }

      if (method === "GET" && url.pathname === "/reports") {
        const pagination = getPaginationOrError(res, requestId, url);
        if (!pagination) return;

        const items = Array.from(db.reports.values()).filter((item) => item.owner_user_id === auth.user.id);
        recordProntuarioAudit(auth.user.id, "ACCESS", "report");
        return ok(res, requestId, 200, paginate(items, pagination.page, pagination.pageSize));
      }

      // Document templates (lista pública)
      if (method === "GET" && url.pathname === "/document-templates") {
        return ok(res, requestId, 200, listDocumentTemplates());
      }

      // Documents
      if (method === "POST" && url.pathname === "/documents") {
        const body = await readJson(req);
        const document = createDocument(
          auth.user.id,
          String(body.patient_id ?? ""),
          String(body.case_id ?? ""),
          String(body.template_id ?? ""),
          String(body.title ?? "Documento clínico"),
        );
        if (!document) return error(res, requestId, 404, "TEMPLATE_NOT_FOUND", "Template not found");
        return ok(res, requestId, 201, document);
      }

      if (method === "GET" && url.pathname === "/documents") {
        const caseId = String(url.searchParams.get("case_id") ?? "");
        const patientId = String(url.searchParams.get("patient_id") ?? "");
        const templateId = String(url.searchParams.get("template_id") ?? "");
        const query = String(url.searchParams.get("q") ?? "").toLowerCase();
        const pagination = getPaginationOrError(res, requestId, url);
        if (!pagination) return;

        const items = (caseId
          ? listDocumentsByCase(auth.user.id, caseId)
          : Array.from(db.documents.values()).filter((item) => item.owner_user_id === auth.user.id))
          .filter((item) => !patientId || item.patient_id === patientId)
          .filter((item) => !templateId || item.template_id === templateId)
          .filter((item) => !query || item.title.toLowerCase().includes(query));

        return ok(res, requestId, 200, paginate(items, pagination.page, pagination.pageSize));
      }

      const documentVersions = url.pathname.match(/^\/documents\/([^/]+)\/versions$/);
      if (method === "POST" && documentVersions) {
        const body = await readJson(req);
        const version = addDocumentVersion(auth.user.id, documentVersions[1], {
          content: String(body.content ?? ""),
          global_values: (body.global_values as Record<string, string>) ?? {},
        });
        if (!version) return error(res, requestId, 404, "NOT_FOUND", "Document not found");
        return ok(res, requestId, 201, version);
      }

      if (method === "GET" && documentVersions) {
        return ok(res, requestId, 200, listDocumentVersions(auth.user.id, documentVersions[1]));
      }

      // Anamnesis
      if (method === "POST" && url.pathname === "/anamnesis") {
        const body = await readJson(req);
        return ok(
          res,
          requestId,
          201,
          createAnamnesis(
            auth.user.id,
            String(body.patient_id ?? ""),
            String(body.template_id ?? "default"),
            (body.content as Record<string, unknown>) ?? {},
          ),
        );
      }

      if (method === "GET" && url.pathname === "/anamnesis") {
        const pagination = getPaginationOrError(res, requestId, url);
        if (!pagination) return;

        const items = Array.from(db.anamnesis.values()).filter((item) => item.owner_user_id === auth.user.id);
        recordProntuarioAudit(auth.user.id, "ACCESS", "anamnesis");
        return ok(res, requestId, 200, paginate(items, pagination.page, pagination.pageSize));
      }

      // Scales
      if (method === "GET" && url.pathname === "/scales") return ok(res, requestId, 200, listScales());

      if (method === "POST" && url.pathname === "/scales/record") {
        const body = await readJson(req);
        return ok(res, requestId, 201, createScaleRecord(auth.user.id, String(body.scale_id ?? ""), String(body.patient_id ?? ""), Number(body.score ?? 0)));
      }

      if (method === "GET" && url.pathname === "/scales/records") {
        const pagination = getPaginationOrError(res, requestId, url);
        if (!pagination) return;

        const items = Array.from(db.scales.values()).filter((item) => item.owner_user_id === auth.user.id);
        recordProntuarioAudit(auth.user.id, "ACCESS", "scale_record");
        return ok(res, requestId, 200, paginate(items, pagination.page, pagination.pageSize));
      }

      // Forms
      if (method === "POST" && url.pathname === "/forms/entry") {
        const body = await readJson(req);
        return ok(res, requestId, 201, createFormEntry(auth.user.id, String(body.patient_id ?? ""), String(body.form_id ?? ""), (body.content as Record<string, unknown>) ?? {}));
      }

      if (method === "GET" && url.pathname === "/forms") {
        const pagination = getPaginationOrError(res, requestId, url);
        if (!pagination) return;

        const items = Array.from(db.forms.values()).filter((item) => item.owner_user_id === auth.user.id);
        recordProntuarioAudit(auth.user.id, "ACCESS", "form_entry");
        return ok(res, requestId, 200, paginate(items, pagination.page, pagination.pageSize));
      }

      // Templates (HTML/PDF rendering)
      if (method === "GET" && url.pathname === "/templates") {
        return ok(res, requestId, 200, listTemplates(auth.user.id));
      }

      if (method === "POST" && url.pathname === "/templates") {
        const body = await readJson(req);
        if (typeof body.title !== "string" || typeof body.html !== "string") {
          return error(res, requestId, 422, "VALIDATION_ERROR", "title and html required");
        }
        const template = createTemplate(auth.user.id, {
          title: body.title,
          description: typeof body.description === "string" ? body.description : undefined,
          version: typeof body.version === "number" ? body.version : 1,
          html: body.html,
          fields: Array.isArray(body.fields) ? (body.fields as any) : [],
        });
        return ok(res, requestId, 201, template);
      }

      const templateById = url.pathname.match(/^\/templates\/([^/]+)$/);
      if (method === "GET" && templateById) {
        const template = getTemplate(auth.user.id, templateById[1]);
        if (!template) return error(res, requestId, 404, "NOT_FOUND", "Template not found");
        return ok(res, requestId, 200, template);
      }

      if (method === "PUT" && templateById) {
        const body = await readJson(req);
        const template = updateTemplate(auth.user.id, templateById[1], {
          title: typeof body.title === "string" ? body.title : undefined,
          description: typeof body.description === "string" ? body.description : undefined,
          version: typeof body.version === "number" ? body.version : undefined,
          html: typeof body.html === "string" ? body.html : undefined,
          fields: Array.isArray(body.fields) ? (body.fields as any) : undefined,
        });
        if (!template) return error(res, requestId, 404, "NOT_FOUND", "Template not found");
        return ok(res, requestId, 200, template);
      }

      if (method === "DELETE" && templateById) {
        const removed = deleteTemplate(auth.user.id, templateById[1]);
        if (!removed) return error(res, requestId, 404, "NOT_FOUND", "Template not found");
        return ok(res, requestId, 200, { deleted: true });
      }

      const templateRender = url.pathname.match(/^\/templates\/([^/]+)\/render$/);
      if (method === "POST" && templateRender) {
        const body = await readJson(req);
        const render = renderTemplate(auth.user.id, templateRender[1], {
          globals: (body.globals ?? {}) as any,
          fields: (body.fields ?? {}) as Record<string, string>,
          format: (body.format as "html" | "pdf" | "docx") ?? "html",
        });
        if (!render) return error(res, requestId, 404, "NOT_FOUND", "Template not found");
        return ok(res, requestId, 200, render);
      }

      // Financial
      if (method === "POST" && url.pathname === "/financial/entry") {
        const body = await readJson(req);
        return ok(
          res,
          requestId,
          201,
          createFinancialEntry(auth.user.id, {
            patient_id: String(body.patient_id ?? ""),
            type: (body.type as "receivable" | "payable") ?? "receivable",
            amount: Number(body.amount ?? 0),
            due_date: String(body.due_date ?? new Date().toISOString()),
            status: "open",
            description: String(body.description ?? ""),
          }),
        );
      }

      if (method === "GET" && url.pathname === "/financial/entries") {
        const pagination = getPaginationOrError(res, requestId, url);
        if (!pagination) return;

        const patientId = url.searchParams.get("patient_id");
        const status = url.searchParams.get("status");
        const type = url.searchParams.get("type");

        const items = Array.from(db.financial.values())
          .filter((item) => item.owner_user_id === auth.user.id)
          .filter((item) => !patientId || item.patient_id === patientId)
          .filter((item) => !status || item.status === status)
          .filter((item) => !type || item.type === type);
        recordProntuarioAudit(auth.user.id, "ACCESS", "financial_entry");
        return ok(res, requestId, 200, paginate(items, pagination.page, pagination.pageSize));
      }

      // Export
      if (method === "POST" && (url.pathname === "/export/pdf" || url.pathname === "/export/docx")) {
        if (!canUseFeature(auth.user.id, "export")) return error(res, requestId, 402, "ENTITLEMENT_BLOCK", "Export unavailable for this subscription");
        const job = createJob(auth.user.id, "export");
        void runJob(job.id, {});
        return ok(res, requestId, 202, { jobId: job.id, job_id: job.id, status: job.status });
      }

      if (method === "POST" && url.pathname === "/export/full") {
        if (!canUseFeature(auth.user.id, "export")) return error(res, requestId, 402, "ENTITLEMENT_BLOCK", "Export unavailable for this subscription");
        const job = createJob(auth.user.id, "export_full");
        void runJob(job.id, {});
        return ok(res, requestId, 202, { jobId: job.id, job_id: job.id, status: job.status });
      }

      if (method === "POST" && url.pathname === "/export/case") {
        const body = await readJson(req);
        const patientId = String(body.patient_id ?? "");
        if (!patientId) return error(res, requestId, 400, "INVALID_PAYLOAD", "patient_id is required");

        const exportPayload = exportCase(auth.user.id, patientId, {
          window_days: typeof body.history_window_days === "number" ? body.history_window_days : undefined,
          max_sessions: typeof body.max_sessions === "number" ? body.max_sessions : undefined,
          max_notes: typeof body.max_notes === "number" ? body.max_notes : undefined,
          max_reports: typeof body.max_reports === "number" ? body.max_reports : undefined,
        });
        if (!exportPayload) return error(res, requestId, 404, "NOT_FOUND", "Patient not found");
        return ok(res, requestId, 200, exportPayload);
      }

      // Backup/restore/purge
      if (method === "POST" && url.pathname === "/backup") {
        const job = createJob(auth.user.id, "backup");
        void runJob(job.id, {});
        return ok(res, requestId, 202, { jobId: job.id, job_id: job.id, status: job.status });
      }

      if (method === "POST" && url.pathname === "/restore") {
        return ok(res, requestId, 202, { accepted: true });
      }

      if (method === "POST" && url.pathname === "/purge") {
        purgeUserData(auth.user.id);
        return ok(res, requestId, 202, { accepted: true });
      }

      // Retention policy
      if (method === "GET" && url.pathname === "/retention-policy") {
        return ok(res, requestId, 200, getRetentionPolicy(auth.user.id));
      }

      if (method === "PATCH" && url.pathname === "/retention-policy") {
        const body = await readJson(req);
        const updated = updateRetentionPolicy(auth.user.id, {
          clinical_record_days: typeof body.clinical_record_days === "number" ? body.clinical_record_days : undefined,
          audit_days: typeof body.audit_days === "number" ? body.audit_days : undefined,
          export_days: typeof body.export_days === "number" ? body.export_days : undefined,
        });
        return ok(res, requestId, 200, updated);
      }

      // Close case
      if (method === "POST" && url.pathname === "/cases/close") {
        const body = await readJson(req);
        const patientId = String(body.patient_id ?? "");
        if (!patientId) return error(res, requestId, 400, "INVALID_PAYLOAD", "patient_id is required");

        const reason = String(body.reason ?? "").trim();
        const summary = String(body.summary ?? "").trim();
        if (!reason || !summary) return error(res, requestId, 400, "INVALID_PAYLOAD", "reason and summary are required");

        const result = closeCase(auth.user.id, patientId, {
          reason,
          summary,
          next_steps: Array.isArray(body.next_steps) ? body.next_steps.map((item) => String(item)) : [],
          history_policy: {
            window_days: typeof body.history_window_days === "number" ? body.history_window_days : undefined,
            max_sessions: typeof body.max_sessions === "number" ? body.max_sessions : undefined,
            max_notes: typeof body.max_notes === "number" ? body.max_notes : undefined,
            max_reports: typeof body.max_reports === "number" ? body.max_reports : undefined,
          },
        });

        if (!result) return error(res, requestId, 404, "NOT_FOUND", "Patient not found");
        return ok(res, requestId, 200, result);
      }

      // Jobs
      const jobById = url.pathname.match(/^\/jobs\/([^/]+)$/);
      if (method === "GET" && jobById) {
        const job = getJob(auth.user.id, jobById[1]);
        if (!job) return error(res, requestId, 404, "NOT_FOUND", "Job not found");
        return ok(res, requestId, 200, job);
      }

      // Webhooks
      if (method === "POST" && (url.pathname === "/api/webhook" || url.pathname === "/webhooks/transcriber")) {
        const body = await readJson(req);
        const updated = handleTranscriberWebhook(
          String(body.job_id ?? ""),
          String(body.status ?? "failed") as any,
          typeof body.error_code === "string" ? body.error_code : undefined,
        );
        if (!updated) return error(res, requestId, 404, "NOT_FOUND", "Job not found");
        return ok(res, requestId, 202, { accepted: true });
      }

      // Patients list
      if (method === "GET" && url.pathname === "/patients") {
        return ok(res, requestId, 200, listPatients(auth.user.id));
      }

      const patientById = url.pathname.match(/^\/patients\/([^/]+)$/);
      if (method === "GET" && patientById) {
        const patient = getPatient(auth.user.id, patientById[1]);
        if (!patient) return error(res, requestId, 404, "NOT_FOUND", "Patient not found");
        return ok(res, requestId, 200, patient);
      }

      // AI organize
      if (method === "POST" && url.pathname === "/ai/organize") {
        const body = await readJson(req);
        const text = String(body.text ?? "").trim();
        return ok(res, requestId, 200, { summary: text, tokens_estimate: text.split(/\s+/).filter(Boolean).length });
      }

      // Admin routes
      if (method === "GET" && url.pathname === "/admin/metrics/overview") {
        if (!requireRole(res, requestId, "admin", auth.user.role)) return;
        return ok(res, requestId, 200, adminOverviewMetrics());
      }

      if (method === "POST" && url.pathname === "/admin/observability/performance-samples") {
        if (!requireRole(res, requestId, "admin", auth.user.role)) return;
        const body = await readJson(req);
        const sample = {
          timestamp: String(body.timestamp ?? new Date().toISOString()),
          latencyMs: Number(body.latencyMs ?? 0),
          errorRate: Number(body.errorRate ?? 0),
          cpuPercent: Number(body.cpuPercent ?? 0),
          memoryPercent: Number(body.memoryPercent ?? 0),
        };
        const alerts = ingestPerformanceSample(sample);
        return ok(res, requestId, 201, { ingested: sample, alerts_generated: alerts.length });
      }

      if (method === "POST" && url.pathname === "/admin/observability/error-logs") {
        if (!requireRole(res, requestId, "admin", auth.user.role)) return;
        const body = await readJson(req);
        const log = {
          timestamp: String(body.timestamp ?? new Date().toISOString()),
          service: String(body.service ?? "unknown"),
          message: String(body.message ?? ""),
          stack: typeof body.stack === "string" ? body.stack : undefined,
        };
        const alerts = ingestErrorLog(log);
        return ok(res, requestId, 201, { ingested: log, alerts_generated: alerts.length });
      }

      if (method === "POST" && url.pathname === "/admin/observability/evaluate") {
        if (!requireRole(res, requestId, "admin", auth.user.role)) return;
        const alerts = evaluateObservability();
        return ok(res, requestId, 200, { alerts_generated: alerts.length });
      }

      if (method === "GET" && url.pathname === "/admin/observability/alerts") {
        if (!requireRole(res, requestId, "admin", auth.user.role)) return;
        return ok(res, requestId, 200, listObservabilityAlerts());
      }

      if (method === "GET" && url.pathname === "/admin/audit") {
        if (!requireRole(res, requestId, "admin", auth.user.role)) return;
        return ok(res, requestId, 200, Array.from(db.audit.values()));
      }

      // Not found
      return error(res, requestId, 404, "NOT_FOUND", "Route not found");
    } catch (err) {
      if (err instanceof BadRequestError) {
        return error(res, requestId, err.statusCode, err.code, err.message);
      }

      addTelemetry({
        user_id: authUserId(req),
        event_type: "HTTP_ERROR",
        route: url.pathname,
        status_code: 500,
        error_code: (err as Error).name,
      });

      return error(res, requestId, 500, "INTERNAL_ERROR", "Unexpected server error");
    }
  });
