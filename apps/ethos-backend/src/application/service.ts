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
  ClinicalNote,
  ClinicalReport,
  ClinicalSession,
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
  ScaleRecord,
  SessionStatus,
  TelemetryEvent,
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
    role: "user",
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

export const createPatientIfMissing = (owner: string, patientId: string): Patient => {
  const existing = Array.from(db.patients.values()).find((item) => item.owner_user_id === owner && item.external_id === patientId);
  if (existing) return existing;

  const patient: Patient = { id: uid(), owner_user_id: owner, external_id: patientId, label: `Paciente ${patientId}`, created_at: now() };
  db.patients.set(patient.id, patient);
  return patient;
};

export const listPatients = (owner: string) => byOwner(db.patients.values(), owner);
export const getPatient = (owner: string, patientId: string) => getByOwner(db.patients, owner, patientId);

export const createSession = (owner: string, patientId: string, scheduledAt: string): ClinicalSession => {
  createPatientIfMissing(owner, patientId);
  const session: ClinicalSession = { id: uid(), owner_user_id: owner, patient_id: patientId, scheduled_at: scheduledAt, status: "scheduled", created_at: now() };
  db.sessions.set(session.id, session);
  return session;
};

export const patchSessionStatus = (owner: string, sessionId: string, status: SessionStatus) => {
  const session = getByOwner(db.sessions, owner, sessionId);
  if (!session) return null;
  session.status = status;
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
  const note = { id: uid(), owner_user_id: owner, session_id: sessionId, content, status: "draft" as const, version: 1, created_at: now() };
  db.clinicalNotes.set(note.id, note);
  return note;
};

const createPatientNote = (owner: string, patientId: string, content: string) =>
  createClinicalNoteDraft(owner, patientId, content);

export const validateClinicalNote = (owner: string, noteId: string) => {
  const note = getByOwner(db.clinicalNotes, owner, noteId);
  if (!note) return null;
  note.status = "validated";
  note.validated_at = now();
  addTelemetry({ user_id: owner, event_type: "NOTE_VALIDATED" });
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
  return report;
};

export const createAnamnesis = (owner: string, patientId: string, templateId: string, content: Record<string, unknown>): AnamnesisResponse => {
  const anamnesis = { id: uid(), owner_user_id: owner, patient_id: patientId, template_id: templateId, content, version: 1, created_at: now() };
  db.anamnesis.set(anamnesis.id, anamnesis);
  return anamnesis;
};

export const createScaleRecord = (owner: string, scaleId: string, patientId: string, score: number): ScaleRecord => {
  const record = { id: uid(), owner_user_id: owner, scale_id: scaleId, patient_id: patientId, score, recorded_at: now(), created_at: now() };
  db.scales.set(record.id, record);
  return record;
};

export const createFormEntry = (owner: string, patientId: string, formId: string, content: Record<string, unknown>): FormEntry => {
  const item = { id: uid(), owner_user_id: owner, patient_id: patientId, form_id: formId, content, created_at: now() };
  db.forms.set(item.id, item);
  return item;
};

export const createFinancialEntry = (owner: string, payload: Omit<FinancialEntry, "id" | "owner_user_id" | "created_at">): FinancialEntry => {
  const item = { ...payload, id: uid(), owner_user_id: owner, created_at: now() };
  db.financial.set(item.id, item);
  return item;
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

export const purgeUserData = (owner: string) => {
  const ownedMaps: Array<Map<string, { owner_user_id: string }>> = [
    db.patients,
    db.sessions,
    db.audioRecords,
    db.transcripts,
    db.clinicalNotes,
    db.reports,
    db.anamnesis,
    db.scales,
    db.forms,
    db.financial,
    db.jobs,
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
