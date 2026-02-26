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
  ClinicalDocument,
  ClinicalDocumentVersion,
  ClinicalNote,
  ClinicalReport,
  ClinicalSession,
  DocumentTemplate,
  FinancialEntry,
  FormEntry,
  Job,
  JobStatus,
  JobType,
  LocalEntitlementSnapshot,
  ObservabilityAlert,
  Patient,
  ScaleRecord,
  SessionStatus,
  TelemetryEvent,
  Transcript,
  User,
} from "../domain/types";

const now = seeds.now;
const DAY_MS = 86_400_000;

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

type PatientAccessPermissions = {
  scales: boolean;
  diary: boolean;
  session_confirmation: boolean;
  async_messages_per_day: number;
};

type PatientAccess = {
  id: string;
  owner_user_id: string;
  patient_user_id: string;
  patient_id: string;
  permissions: PatientAccessPermissions;
  created_at: string;
};

type Contract = {
  id: string;
  owner_user_id: string;
  patient_id: string;
  psychologist: { name: string; license: string; email: string; phone?: string };
  patient: { name: string; email: string; document: string };
  terms: { value: string; periodicity: string; absence_policy: string; payment_method: string };
  status: "draft" | "sent" | "accepted";
  portal_token?: string;
  accepted_by?: string;
  accepted_at?: string;
  accepted_ip?: string;
  created_at: string;
  updated_at: string;
};

type RetentionPolicy = {
  owner_user_id: string;
  clinical_record_days: number;
  audit_days: number;
  export_days: number;
};

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

export const createPatientAccess = (owner: string, input: {
  patient_id: string;
  patient_email: string;
  patient_name: string;
  patient_password?: string;
  permissions?: Partial<PatientAccessPermissions>;
}) => {
  const sameEmail = Array.from(db.users.values()).find((item) => item.email.toLowerCase() === input.patient_email.toLowerCase());
  if (sameEmail && sameEmail.role !== "patient") return { error: "EMAIL_IN_USE" as const };

  const temporaryPassword = input.patient_password || "patient123";
  const patientUser = sameEmail ?? {
    id: uid(),
    email: input.patient_email,
    name: input.patient_name,
    password_hash: hashPassword(temporaryPassword),
    role: "patient" as const,
    status: "active" as const,
    created_at: now(),
  };
  db.users.set(patientUser.id, patientUser);

  createPatientIfMissing(owner, input.patient_id);
  const access: PatientAccess = {
    id: uid(),
    owner_user_id: owner,
    patient_user_id: patientUser.id,
    patient_id: input.patient_id,
    permissions: {
      scales: input.permissions?.scales ?? true,
      diary: input.permissions?.diary ?? true,
      session_confirmation: input.permissions?.session_confirmation ?? true,
      async_messages_per_day: input.permissions?.async_messages_per_day ?? 3,
    },
    created_at: now(),
  };
  db.patientAccess.set(access.id, access);
  return { access, patientUser, temporaryPassword: input.patient_password ? undefined : temporaryPassword };
};

export const getPatientAccessForUser = (patientUserId: string) =>
  Array.from(db.patientAccess.values()).find((item) => (item as PatientAccess).patient_user_id === patientUserId) as PatientAccess | undefined;

export const listPatientSessions = (access: PatientAccess) =>
  byOwner(db.sessions.values(), access.owner_user_id).filter((item) => item.patient_id === access.patient_id);

export const confirmPatientSession = (access: PatientAccess, sessionId: string) => {
  if (!access.permissions.session_confirmation) return { error: "PERMISSION_DENIED" as const };
  const session = getByOwner(db.sessions, access.owner_user_id, sessionId);
  if (!session || session.patient_id !== access.patient_id) return { error: "NOT_FOUND" as const };
  session.status = "confirmed";
  return { session };
};

export const recordPatientScale = (access: PatientAccess, scaleId: string, score: number) => {
  if (!access.permissions.scales) return { error: "PERMISSION_DENIED" as const };
  return { record: createScaleRecord(access.owner_user_id, scaleId, access.patient_id, score) };
};

export const recordPatientDiaryEntry = (access: PatientAccess, content: string) => {
  if (!access.permissions.diary) return { error: "PERMISSION_DENIED" as const };
  const entry = { id: uid(), owner_user_id: access.owner_user_id, patient_id: access.patient_id, content, created_at: now() };
  db.patientDiaryEntries.set(entry.id, entry);
  return { entry };
};

export const sendPatientAsyncMessage = (access: PatientAccess, message: string) => {
  const today = now().slice(0, 10);
  const todayCount = Array.from(db.patientMessages.values()).filter(
    (item) => (item as { owner_user_id: string; patient_id: string; created_at: string }).owner_user_id === access.owner_user_id
      && (item as { owner_user_id: string; patient_id: string; created_at: string }).patient_id === access.patient_id
      && (item as { created_at: string }).created_at.startsWith(today),
  ).length;
  if (todayCount >= access.permissions.async_messages_per_day) return { error: "LIMIT_REACHED" as const };
  const payload = { id: uid(), owner_user_id: access.owner_user_id, patient_id: access.patient_id, message, created_at: now() };
  db.patientMessages.set(payload.id, payload);
  return {
    payload,
    remaining: Math.max(0, access.permissions.async_messages_per_day - (todayCount + 1)),
    disclaimer: "Mensagens assíncronas não substituem atendimento de urgência.",
  };
};

export const createContract = (owner: string, input: Omit<Contract, "id" | "owner_user_id" | "status" | "created_at" | "updated_at">) => {
  const contract: Contract = {
    id: uid(),
    owner_user_id: owner,
    status: "draft",
    created_at: now(),
    updated_at: now(),
    ...input,
  };
  db.contracts.set(contract.id, contract);
  return contract;
};

export const listContracts = (owner: string) => byOwner(db.contracts.values() as Iterable<Contract>, owner);
export const getContract = (owner: string, id: string) => getByOwner(db.contracts as Map<string, Contract>, owner, id);

export const sendContract = (owner: string, id: string) => {
  const contract = getContract(owner, id);
  if (!contract) return null;
  contract.status = "sent";
  contract.portal_token = contract.portal_token ?? crypto.randomBytes(12).toString("hex");
  contract.updated_at = now();
  return contract;
};

export const getContractByPortalToken = (portalToken: string) =>
  Array.from(db.contracts.values()).find((item) => (item as Contract).portal_token === portalToken) as Contract | undefined;

export const acceptContract = (portalToken: string, acceptedBy: string, acceptedIp: string) => {
  const contract = getContractByPortalToken(portalToken);
  if (!contract) return null;
  contract.status = "accepted";
  contract.accepted_by = acceptedBy;
  contract.accepted_ip = acceptedIp;
  contract.accepted_at = now();
  contract.updated_at = now();
  return contract;
};

export const exportContract = (owner: string, id: string, format: "pdf" | "docx") => {
  const contract = getContract(owner, id);
  if (!contract) return null;
  return { contract_id: id, format, content: JSON.stringify(contract) };
};

const defaultDocumentTemplates: Array<{ id: string; title: string; description?: string; html: string }> = [
  { id: "session-summary", title: "Resumo de sessão", html: "<h1>{{title}}</h1>{{content}}" },
  { id: "evolution-note", title: "Nota de evolução", html: "<h1>Evolução</h1>{{content}}" },
];

for (const template of defaultDocumentTemplates) {
  if (!db.documentTemplates.has(template.id)) {
    db.documentTemplates.set(template.id, {
      id: template.id,
      owner_user_id: "system",
      created_at: now(),
      title: template.title,
      description: template.description,
      version: 1,
      html: template.html,
      fields: [],
    });
  }
}

export const listDocumentTemplates = () => Array.from(db.documentTemplates.values());

export const createDocument = (owner: string, patientId: string, caseId: string, templateId: string, title: string): ClinicalDocument | null => {
  const template = db.documentTemplates.get(templateId);
  if (!template) return null;
  const item: ClinicalDocument = {
    id: uid(),
    owner_user_id: owner,
    created_at: now(),
    patient_id: patientId,
    case_id: caseId,
    template_id: template.id,
    title,
  };
  db.documents.set(item.id, item);
  return item;
};

export const listDocumentsByCase = (owner: string, caseId: string) =>
  byOwner(db.documents.values(), owner).filter((item) => item.case_id === caseId);

export const addDocumentVersion = (owner: string, documentId: string, input: { content: string; global_values: Record<string, string> }) => {
  const document = getByOwner(db.documents, owner, documentId);
  if (!document) return null;
  const existing = listDocumentVersions(owner, documentId);
  const item: ClinicalDocumentVersion = {
    id: uid(),
    owner_user_id: owner,
    created_at: now(),
    document_id: documentId,
    version: existing.length + 1,
    content: input.content,
    global_values: input.global_values,
  };
  db.documentVersions.set(item.id, item);
  return item;
};

export const listDocumentVersions = (owner: string, documentId: string) =>
  byOwner(db.documentVersions.values(), owner).filter((item) => item.document_id === documentId);

type TemplateInput = {
  title: string;
  description?: string;
  version: number;
  html: string;
  fields: Array<{ key: string; label: string; required?: boolean }>;
};

export const listTemplates = (owner: string) => byOwner(db.documentTemplates.values(), owner);
export const getTemplate = (owner: string, id: string) => getByOwner(db.documentTemplates, owner, id);

export const createTemplate = (owner: string, input: TemplateInput): DocumentTemplate => {
  const item: DocumentTemplate = { id: uid(), owner_user_id: owner, created_at: now(), ...input };
  db.documentTemplates.set(item.id, item);
  return item;
};

export const updateTemplate = (owner: string, id: string, input: Partial<TemplateInput>) => {
  const template = getTemplate(owner, id);
  if (!template) return null;
  Object.assign(template, input);
  db.documentTemplates.set(id, template);
  return template;
};

export const deleteTemplate = (owner: string, id: string) => {
  const template = getTemplate(owner, id);
  if (!template) return false;
  db.documentTemplates.delete(id);
  return true;
};

export const renderTemplate = (owner: string, id: string, input: {
  globals: Record<string, string>;
  fields: Record<string, string>;
  format: "html" | "pdf" | "docx";
}) => {
  const template = getTemplate(owner, id);
  if (!template) return null;
  const html = template.html.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => input.fields[key] ?? input.globals[key] ?? "");
  return { format: input.format, content: html, template_id: template.id };
};

export const createPrivateComment = (owner: string, noteId: string, content: string) => {
  const note = getByOwner(db.clinicalNotes, owner, noteId);
  if (!note) return null;
  const item = { id: uid(), owner_user_id: owner, note_id: noteId, content, created_at: now() };
  db.privateComments.set(item.id, item);
  return item;
};

export const listPrivateComments = (owner: string, noteId: string) =>
  byOwner(db.privateComments.values() as Iterable<{ owner_user_id: string; note_id: string }>, owner).filter((item) => item.note_id === noteId);

export const recordProntuarioAudit = (owner: string, action: string, resource: string, resourceId?: string) =>
  addAudit(owner, `PRONTUARIO_${action}_${resource.toUpperCase()}`, resourceId);

export const createAnonymizedCase = (owner: string, input: { title: string; summary: string; tags: string[] }) => {
  const item = { id: uid(), owner_user_id: owner, created_at: now(), ...input };
  db.anonymizedCases.set(item.id, item);
  return item;
};

export const listAnonymizedCases = (owner: string) => byOwner(db.anonymizedCases.values() as Iterable<{ owner_user_id: string }>, owner);

export const exportCase = (
  owner: string,
  patientId: string,
  options: { window_days?: number; max_sessions?: number; max_notes?: number; max_reports?: number },
) => {
  const patient = byOwner(db.patients.values(), owner).find((item) => item.external_id === patientId);
  if (!patient) return null;
  return { patient, options, sessions: byOwner(db.sessions.values(), owner).filter((item) => item.patient_id === patientId) };
};

export const closeCase = (
  owner: string,
  patientId: string,
  input: {
    reason: string;
    summary: string;
    next_steps: string[];
    history_policy: { window_days?: number; max_sessions?: number; max_notes?: number; max_reports?: number };
  },
) => {
  const payload = exportCase(owner, patientId, input.history_policy);
  if (!payload) return null;
  return { ...payload, close_reason: input.reason, close_summary: input.summary, next_steps: input.next_steps };
};

const defaultRetentionPolicy = (owner: string): RetentionPolicy => ({ owner_user_id: owner, clinical_record_days: 3650, audit_days: 3650, export_days: 365 });

export const getRetentionPolicy = (owner: string): RetentionPolicy =>
  (db.retentionPolicies.get(owner) as RetentionPolicy | undefined) ?? defaultRetentionPolicy(owner);

export const updateRetentionPolicy = (owner: string, input: Partial<Omit<RetentionPolicy, "owner_user_id">>) => {
  const next = { ...getRetentionPolicy(owner), ...input, owner_user_id: owner };
  db.retentionPolicies.set(owner, next);
  return next;
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
  job.progress = status === "completed" || status === "succeeded" ? 1 : job.progress;
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
