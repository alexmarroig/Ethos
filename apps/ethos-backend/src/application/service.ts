import crypto from "node:crypto";
import { db, encrypt, hashInviteToken, hashPassword, seeds, uid, verifyPassword } from "../infra/database";
import {
  detectAnomalousBehavior,
  detectBottlenecks,
  predictFailureRisk,
  suggestRootCauseFromLogs,
  type ErrorLog,
  type PerformanceSample,
} from "./aiObservability";
import type {
  AnamnesisResponse,
  AnonymizedCase,
  CaseClosureProtocol,
  CaseHistoryPolicy,
  ClinicalNote,
  ClinicalReport,
  ClinicalSession,
  ClinicalDocument,
  DocumentTemplate,
  DocumentVersion,
  Contract,
  ClinicalTemplate,
  FinancialEntry,
  FormEntry,
  Job,
  JobStatus,
  JobType,
  LocalEntitlementSnapshot,
  ObservabilityAlert,
  PatientAccess,
  PatientAsyncMessage,
  PatientDiaryEntry,
  PatientPermission,
  Patient,
  PrivateComment,
  RetentionPolicy,
  PatientAlertState,
  PatientDecision,
  PatientRules,
  ScaleRecord,
  SessionStatus,
  SafeModeAlert,
  TelemetryEvent,
  TemplateRenderRequest,
  TemplateRenderResponse,
  Transcript,
  User,
} from "../domain/types";

const now = seeds.now;
const DAY_MS = 86_400_000;
const PATIENT_MESSAGE_DISCLAIMER = "Aviso: mensagem assíncrona não substitui sessão.";
const DEFAULT_PATIENT_PERMISSIONS: PatientPermission = {
  scales: true,
  diary: true,
  session_confirmation: true,
  async_messages_per_day: 3,
};
const PORTAL_TOKEN_BYTES = 18;
const DEFAULT_CASE_HISTORY_POLICY: CaseHistoryPolicy = {
  window_days: 365,
  max_sessions: 20,
  max_notes: 60,
  max_reports: 20,
};

const defaultPatientRules: PatientRules = {
  confirmation_required: false,
  reschedule_deadline_hours: 24,
  replacement_policy: "case_by_case",
};

const buildDefaultPatientAlert = (): PatientAlertState => ({
  level: "none",
  reason: "Sem faltas recentes",
  missed_sessions_last_90_days: 0,
  updated_at: now(),
});

const SAFE_MODE_RULES: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bdiagn[oó]stic\w*/i, message: "Evite linguagem diagnóstica conclusiva fora do laudo." },
  { pattern: /\btranstorno\b/i, message: "Substitua termos diagnósticos por descrições clínicas." },
  { pattern: /\bCID-?\s*\w+/i, message: "Códigos CID devem aparecer apenas em laudos." },
  { pattern: /\bconclusiv\w+/i, message: "Evite termos conclusivos em documentos de declaração." },
  { pattern: /\bcomprovad\w+/i, message: "Evite afirmações conclusivas sem laudo." },
];

const buildSafeModeAlerts = (content: string, allowDiagnostics: boolean): SafeModeAlert[] => {
  if (allowDiagnostics) return [];
  const alerts: SafeModeAlert[] = [];
  for (const rule of SAFE_MODE_RULES) {
    const match = content.match(rule.pattern);
    if (match) {
      alerts.push({
        id: uid(),
        kind: "diagnostic_language",
        severity: "warning",
        message: rule.message,
        match: match[0],
      });
    }
  }
  return alerts;
};

export const addAudit = (actorUserId: string, event: string, targetUserId?: string) => {
  const id = uid();
  db.audit.set(id, { id, actor_user_id: actorUserId, event, target_user_id: targetUserId, ts: now() });
};

export const addTelemetry = (event: Omit<TelemetryEvent, "id" | "ts">) => {
  const item: TelemetryEvent = { id: uid(), ts: now(), ...event };
  db.telemetry.set(item.id, item);
  const owner = event.user_id ?? "anonymous";
  const queue = db.telemetryQueue.get(owner) ?? [];
  queue.push(item);
  db.telemetryQueue.set(owner, queue);
  return item;
};

export const flushTelemetryQueue = (owner: string) => {
  const queue = db.telemetryQueue.get(owner) ?? [];
  db.telemetryQueue.set(owner, []);
  return queue;
};

type ProntuarioResource = "clinical_note" | "report" | "anamnesis" | "scale_record" | "form_entry" | "financial_entry";
type ProntuarioAction = "ACCESS" | "EDIT";

export const recordProntuarioAudit = (actorUserId: string, action: ProntuarioAction, resource: ProntuarioResource, resourceId?: string) => {
  const target = resourceId ? `${resource}:${resourceId}` : `${resource}:list`;
  addAudit(actorUserId, `PRONTUARIO_${action}:${target}`);
};

const defaultRetentionPolicy: Omit<RetentionPolicy, "id" | "owner_user_id" | "created_at" | "updated_at"> = {
  clinical_record_days: 3650,
  audit_days: 3650,
  export_days: 365,
};



const observabilityState = {
  performanceSamples: [] as PerformanceSample[],
  errorLogs: [] as ErrorLog[],
};

const upsertObservabilityAlert = (payload: Omit<ObservabilityAlert, "id" | "first_seen_at" | "last_seen_at" | "occurrences"> & { seenAt?: string }) => {
  const seenAt = payload.seenAt ?? now();
  const existing = Array.from(db.observabilityAlerts.values()).find((alert) => alert.fingerprint === payload.fingerprint);
  if (existing) {
    existing.last_seen_at = seenAt;
    existing.occurrences += 1;
    existing.context = payload.context;
    existing.message = payload.message;
    return existing;
  }

  const created: ObservabilityAlert = {
    id: uid(),
    source: payload.source,
    severity: payload.severity,
    title: payload.title,
    message: payload.message,
    fingerprint: payload.fingerprint,
    first_seen_at: seenAt,
    last_seen_at: seenAt,
    occurrences: 1,
    context: payload.context,
  };
  db.observabilityAlerts.set(created.id, created);
  return created;
};

export const ingestPerformanceSample = (sample: PerformanceSample) => {
  observabilityState.performanceSamples.push(sample);
  if (observabilityState.performanceSamples.length > 500) observabilityState.performanceSamples.shift();
  return evaluateObservability();
};

export const ingestErrorLog = (log: ErrorLog) => {
  observabilityState.errorLogs.push(log);
  if (observabilityState.errorLogs.length > 500) observabilityState.errorLogs.shift();
  return evaluateObservability();
};

export const evaluateObservability = () => {
  const createdOrUpdated: ObservabilityAlert[] = [];
  const samples = observabilityState.performanceSamples;
  const logs = observabilityState.errorLogs;

  for (const alert of detectBottlenecks(samples)) {
    createdOrUpdated.push(upsertObservabilityAlert({
      source: "detectBottlenecks",
      severity: alert.severity,
      title: `Bottleneck em ${alert.metric}`,
      message: alert.message,
      fingerprint: `bottleneck:${alert.metric}:${alert.severity}`,
      context: { metric: alert.metric },
    }));
  }

  const risk = predictFailureRisk(samples);
  if (risk.riskLevel !== "low") {
    createdOrUpdated.push(upsertObservabilityAlert({
      source: "predictFailureRisk",
      severity: risk.riskLevel,
      title: "Risco de falha previsto",
      message: `${risk.reason} (score=${risk.riskScore.toFixed(2)})`,
      fingerprint: `failure-risk:${risk.riskLevel}`,
      context: risk,
    }));
  }

  for (const anomaly of detectAnomalousBehavior(samples)) {
    createdOrUpdated.push(upsertObservabilityAlert({
      source: "detectAnomalousBehavior",
      severity: "medium",
      title: "Comportamento anômalo",
      message: `${anomaly.probableCause}. ${anomaly.suggestedAction}`,
      fingerprint: `anomaly:${anomaly.timestamp}:${anomaly.probableCause}`,
      context: anomaly,
    }));
  }

  if (logs.length > 0) {
    const suggestion = suggestRootCauseFromLogs(logs.slice(-20));
    if (!suggestion.toLowerCase().includes("não conclusiva")) {
      createdOrUpdated.push(upsertObservabilityAlert({
        source: "suggestRootCauseFromLogs",
        severity: "medium",
        title: "Hipótese de causa raiz",
        message: suggestion,
        fingerprint: `root-cause:${suggestion.toLowerCase()}`,
        context: { based_on_logs: logs.slice(-5) },
      }));
    }
  }

  return createdOrUpdated;
};

export const listObservabilityAlerts = () =>
  Array.from(db.observabilityAlerts.values()).sort((a, b) => Date.parse(b.last_seen_at) - Date.parse(a.last_seen_at));

export const createInvite = (email: string) => {
  const token = crypto.randomBytes(24).toString("hex");
  const invite = {
    id: uid(),
    email,
    token_hash: hashInviteToken(token),
    expires_at: new Date(Date.now() + DAY_MS).toISOString(),
    created_at: now(),
  };
  db.invites.set(invite.id, invite);
  return { invite, token };
};

export const acceptInvite = (token: string, name: string, password: string) => {
  const tokenHash = hashInviteToken(token);
  const invite = Array.from(db.invites.values()).find((entry) => entry.token_hash === tokenHash && !entry.used_at);
  if (!invite || Date.parse(invite.expires_at) < Date.now()) return null;

  invite.used_at = now();
  const user: User = {
    id: uid(),
    email: invite.email,
    name,
    password_hash: hashPassword(password),
    role: "assistente",
    status: "active",
    created_at: now(),
  };
  db.users.set(user.id, user);
  return user;
};

export const login = (email: string, password: string) => {
  const user = Array.from(db.users.values()).find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!user || user.status !== "active" || !user.password_hash || !verifyPassword(password, user.password_hash)) return null;

  const token = crypto.randomBytes(24).toString("hex");
  db.sessionsTokens.set(token, {
    token,
    user_id: user.id,
    created_at: now(),
    expires_at: new Date(Date.now() + DAY_MS).toISOString(),
  });
  user.last_seen_at = now();
  return { user, token };
};

const findUserByEmail = (email: string) =>
  Array.from(db.users.values()).find((entry) => entry.email.toLowerCase() === email.toLowerCase()) ?? null;

export const createPatientAccess = (
  owner: string,
  payload: {
    patient_id: string;
    patient_email: string;
    patient_name: string;
    patient_password?: string;
    permissions?: Partial<PatientPermission>;
  },
) => {
  const existingUser = findUserByEmail(payload.patient_email);
  if (existingUser && existingUser.role !== "patient") {
    return { error: "EMAIL_IN_USE" as const };
  }

  let patientUser = existingUser;
  let temporaryPassword: string | undefined;
  if (!patientUser) {
    temporaryPassword = payload.patient_password ?? crypto.randomBytes(8).toString("hex");
    patientUser = {
      id: uid(),
      email: payload.patient_email,
      name: payload.patient_name,
      password_hash: hashPassword(temporaryPassword),
      role: "patient",
      status: "active",
      created_at: now(),
    };
    db.users.set(patientUser.id, patientUser);
  }

  const permissions: PatientPermission = { ...DEFAULT_PATIENT_PERMISSIONS, ...(payload.permissions ?? {}) };
  const existingAccess = Array.from(db.patientAccess.values()).find(
    (item) => item.owner_user_id === owner && item.patient_user_id === patientUser?.id && item.patient_id === payload.patient_id,
  );

  if (existingAccess) {
    existingAccess.permissions = permissions;
    return { access: existingAccess, patientUser, temporaryPassword };
  }

  const access: PatientAccess = {
    id: uid(),
    owner_user_id: owner,
    patient_user_id: patientUser.id,
    patient_id: payload.patient_id,
    permissions,
    created_at: now(),
  };
  db.patientAccess.set(access.id, access);
  return { access, patientUser, temporaryPassword };
};

export const getPatientAccessForUser = (patientUserId: string) =>
  Array.from(db.patientAccess.values()).find((item) => item.patient_user_id === patientUserId) ?? null;

export const listPatientSessions = (access: PatientAccess) =>
  Array.from(db.sessions.values()).filter((item) => item.owner_user_id === access.owner_user_id && item.patient_id === access.patient_id);

export const recordPatientScale = (access: PatientAccess, scaleId: string, score: number) => {
  if (!access.permissions.scales) return { error: "PERMISSION_DENIED" as const };
  const record = createScaleRecord(access.owner_user_id, scaleId, access.patient_id, score);
  createPatientNote(access.owner_user_id, access.patient_id, `Paciente respondeu escala ${scaleId} (score ${score}).`);
  return { record };
};

export const recordPatientDiaryEntry = (access: PatientAccess, content: string) => {
  if (!access.permissions.diary) return { error: "PERMISSION_DENIED" as const };
  const entry: PatientDiaryEntry = {
    id: uid(),
    owner_user_id: access.owner_user_id,
    patient_id: access.patient_id,
    patient_user_id: access.patient_user_id,
    content,
    created_at: now(),
  };
  db.patientDiary.set(entry.id, entry);
  createPatientNote(access.owner_user_id, access.patient_id, `Diário do paciente: ${content}`);
  return { entry };
};

export const confirmPatientSession = (access: PatientAccess, sessionId: string) => {
  if (!access.permissions.session_confirmation) return { error: "PERMISSION_DENIED" as const };
  const session = getByOwner(db.sessions, access.owner_user_id, sessionId);
  if (!session || session.patient_id !== access.patient_id) return { error: "NOT_FOUND" as const };
  session.status = "confirmed";
  createPatientNote(access.owner_user_id, access.patient_id, `Paciente confirmou sessão ${session.scheduled_at}.`);
  return { session };
};

const countMessagesInWindow = (patientUserId: string, windowMs: number) => {
  const since = Date.now() - windowMs;
  return Array.from(db.patientAsyncMessages.values()).filter(
    (item) => item.patient_user_id === patientUserId && Date.parse(item.created_at) >= since,
  ).length;
};

export const sendPatientAsyncMessage = (access: PatientAccess, message: string) => {
  const limit = access.permissions.async_messages_per_day;
  if (limit <= 0) return { error: "PERMISSION_DENIED" as const };
  const used = countMessagesInWindow(access.patient_user_id, DAY_MS);
  if (used >= limit) return { error: "LIMIT_REACHED" as const, limit };
  const payload: PatientAsyncMessage = {
    id: uid(),
    owner_user_id: access.owner_user_id,
    patient_id: access.patient_id,
    patient_user_id: access.patient_user_id,
    message,
    disclaimer: PATIENT_MESSAGE_DISCLAIMER,
    created_at: now(),
  };
  db.patientAsyncMessages.set(payload.id, payload);
  createPatientNote(access.owner_user_id, access.patient_id, `Mensagem assíncrona do paciente: ${message} (${PATIENT_MESSAGE_DISCLAIMER})`);
  return { payload, remaining: Math.max(0, limit - used - 1), disclaimer: PATIENT_MESSAGE_DISCLAIMER };
};

export const getUserFromToken = (token: string) => {
  const session = db.sessionsTokens.get(token);
  if (!session || Date.parse(session.expires_at) < Date.now()) return null;
  return db.users.get(session.user_id) ?? null;
};

export const logout = (token: string) => db.sessionsTokens.delete(token);

export const getByOwner = <T extends { owner_user_id: string; id: string }>(map: Map<string, T>, owner: string, id: string) => {
  const item = map.get(id);
  return item?.owner_user_id === owner ? item : null;
};

const byOwner = <T extends { owner_user_id: string }>(list: Iterable<T>, owner: string) => Array.from(list).filter((item) => item.owner_user_id === owner);
const templateStyles = `
  body { font-family: "Inter", "Helvetica", sans-serif; color: #0f172a; font-size: 14px; }
  h1, h2, h3 { margin-bottom: 16px; }
  p { line-height: 1.6; margin: 8px 0; }
  .doc-wrapper { padding: 32px; max-width: 720px; margin: 0 auto; }
`;

const renderTemplateHtml = (template: ClinicalTemplate, payload: TemplateRenderRequest) => {
  const combined = {
    psychologist: payload.globals.psychologist,
    patient: payload.globals.patient,
    city: payload.globals.city,
    date: payload.globals.date,
    signature: payload.globals.signature,
    ...payload.fields,
  } as Record<string, unknown>;

  const resolvePath = (path: string) => path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], combined);

  const body = template.html.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key: string) => {
    const value = resolvePath(key);
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
  });

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${templateStyles}</style>
      </head>
      <body>
        <div class="doc-wrapper">
          ${body}
        </div>
      </body>
    </html>
  `;
};

const normalizeCaseHistoryPolicy = (policy: Partial<CaseHistoryPolicy> = {}): CaseHistoryPolicy => ({
  window_days: Math.max(1, Math.floor(Number(policy.window_days ?? DEFAULT_CASE_HISTORY_POLICY.window_days))),
  max_sessions: Math.max(1, Math.floor(Number(policy.max_sessions ?? DEFAULT_CASE_HISTORY_POLICY.max_sessions))),
  max_notes: Math.max(1, Math.floor(Number(policy.max_notes ?? DEFAULT_CASE_HISTORY_POLICY.max_notes))),
  max_reports: Math.max(1, Math.floor(Number(policy.max_reports ?? DEFAULT_CASE_HISTORY_POLICY.max_reports))),
});

const sortByCreatedAtDesc = <T extends { created_at: string }>(items: T[]) =>
  [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

const withinWindow = (item: { created_at: string }, cutoffMs: number) => Date.parse(item.created_at) >= cutoffMs;

const buildCaseHistory = (owner: string, patientId: string, policy: CaseHistoryPolicy, referenceDate = new Date()) => {
  const cutoffMs = referenceDate.getTime() - policy.window_days * DAY_MS;
  const allSessions = byOwner(db.sessions.values(), owner).filter((session) => session.patient_id === patientId);
  const windowSessions = allSessions.filter((session) => withinWindow(session, cutoffMs));
  let retainedSessions = sortByCreatedAtDesc(windowSessions).slice(0, policy.max_sessions);
  if (retainedSessions.length === 0 && allSessions.length > 0) {
    retainedSessions = sortByCreatedAtDesc(allSessions).slice(0, 1);
  }
  const retainedSessionIds = new Set(retainedSessions.map((session) => session.id));

  const allNotes = byOwner(db.clinicalNotes.values(), owner).filter((note) => {
    const session = db.sessions.get(note.session_id);
    return session?.patient_id === patientId;
  });
  const windowNotes = allNotes.filter((note) => retainedSessionIds.has(note.session_id) && withinWindow(note, cutoffMs));
  let retainedNotes = sortByCreatedAtDesc(windowNotes).slice(0, policy.max_notes);
  if (retainedNotes.length === 0 && allNotes.length > 0) {
    retainedNotes = sortByCreatedAtDesc(allNotes.filter((note) => retainedSessionIds.has(note.session_id))).slice(0, 1);
  }
  const retainedNoteIds = new Set(retainedNotes.map((note) => note.id));

  const allReports = byOwner(db.reports.values(), owner).filter((report) => report.patient_id === patientId);
  const windowReports = allReports.filter((report) => withinWindow(report, cutoffMs));
  let retainedReports = sortByCreatedAtDesc(windowReports).slice(0, policy.max_reports);
  if (retainedReports.length === 0 && allReports.length > 0) {
    retainedReports = sortByCreatedAtDesc(allReports).slice(0, 1);
  }
  const retainedReportIds = new Set(retainedReports.map((report) => report.id));

  return {
    cutoffMs,
    allSessions,
    retainedSessions,
    retainedSessionIds,
    allNotes,
    retainedNotes,
    retainedNoteIds,
    allReports,
    retainedReports,
    retainedReportIds,
  };
};

const summarizePatientDecision = (rules: PatientRules) =>
  `Prazos: ${rules.reschedule_deadline_hours}h · Reposição: ${rules.replacement_policy} · Confirmação: ${rules.confirmation_required ? "obrigatória" : "flexível"}`;

const evaluatePatientAlertState = (owner: string, patientId: string, referenceDate = Date.now()): PatientAlertState => {
  const cutoff = referenceDate - 90 * DAY_MS;
  const missedSessions = Array.from(db.sessions.values()).filter((session) => {
    if (session.owner_user_id !== owner || session.patient_id !== patientId) return false;
    if (session.status !== "missed") return false;
    return Date.parse(session.scheduled_at) >= cutoff;
  });
  const missedCount = missedSessions.length;
  const lastMissedAt = missedSessions
    .map((session) => session.scheduled_at)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

  if (missedCount === 0) {
    return { ...buildDefaultPatientAlert(), updated_at: now() };
  }

  const level = missedCount >= 3 ? "high" : missedCount === 2 ? "medium" : "low";
  const reason = missedCount >= 3
    ? "Histórico de faltas recorrentes"
    : "Faltas recentes com necessidade de atenção";
  return {
    level,
    reason,
    missed_sessions_last_90_days: missedCount,
    last_missed_at: lastMissedAt,
    updated_at: now(),
  };
};

const refreshPatientAlertState = (owner: string, patientId: string, decidedBy?: string) => {
  const patient = Array.from(db.patients.values()).find((item) => item.owner_user_id === owner && item.external_id === patientId);
  if (!patient) return null;
  const nextAlert = evaluatePatientAlertState(owner, patientId);
  const previousLevel = patient.alert?.level ?? "none";
  patient.alert = nextAlert;
  if (previousLevel !== nextAlert.level && decidedBy) {
    const decision: PatientDecision = {
      decided_at: now(),
      decided_by: decidedBy,
      summary: `Alerta ajustado para ${nextAlert.level} (${nextAlert.missed_sessions_last_90_days} faltas em 90 dias).`,
    };
    patient.decision_history = [...(patient.decision_history ?? []), decision];
  }
  return patient.alert;
};

export const createPatientIfMissing = (owner: string, patientId: string): Patient => {
  const existing = Array.from(db.patients.values()).find((item) => item.owner_user_id === owner && item.external_id === patientId);
  if (existing) return existing;

  const patient: Patient = {
    id: uid(),
    owner_user_id: owner,
    external_id: patientId,
    label: `Paciente ${patientId}`,
    created_at: now(),
    rules: { ...defaultPatientRules },
    alert: buildDefaultPatientAlert(),
    decision_history: [],
  };
  db.patients.set(patient.id, patient);
  return patient;
};

export const listPatients = (owner: string) => byOwner(db.patients.values(), owner);
export const getPatient = (owner: string, patientId: string) => getByOwner(db.patients, owner, patientId);

export const updatePatientRules = (owner: string, patientId: string, patch: Partial<PatientRules>, decidedBy: string) => {
  const patient = Array.from(db.patients.values()).find((item) => item.owner_user_id === owner && item.external_id === patientId);
  if (!patient) return null;
  const nextRules = { ...defaultPatientRules, ...(patient.rules ?? {}), ...patch };
  patient.rules = nextRules;
  const decision: PatientDecision = {
    decided_at: now(),
    decided_by: decidedBy,
    summary: summarizePatientDecision(nextRules),
  };
  patient.decision_history = [...(patient.decision_history ?? []), decision];
  return patient;
};

export const createSession = (owner: string, patientId: string, scheduledAt: string): ClinicalSession => {
  const patient = createPatientIfMissing(owner, patientId);
  const session: ClinicalSession = {
    id: uid(),
    owner_user_id: owner,
    patient_id: patientId,
    scheduled_at: scheduledAt,
    status: "scheduled",
    created_at: now(),
    rules_snapshot: { ...(patient.rules ?? defaultPatientRules) },
  };
  db.sessions.set(session.id, session);
  return session;
};

export const patchSessionStatus = (owner: string, sessionId: string, status: SessionStatus) => {
  const session = getByOwner(db.sessions, owner, sessionId);
  if (!session) return null;
  session.status = status;
  refreshPatientAlertState(owner, session.patient_id, owner);
  return session;
};

export const addAudio = (owner: string, sessionId: string, filePath: string) => {
  const item = {
    id: uid(),
    owner_user_id: owner,
    session_id: sessionId,
    file_path_encrypted: encrypt(filePath),
    consent_confirmed: true as const,
    expires_at: new Date(Date.now() + 30 * DAY_MS).toISOString(),
    created_at: now(),
  };
  db.audioRecords.set(item.id, item);
  return item;
};

export const addTranscript = (owner: string, sessionId: string, rawText: string): Transcript => {
  const item = { id: uid(), owner_user_id: owner, session_id: sessionId, raw_text: rawText, segments: [{ start: 0, end: 1, text: rawText.slice(0, 120) }], created_at: now() };
  db.transcripts.set(item.id, item);
  return item;
};

export const createClinicalNoteDraft = (owner: string, sessionId: string, content: string): ClinicalNote => {
  const safeModeAlerts = buildSafeModeAlerts(content, false);
  const note = {
    id: uid(),
    owner_user_id: owner,
    session_id: sessionId,
    content,
    status: "draft" as const,
    version: 1,
    created_at: now(),
    safe_mode_alerts: safeModeAlerts,
  };
  db.clinicalNotes.set(note.id, note);
  recordProntuarioAudit(owner, "EDIT", "clinical_note", note.id);
  return note;
};

const createPatientNote = (owner: string, patientId: string, content: string) =>
  createClinicalNoteDraft(owner, patientId, content);
export const createPrivateComment = (owner: string, noteId: string, content: string): PrivateComment | null => {
  const note = getByOwner(db.clinicalNotes, owner, noteId);
  if (!note) return null;
  const comment: PrivateComment = {
    id: uid(),
    owner_user_id: owner,
    note_id: noteId,
    author_user_id: owner,
    content,
    created_at: now(),
  };
  db.privateComments.set(comment.id, comment);
  return comment;
};

export const listPrivateComments = (owner: string, noteId: string) =>
  byOwner(db.privateComments.values(), owner).filter((comment) => comment.note_id === noteId);

export const validateClinicalNote = (owner: string, noteId: string) => {
  const note = getByOwner(db.clinicalNotes, owner, noteId);
  if (!note) return null;
  note.status = "validated";
  note.validated_at = now();
  addTelemetry({ user_id: owner, event_type: "NOTE_VALIDATED" });
  recordProntuarioAudit(owner, "EDIT", "clinical_note", note.id);
  return note;
};

export const createReport = (owner: string, patientId: string, purpose: ClinicalReport["purpose"], content: string) => {
  const hasValidatedNote = byOwner(db.clinicalNotes.values(), owner).some((note) => {
    if (note.status !== "validated") return false;
    if (note.session_id === patientId) return true;

    const session = db.sessions.get(note.session_id);
    return session?.owner_user_id === owner && session.patient_id === patientId;
  });
  if (!hasValidatedNote) return null;

  const report = { id: uid(), owner_user_id: owner, patient_id: patientId, purpose, content, created_at: now() };
  db.reports.set(report.id, report);
  recordProntuarioAudit(owner, "EDIT", "report", report.id);
  return report;
};

export const listDocumentTemplates = (): DocumentTemplate[] => Array.from(db.documentTemplates.values());

export const createDocument = (owner: string, patientId: string, caseId: string, templateId: string, title: string): ClinicalDocument | null => {
  const template = db.documentTemplates.get(templateId);
  if (!template) return null;
  const document: ClinicalDocument = {
    id: uid(),
    owner_user_id: owner,
    patient_id: patientId,
    case_id: caseId,
    template_id: templateId,
    title,
    status: "draft",
    latest_version: 0,
    created_at: now(),
  };
  db.documents.set(document.id, document);
  return document;
};

export const addDocumentVersion = (
  owner: string,
  documentId: string,
  payload: { content: string; global_values: Record<string, string> },
): DocumentVersion | null => {
  const document = getByOwner(db.documents, owner, documentId);
  if (!document) return null;
  const template = db.documentTemplates.get(document.template_id);
  const alerts = buildSafeModeAlerts(payload.content, template?.type === "laudo");
  const version: DocumentVersion = {
    id: uid(),
    owner_user_id: owner,
    document_id: document.id,
    case_id: document.case_id,
    version: document.latest_version + 1,
    content: payload.content,
    global_values: payload.global_values,
    safe_mode_alerts: alerts,
    created_at: now(),
  };
  document.latest_version = version.version;
  db.documentVersions.set(version.id, version);
  return version;
};

export const listDocumentsByCase = (owner: string, caseId: string) =>
  Array.from(db.documents.values()).filter((item) => item.owner_user_id === owner && item.case_id === caseId);

export const listDocumentVersions = (owner: string, documentId: string) =>
  Array.from(db.documentVersions.values())
    .filter((item) => item.owner_user_id === owner && item.document_id === documentId)
    .sort((a, b) => b.version - a.version);

export const createAnamnesis = (owner: string, patientId: string, templateId: string, content: Record<string, unknown>): AnamnesisResponse => {
  const anamnesis = { id: uid(), owner_user_id: owner, patient_id: patientId, template_id: templateId, content, version: 1, created_at: now() };
  db.anamnesis.set(anamnesis.id, anamnesis);
  recordProntuarioAudit(owner, "EDIT", "anamnesis", anamnesis.id);
  return anamnesis;
};

export const createAnonymizedCase = (owner: string, payload: { title: string; summary: string; tags: string[] }): AnonymizedCase => {
  const item: AnonymizedCase = { id: uid(), owner_user_id: owner, created_at: now(), ...payload };
  db.anonymizedCases.set(item.id, item);
  return item;
};

export const listAnonymizedCases = (owner: string) => byOwner(db.anonymizedCases.values(), owner);

export const createScaleRecord = (owner: string, scaleId: string, patientId: string, score: number): ScaleRecord => {
  const record = { id: uid(), owner_user_id: owner, scale_id: scaleId, patient_id: patientId, score, recorded_at: now(), created_at: now() };
  db.scales.set(record.id, record);
  recordProntuarioAudit(owner, "EDIT", "scale_record", record.id);
  return record;
};

export const createFormEntry = (owner: string, patientId: string, formId: string, content: Record<string, unknown>): FormEntry => {
  const item = { id: uid(), owner_user_id: owner, patient_id: patientId, form_id: formId, content, created_at: now() };
  db.forms.set(item.id, item);
  recordProntuarioAudit(owner, "EDIT", "form_entry", item.id);
  return item;
};

export const createFinancialEntry = (owner: string, payload: Omit<FinancialEntry, "id" | "owner_user_id" | "created_at">): FinancialEntry => {
  const item = { ...payload, id: uid(), owner_user_id: owner, created_at: now() };
  db.financial.set(item.id, item);
  recordProntuarioAudit(owner, "EDIT", "financial_entry", item.id);
  return item;
};

const buildContractContent = (contract: Contract) => {
  return [
    "CONTRATO TERAPÊUTICO",
    "",
    `Psicólogo(a): ${contract.psychologist.name} (CRP ${contract.psychologist.license})`,
    `Contato: ${contract.psychologist.email}${contract.psychologist.phone ? ` · ${contract.psychologist.phone}` : ""}`,
    "",
    `Paciente: ${contract.patient.name}`,
    `Documento: ${contract.patient.document}`,
    `Email: ${contract.patient.email}`,
    "",
    "Condições:",
    `• Valor: ${contract.terms.value}`,
    `• Periodicidade: ${contract.terms.periodicity}`,
    `• Política de faltas: ${contract.terms.absence_policy}`,
    `• Forma de pagamento: ${contract.terms.payment_method}`,
    "",
    "Ao aceitar este contrato, ambas as partes concordam com os termos acima.",
  ].join("\n");
};

export const listContracts = (owner: string) => byOwner(db.contracts.values(), owner);

export const createContract = (owner: string, payload: Omit<Contract, "id" | "owner_user_id" | "created_at" | "status" | "version">) => {
  const contract: Contract = {
    ...payload,
    id: uid(),
    owner_user_id: owner,
    created_at: now(),
    status: "draft",
    version: 1,
  };
  db.contracts.set(contract.id, contract);
  return contract;
};

export const getContract = (owner: string, contractId: string) => getByOwner(db.contracts, owner, contractId);

export const sendContract = (owner: string, contractId: string) => {
  const contract = getByOwner(db.contracts, owner, contractId);
  if (!contract) return null;
  contract.status = "sent";
  contract.sent_at = now();
  if (!contract.portal_token) {
    contract.portal_token = crypto.randomBytes(PORTAL_TOKEN_BYTES).toString("hex");
  }
  return contract;
};

export const getContractByPortalToken = (token: string) => Array.from(db.contracts.values()).find((contract) => contract.portal_token === token) ?? null;

export const acceptContract = (token: string, acceptedBy: string, acceptedIp: string) => {
  const contract = getContractByPortalToken(token);
  if (!contract) return null;
  if (contract.status === "signed") return contract;

  contract.status = "signed";
  contract.signature = {
    accepted_by: acceptedBy,
    accepted_at: now(),
    accepted_ip: acceptedIp,
  };
  contract.signed_document = {
    version: contract.version,
    content: buildContractContent(contract),
    recorded_in_chart_at: now(),
  };
  return contract;
};

export const exportContract = (owner: string, contractId: string, format: "pdf" | "docx") => {
  const contract = getByOwner(db.contracts, owner, contractId);
  if (!contract) return null;
  const content = contract.signed_document?.content ?? buildContractContent(contract);
  const filename = `contrato-${contract.patient.name.replace(/\s+/g, "-").toLowerCase()}.${format}`;
  return {
    format,
    filename,
    generated_at: now(),
    content,
  };
};

export const createJob = (owner: string, type: JobType, resourceId?: string): Job => {
  const item = { id: uid(), owner_user_id: owner, type, status: "queued" as JobStatus, progress: 0, resource_id: resourceId, created_at: now(), updated_at: now() };
  db.jobs.set(item.id, item);
  return item;
};

export const getJob = (owner: string, jobId: string) => getByOwner(db.jobs, owner, jobId);

export const runJob = async (jobId: string, options: { rawText?: string }) => {
  const job = db.jobs.get(jobId);
  if (!job) return;

  job.status = "running";
  job.progress = 0.5;
  job.updated_at = now();
  await new Promise((resolve) => setTimeout(resolve, 20));

  if (job.type === "transcription" && job.resource_id) {
    const transcript = addTranscript(job.owner_user_id, job.resource_id, options.rawText ?? "");
    job.result_uri = `transcript:${transcript.id}`;
    addTelemetry({ user_id: job.owner_user_id, event_type: "TRANSCRIPTION_JOB_COMPLETED", duration_ms: Math.max(60_000, (options.rawText ?? "").length * 1_000) });
  }
  if (job.type === "export") {
    job.result_uri = `vault://exports/${job.owner_user_id}.enc`;
    addTelemetry({ user_id: job.owner_user_id, event_type: "EXPORT_PDF" });
  }
  if (job.type === "export_full") {
    job.result_uri = `vault://exports/full/${job.owner_user_id}.zip.enc`;
    addTelemetry({ user_id: job.owner_user_id, event_type: "EXPORT_FULL" });
  }
  if (job.type === "backup") {
    job.result_uri = `vault://backup/${job.owner_user_id}.enc`;
    addTelemetry({ user_id: job.owner_user_id, event_type: "BACKUP_CREATED" });
  }

  job.status = "completed";
  job.progress = 1;
  job.updated_at = now();
};

export const handleTranscriberWebhook = (jobId: string, status: JobStatus, errorCode?: string) => {
  const job = db.jobs.get(jobId);
  if (!job) return null;
  job.status = status;
  job.progress = status === "completed" ? 1 : job.progress;
  job.error_code = errorCode;
  job.updated_at = now();
  return job;
};

export const paginate = <T>(items: T[], page = 1, pageSize = 20) => ({
  items: items.slice((page - 1) * pageSize, page * pageSize),
  page,
  page_size: pageSize,
  total: items.length,
});

export const getRetentionPolicy = (owner: string) => {
  const existing = db.retentionPolicies.get(owner);
  if (existing) return existing;
  const created: RetentionPolicy = {
    id: uid(),
    owner_user_id: owner,
    ...defaultRetentionPolicy,
    created_at: now(),
    updated_at: now(),
  };
  db.retentionPolicies.set(owner, created);
  return created;
};

export const updateRetentionPolicy = (owner: string, updates: Partial<Pick<RetentionPolicy, "clinical_record_days" | "audit_days" | "export_days">>) => {
  const policy = getRetentionPolicy(owner);
  const next: RetentionPolicy = {
    ...policy,
    clinical_record_days: Number.isFinite(updates.clinical_record_days) && updates.clinical_record_days! > 0
      ? updates.clinical_record_days!
      : policy.clinical_record_days,
    audit_days: Number.isFinite(updates.audit_days) && updates.audit_days! > 0 ? updates.audit_days! : policy.audit_days,
    export_days: Number.isFinite(updates.export_days) && updates.export_days! > 0 ? updates.export_days! : policy.export_days,
    updated_at: now(),
  };
  db.retentionPolicies.set(owner, next);
  return next;
export const exportCase = (owner: string, patientId: string, policyOverrides: Partial<CaseHistoryPolicy> = {}) => {
  const patient = Array.from(db.patients.values()).find((item) => item.owner_user_id === owner && (item.external_id === patientId || item.id === patientId));
  if (!patient) return null;
  const policy = normalizeCaseHistoryPolicy(policyOverrides);
  const history = buildCaseHistory(owner, patient.external_id, policy);
  const cutoffMs = history.cutoffMs;
  const retainedSessionIds = history.retainedSessionIds;

  const audioRecords = byOwner(db.audioRecords.values(), owner).filter((record) => retainedSessionIds.has(record.session_id));
  const transcripts = byOwner(db.transcripts.values(), owner).filter((record) => retainedSessionIds.has(record.session_id));
  const anamnesis = byOwner(db.anamnesis.values(), owner).filter((item) => item.patient_id === patient.external_id && withinWindow(item, cutoffMs));
  const scales = byOwner(db.scales.values(), owner).filter((item) => item.patient_id === patient.external_id && withinWindow(item, cutoffMs));
  const forms = byOwner(db.forms.values(), owner).filter((item) => item.patient_id === patient.external_id && withinWindow(item, cutoffMs));
  const financial = byOwner(db.financial.values(), owner).filter((item) => item.patient_id === patient.external_id && withinWindow(item, cutoffMs));
  const closures = byOwner(db.caseClosures.values(), owner).filter((item) => item.patient_id === patient.external_id);

  return {
    patient,
    generated_at: now(),
    history_policy: policy,
    sessions: history.retainedSessions,
    clinical_notes: history.retainedNotes,
    reports: history.retainedReports,
    transcripts,
    audio_records: audioRecords,
    anamnesis,
    scales,
    forms,
    financial_entries: financial,
    closures,
  };
};

export const closeCase = (owner: string, patientId: string, payload: {
  reason: string;
  summary: string;
  next_steps?: string[];
  history_policy?: Partial<CaseHistoryPolicy>;
}) => {
  const patient = Array.from(db.patients.values()).find((item) => item.owner_user_id === owner && (item.external_id === patientId || item.id === patientId));
  if (!patient) return null;
  const policy = normalizeCaseHistoryPolicy(payload.history_policy ?? {});
  const history = buildCaseHistory(owner, patient.external_id, policy);

  for (const session of history.allSessions) {
    if (!history.retainedSessionIds.has(session.id)) db.sessions.delete(session.id);
  }
  for (const note of history.allNotes) {
    if (!history.retainedNoteIds.has(note.id)) db.clinicalNotes.delete(note.id);
  }
  for (const record of Array.from(db.audioRecords.values())) {
    if (record.owner_user_id !== owner) continue;
    if (history.retainedSessionIds.has(record.session_id)) continue;
    db.audioRecords.delete(record.id);
  }
  for (const record of Array.from(db.transcripts.values())) {
    if (record.owner_user_id !== owner) continue;
    if (history.retainedSessionIds.has(record.session_id)) continue;
    db.transcripts.delete(record.id);
  }
  for (const report of history.allReports) {
    if (!history.retainedReportIds.has(report.id)) db.reports.delete(report.id);
  }

  const cutoffMs = history.cutoffMs;
  const pruneByPatientWindow = <T extends { id: string; owner_user_id: string; patient_id: string; created_at: string }>(map: Map<string, T>) => {
    let pruned = 0;
    for (const [id, item] of map.entries()) {
      if (item.owner_user_id !== owner) continue;
      if (item.patient_id !== patient.external_id) continue;
      if (!withinWindow(item, cutoffMs)) {
        map.delete(id);
        pruned += 1;
      }
    }
    return pruned;
  };

  const anamnesisPruned = pruneByPatientWindow(db.anamnesis);
  const scalesPruned = pruneByPatientWindow(db.scales);
  const formsPruned = pruneByPatientWindow(db.forms);
  const financialPruned = pruneByPatientWindow(db.financial);

  const protocol: CaseClosureProtocol = {
    id: uid(),
    owner_user_id: owner,
    patient_id: patient.external_id,
    created_at: now(),
    closed_at: now(),
    reason: payload.reason,
    summary: payload.summary,
    next_steps: payload.next_steps ?? [],
    history_policy: policy,
    retained: {
      sessions: history.retainedSessions.length,
      notes: history.retainedNotes.length,
      reports: history.retainedReports.length,
    },
    discarded: {
      sessions: history.allSessions.length - history.retainedSessions.length,
      notes: history.allNotes.length - history.retainedNotes.length,
      reports: history.allReports.length - history.retainedReports.length,
    },
    supporting_pruned: {
      anamnesis: anamnesisPruned,
      scales: scalesPruned,
      forms: formsPruned,
      financial_entries: financialPruned,
    },
  };
  db.caseClosures.set(protocol.id, protocol);
  addTelemetry({ user_id: owner, event_type: "CASE_CLOSED" });

  return { protocol, retained_case: exportCase(owner, patient.external_id, policy) };
};

export const purgeUserData = (owner: string) => {
  const ownedMaps: Array<Map<string, { owner_user_id: string }>> = [
    db.patients,
    db.sessions,
    db.audioRecords,
    db.transcripts,
    db.clinicalNotes,
    db.privateComments,
    db.reports,
    db.anamnesis,
    db.scales,
    db.forms,
    db.financial,
    db.anonymizedCases,
    db.jobs,
    db.documents,
    db.documentVersions,
  ];
  for (const map of ownedMaps) {
    for (const [id, item] of map.entries()) {
      if (item.owner_user_id === owner) map.delete(id);
    }
  }

  for (const [id, item] of db.telemetry.entries()) {
    if (item.user_id === owner) db.telemetry.delete(id);
  }

  for (const [id, item] of db.audit.entries()) {
    if (item.actor_user_id === owner || item.target_user_id === owner) db.audit.delete(id);
  }

  for (const [token, item] of db.sessionsTokens.entries()) {
    if (item.user_id === owner) db.sessionsTokens.delete(token);
  }

  db.localEntitlements.delete(owner);
  db.retentionPolicies.delete(owner);

  for (const [queueOwner, queue] of db.telemetryQueue.entries()) {
    if (queueOwner === owner) {
      db.telemetryQueue.delete(queueOwner);
      continue;
    }
    db.telemetryQueue.set(queueOwner, queue.filter((event) => event.user_id !== owner));
  }
};

export const adminOverviewMetrics = () => ({
  users_total: db.users.size,
  users_active: Array.from(db.users.values()).filter((item) => item.status === "active").length,
  jobs_total: db.jobs.size,
  error_events: Array.from(db.telemetry.values()).filter((item) => Boolean(item.error_code)).length,
});

const defaultEntitlements: LocalEntitlementSnapshot["entitlements"] = {
  exports_enabled: true,
  backup_enabled: true,
  forms_enabled: true,
  scales_enabled: true,
  finance_enabled: true,
  transcription_minutes_per_month: 0,
  max_patients: 200,
  max_sessions_per_month: 10,
};

const getCurrentMonthWindow = (referenceDate = new Date()) => {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
  return { start, end };
};

export const syncLocalEntitlements = (owner: string, snapshot: {
  entitlements?: Partial<LocalEntitlementSnapshot["entitlements"]>;
  source_subscription_status?: LocalEntitlementSnapshot["source_subscription_status"];
  grace_until?: string;
  last_successful_subscription_validation_at?: string;
}) => {
  const previous = db.localEntitlements.get(owner);
  const value: LocalEntitlementSnapshot = {
    user_id: owner,
    entitlements: { ...defaultEntitlements, ...(previous?.entitlements ?? {}), ...(snapshot.entitlements ?? {}) },
    source_subscription_status: snapshot.source_subscription_status ?? previous?.source_subscription_status ?? "none",
    last_entitlements_sync_at: now(),
    last_successful_subscription_validation_at:
      snapshot.last_successful_subscription_validation_at
      ?? previous?.last_successful_subscription_validation_at,
    grace_until: snapshot.grace_until ?? previous?.grace_until,
  };
  db.localEntitlements.set(owner, value);
  return value;
};

export const resolveLocalEntitlements = (owner: string) => db.localEntitlements.get(owner) ?? syncLocalEntitlements(owner, { source_subscription_status: "none" });

const transcriptionMinutesUsedThisMonth = (owner: string) => {
  const { start, end } = getCurrentMonthWindow();
  return Array.from(db.telemetry.values())
    .filter((event) => {
      if (event.user_id !== owner || !event.event_type.includes("TRANSCRIPTION")) return false;
      const ts = new Date(event.ts);
      return ts >= start && ts < end;
    })
    .reduce((acc, item) => acc + Math.ceil((item.duration_ms ?? 0) / 60_000), 0);
};

export const canUseFeature = (owner: string, feature: "transcription" | "new_session" | "export" | "backup" | "forms" | "scales" | "finance") => {
  const entitlements = resolveLocalEntitlements(owner);
  const graceFromLastValidation = entitlements.last_successful_subscription_validation_at
    ? Date.parse(entitlements.last_successful_subscription_validation_at) + 14 * DAY_MS
    : 0;
  const withinGrace = Date.now() <= graceFromLastValidation
    || (Boolean(entitlements.grace_until) && Date.parse(entitlements.grace_until as string) > Date.now());

  if (feature === "export") return entitlements.entitlements.exports_enabled;
  if (feature === "backup") return entitlements.entitlements.backup_enabled;

  if (["past_due", "canceled"].includes(entitlements.source_subscription_status) && !withinGrace) return false;

  if (feature === "new_session") {
    const { start, end } = getCurrentMonthWindow();
    const monthlyCount = byOwner(db.sessions.values(), owner)
      .filter((item) => {
        const createdAt = new Date(item.created_at);
        return createdAt >= start && createdAt < end;
      })
      .length;
    return monthlyCount < entitlements.entitlements.max_sessions_per_month;
  }

  if (feature === "transcription") {
    return transcriptionMinutesUsedThisMonth(owner) < entitlements.entitlements.transcription_minutes_per_month;
  }

  if (feature === "forms") return entitlements.entitlements.forms_enabled;
  if (feature === "scales") return entitlements.entitlements.scales_enabled;
  if (feature === "finance") return entitlements.entitlements.finance_enabled;
  return false;
};

export const listSessionClinicalNotes = (owner: string, sessionId: string) => byOwner(db.clinicalNotes.values(), owner).filter((item) => item.session_id === sessionId);
export const getClinicalNote = (owner: string, noteId: string) => getByOwner(db.clinicalNotes, owner, noteId);
export const listScales = () => Array.from(db.scaleTemplates.values());
export const getReport = (owner: string, reportId: string) => getByOwner(db.reports, owner, reportId);
export const listTemplates = (owner: string) => byOwner(db.templates.values(), owner);
export const getTemplate = (owner: string, templateId: string) => getByOwner(db.templates, owner, templateId);

export const createTemplate = (owner: string, payload: Omit<ClinicalTemplate, "id" | "owner_user_id" | "created_at">) => {
  const template: ClinicalTemplate = { ...payload, id: uid(), owner_user_id: owner, created_at: now() };
  db.templates.set(template.id, template);
  return template;
};

export const updateTemplate = (owner: string, templateId: string, payload: Partial<Omit<ClinicalTemplate, "id" | "owner_user_id" | "created_at">>) => {
  const template = getByOwner(db.templates, owner, templateId);
  if (!template) return null;
  Object.assign(template, payload);
  return template;
};

export const deleteTemplate = (owner: string, templateId: string) => {
  const template = getByOwner(db.templates, owner, templateId);
  if (!template) return false;
  db.templates.delete(templateId);
  return true;
};

export const renderTemplate = (owner: string, templateId: string, payload: TemplateRenderRequest): TemplateRenderResponse | null => {
  const template = getByOwner(db.templates, owner, templateId);
  if (!template) return null;
  const html = renderTemplateHtml(template, payload);
  const format = payload.format ?? "html";
  const contentType = format === "html"
    ? "text/html"
    : format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const contentBase64 = Buffer.from(html).toString("base64");
  return { template_id: template.id, format, content_type: contentType, content_base64: contentBase64 };
};
