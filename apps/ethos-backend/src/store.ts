import crypto from "node:crypto";
import type {
  AnamnesisResponse,
  AuditEvent,
  AnamnesisTemplate,
  AudioRecord,
  ClinicalNote,
  ClinicalReport,
  FinancialEntry,
  FormEntry,
  Invite,
  Patient,
  FormTemplate,
  Patient,
  Receipt,
  Scale,
  ScaleRecord,
  Session,
  SessionStatus,
  SessionToken,
  TelemetryEvent,
  TelemetryEventType,
  Transcript,
  TranscriptJob,
  Transcript,
  User,
} from "./types";

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

const APP_VERSION = "ethos-backend@1";
const WORKER_VERSION = "ethos-transcriber@1";

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
};

export const verifyPassword = (password: string, encoded: string) => {
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(derived));
};

const hashInviteToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const db = {
  users: new Map<string, User>(),
  invites: new Map<string, Invite>(),
  sessionsTokens: new Map<string, SessionToken>(),

  patients: new Map<string, Patient>(),
  sessions: new Map<string, Session>(),
  audioRecords: new Map<string, AudioRecord>(),
  transcriptJobs: new Map<string, TranscriptJob>(),
  transcripts: new Map<string, Transcript>(),
  clinicalNotes: new Map<string, ClinicalNote>(),
  reports: new Map<string, ClinicalReport>(),
  anamnesisResponses: new Map<string, AnamnesisResponse>(),
  scales: new Map<string, Scale>(),
  scaleRecords: new Map<string, ScaleRecord>(),
  formEntries: new Map<string, FormEntry>(),
  financialEntries: new Map<string, FinancialEntry>(),

  telemetry: new Map<string, TelemetryEvent>(),
  audit: new Map<string, AuditEvent>(),
};

const adminId = id();
db.users.set(adminId, {
  id: adminId,
  email: "camila@ethos.local",
  name: "Camila",
  password_hash: hashPassword("admin123"),
  role: "admin",
  status: "active",
  created_at: now(),
});

export const seeds = { adminId };

export const addAudit = (actorUserId: string, event: string, targetUserId?: string) => {
  const item: AuditEvent = { id: id(), actor_user_id: actorUserId, event, target_user_id: targetUserId, ts: now() };
  db.audit.set(item.id, item);
  return item;
};

export const addTelemetry = (userId: string, eventType: TelemetryEventType, durationMs?: number, errorCode?: string) => {
  const item: TelemetryEvent = {
    id: id(),
    user_id: userId,
    event_type: eventType,
    ts: now(),
    duration_ms: durationMs,
    error_code: errorCode,
    app_version: APP_VERSION,
    worker_version: WORKER_VERSION,
  };
  db.telemetry.set(item.id, item);
  return item;
};

export const createInvite = (email: string, ttlMinutes = 60 * 24) => {
  const rawToken = crypto.randomBytes(24).toString("hex");
  const invite: Invite = {
    id: id(),
    email,
    token: hashInviteToken(rawToken),
    expires_at: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
    created_at: now(),
  };
  db.invites.set(invite.id, invite);
  return { invite, rawToken };
};

export const acceptInvite = (rawToken: string, name: string, password: string) => {
  const token = hashInviteToken(rawToken);
  const invite = Array.from(db.invites.values()).find((entry) => entry.token === token && !entry.used_at);
  if (!invite || new Date(invite.expires_at).getTime() < Date.now()) return null;
  invite.used_at = now();

  const existing = Array.from(db.users.values()).find((item) => item.email.toLowerCase() === invite.email.toLowerCase());
  if (existing) {
    existing.status = "active";
    existing.name = name;
    existing.password_hash = hashPassword(password);
    return existing;
  }

  const user: User = {
    id: id(),
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
  if (!user || user.status !== "active" || !user.password_hash) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  user.last_seen_at = now();

  const token = crypto.randomBytes(24).toString("hex");
  db.sessionsTokens.set(token, {
    token,
    user_id: user.id,
    created_at: now(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  });
  return { token, user };
};

export const getUserFromSessionToken = (token: string) => {
  const session = db.sessionsTokens.get(token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.sessionsTokens.delete(token);
    return null;
  }
  return db.users.get(session.user_id) ?? null;
};

export const logout = (token: string) => db.sessionsTokens.delete(token);

export const createSession = (ownerUserId: string, patientId: string, scheduledAt: string) => {
  const session: Session = { id: id(), owner_user_id: ownerUserId, patient_id: patientId, scheduled_at: scheduledAt, status: "scheduled", created_at: now() };
export const db = {
  users: new Map<string, User>(),
  patients: new Map<string, Patient>(),
  sessions: new Map<string, Session>(),
  audioRecords: new Map<string, AudioRecord>(),
  transcripts: new Map<string, Transcript>(),
  clinicalNotes: new Map<string, ClinicalNote>(),
  reports: new Map<string, ClinicalReport>(),
  anamnesisTemplates: new Map<string, AnamnesisTemplate>(),
  anamnesisResponses: new Map<string, AnamnesisResponse>(),
  scales: new Map<string, Scale>(),
  scaleRecords: new Map<string, ScaleRecord>(),
  formTemplates: new Map<string, FormTemplate>(),
  formEntries: new Map<string, FormEntry>(),
  financialEntries: new Map<string, FinancialEntry>(),
  receipts: new Map<string, Receipt>(),
};

const defaultUserId = id();
db.users.set(defaultUserId, { id: defaultUserId, name: "Default Psychologist", email: "local@ethos", role: "psychologist", created_at: now() });

const defaultPatientId = id();
db.patients.set(defaultPatientId, { id: defaultPatientId, user_id: defaultUserId, name: "Paciente Offline", contact_info: "local", created_at: now() });

export const seeds = { defaultUserId, defaultPatientId };

export const createSession = (patientId: string, scheduledAt: string) => {
  const session: Session = { id: id(), patient_id: patientId, scheduled_at: scheduledAt, status: "scheduled", created_at: now() };
  db.sessions.set(session.id, session);
  return session;
};

export const listSessions = (ownerUserId: string) => Array.from(db.sessions.values()).filter((s) => s.owner_user_id === ownerUserId);

export const getSession = (ownerUserId: string, sessionId: string) => {
  const s = db.sessions.get(sessionId);
  return s && s.owner_user_id === ownerUserId ? s : null;
};

export const patchSessionStatus = (ownerUserId: string, sessionId: string, status: SessionStatus) => {
  const session = getSession(ownerUserId, sessionId);
export const patchSessionStatus = (sessionId: string, status: SessionStatus) => {
  const session = db.sessions.get(sessionId);
  if (!session) return null;
  session.status = status;
  return session;
};

export const addAudio = (ownerUserId: string, sessionId: string, encryptedPath: string, consentConfirmed: boolean) => {
  const record: AudioRecord = {
    id: id(),
    owner_user_id: ownerUserId,
export const addAudio = (sessionId: string, encryptedPath: string, consentConfirmed: boolean) => {
  const record: AudioRecord = {
    id: id(),
    session_id: sessionId,
    file_path: encryptedPath,
    consent_confirmed: consentConfirmed,
    created_at: now(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  };
  db.audioRecords.set(record.id, record);
  return record;
};

export const createTranscriptionJob = (ownerUserId: string, sessionId: string) => {
  const job: TranscriptJob = {
    id: id(),
    owner_user_id: ownerUserId,
    session_id: sessionId,
    status: "queued",
    progress: 0,
    created_at: now(),
    updated_at: now(),
  };
  db.transcriptJobs.set(job.id, job);
  return job;
};

export const getTranscriptionJob = (ownerUserId: string, jobId: string) => {
  const job = db.transcriptJobs.get(jobId);
  return job && job.owner_user_id === ownerUserId ? job : null;
};

export const runTranscriptionJob = async (jobId: string, rawText: string) => {
  const job = db.transcriptJobs.get(jobId);
  if (!job) return;
  job.status = "running";
  job.progress = 0.3;
  job.updated_at = now();

  await new Promise((resolve) => setTimeout(resolve, 30));

  const transcript: Transcript = {
    id: id(),
    owner_user_id: job.owner_user_id,
    session_id: job.session_id,
export const addTranscript = (sessionId: string, rawText: string) => {
  const transcript: Transcript = {
    id: id(),
    session_id: sessionId,
    raw_text: rawText,
    segments: [{ start: 0, end: 1, text: rawText.slice(0, 80) }],
    created_at: now(),
  };
  db.transcripts.set(transcript.id, transcript);

  job.status = "completed";
  job.progress = 1;
  job.transcript_id = transcript.id;
  job.updated_at = now();
  addTelemetry(job.owner_user_id, "TRANSCRIBE_SUCCESS");
};

export const createClinicalNoteDraft = (ownerUserId: string, sessionId: string, content: string) => {
  const version = Array.from(db.clinicalNotes.values()).filter((n) => n.session_id === sessionId && n.owner_user_id === ownerUserId).length + 1;
  const note: ClinicalNote = { id: id(), owner_user_id: ownerUserId, session_id: sessionId, content, status: "draft", version, created_at: now() };
  return transcript;
};

export const createClinicalNoteDraft = (sessionId: string, content: string) => {
  const version = Array.from(db.clinicalNotes.values()).filter((n) => n.session_id === sessionId).length + 1;
  const note: ClinicalNote = { id: id(), session_id: sessionId, content, status: "draft", version, created_at: now() };
  db.clinicalNotes.set(note.id, note);
  return note;
};

export const listSessionClinicalNotes = (ownerUserId: string, sessionId: string) =>
  Array.from(db.clinicalNotes.values()).filter((n) => n.owner_user_id === ownerUserId && n.session_id === sessionId);

export const getClinicalNote = (ownerUserId: string, noteId: string) => {
  const note = db.clinicalNotes.get(noteId);
  return note && note.owner_user_id === ownerUserId ? note : null;
};

export const validateClinicalNote = (ownerUserId: string, noteId: string) => {
  const note = getClinicalNote(ownerUserId, noteId);
export const validateClinicalNote = (noteId: string) => {
  const note = db.clinicalNotes.get(noteId);
  if (!note) return null;
  note.status = "validated";
  note.validated_at = now();
  return note;
};

export const createReport = (ownerUserId: string, patientId: string, purpose: "instituição" | "profissional" | "paciente", content: string) => {
  const sessionIds = Array.from(db.sessions.values()).filter((s) => s.owner_user_id === ownerUserId && s.patient_id === patientId).map((s) => s.id);
  const hasValidated = Array.from(db.clinicalNotes.values()).some((n) => n.owner_user_id === ownerUserId && sessionIds.includes(n.session_id) && n.status === "validated");
  if (!hasValidated) return null;
  const report: ClinicalReport = { id: id(), owner_user_id: ownerUserId, patient_id: patientId, purpose, content, created_at: now() };
export const createReport = (patientId: string, purpose: "instituição" | "profissional" | "paciente", content: string) => {
  const sessionIds = Array.from(db.sessions.values()).filter((s) => s.patient_id === patientId).map((s) => s.id);
  const hasValidated = Array.from(db.clinicalNotes.values()).some((n) => sessionIds.includes(n.session_id) && n.status === "validated");
  if (!hasValidated) return null;
  const report: ClinicalReport = { id: id(), patient_id: patientId, purpose, content, created_at: now() };
  db.reports.set(report.id, report);
  return report;
};

export const listReports = (ownerUserId: string) => Array.from(db.reports.values()).filter((r) => r.owner_user_id === ownerUserId);
export const getReport = (ownerUserId: string, reportId: string) => {
  const report = db.reports.get(reportId);
  return report && report.owner_user_id === ownerUserId ? report : null;
};

export const createAnamnesis = (ownerUserId: string, patientId: string, templateId: string, content: Record<string, unknown>) => {
  const version = Array.from(db.anamnesisResponses.values()).filter((a) => a.owner_user_id === ownerUserId && a.patient_id === patientId && a.template_id === templateId).length + 1;
  const response: AnamnesisResponse = { id: id(), owner_user_id: ownerUserId, patient_id: patientId, template_id: templateId, content, version, created_at: now() };
export const createAnamnesis = (patientId: string, templateId: string, content: Record<string, unknown>) => {
  const version = Array.from(db.anamnesisResponses.values()).filter((a) => a.patient_id === patientId && a.template_id === templateId).length + 1;
  const response: AnamnesisResponse = { id: id(), patient_id: patientId, template_id: templateId, content, version, created_at: now() };
  db.anamnesisResponses.set(response.id, response);
  return response;
};

export const listAnamnesis = (ownerUserId: string) => Array.from(db.anamnesisResponses.values()).filter((a) => a.owner_user_id === ownerUserId);

export const createScaleRecord = (ownerUserId: string, scaleId: string, patientId: string, score: number) => {
  const record: ScaleRecord = { id: id(), owner_user_id: ownerUserId, scale_id: scaleId, patient_id: patientId, score, recorded_at: now() };
export const createScaleRecord = (scaleId: string, patientId: string, score: number) => {
  const record: ScaleRecord = { id: id(), scale_id: scaleId, patient_id: patientId, score, recorded_at: now() };
  db.scaleRecords.set(record.id, record);
  return record;
};

export const listScales = (ownerUserId: string) => Array.from(db.scales.values()).filter((s) => s.owner_user_id === ownerUserId);

export const listScaleRecords = (ownerUserId: string, patientId?: string) =>
  Array.from(db.scaleRecords.values()).filter((r) => r.owner_user_id === ownerUserId && (!patientId || r.patient_id === patientId));

export const createFormEntry = (ownerUserId: string, patientId: string, formId: string, content: Record<string, unknown>) => {
  const entry: FormEntry = { id: id(), owner_user_id: ownerUserId, patient_id: patientId, form_id: formId, content, created_at: now() };
export const createFormEntry = (patientId: string, formId: string, content: Record<string, unknown>) => {
  const entry: FormEntry = { id: id(), patient_id: patientId, form_id: formId, content, created_at: now() };
  db.formEntries.set(entry.id, entry);
  return entry;
};

export const listForms = (ownerUserId: string) => Array.from(db.formEntries.values()).filter((f) => f.owner_user_id === ownerUserId);

export const createFinancialEntry = (ownerUserId: string, payload: Omit<FinancialEntry, "id" | "owner_user_id">) => {
  const entry: FinancialEntry = { id: id(), owner_user_id: ownerUserId, ...payload };
export const createFinancialEntry = (payload: Omit<FinancialEntry, "id">) => {
  const entry: FinancialEntry = { id: id(), ...payload };
  db.financialEntries.set(entry.id, entry);
  return entry;
};

export const listFinancialEntries = (ownerUserId: string) => Array.from(db.financialEntries.values()).filter((f) => f.owner_user_id === ownerUserId);

export const purgeUserData = (ownerUserId: string) => {
  const drop = <T extends { owner_user_id: string }>(map: Map<string, T>) => {
    for (const [k, v] of map.entries()) if (v.owner_user_id === ownerUserId) map.delete(k);
  };
  drop(db.patients);
  drop(db.sessions);
  drop(db.audioRecords);
  drop(db.transcriptJobs);
  drop(db.transcripts);
  drop(db.clinicalNotes);
  drop(db.reports);
  drop(db.anamnesisResponses);
  drop(db.scales);
  drop(db.scaleRecords);
  drop(db.formEntries);
  drop(db.financialEntries);
};

export const adminSanitizedUsers = () =>
  Array.from(db.users.values()).map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, created_at: u.created_at, last_seen_at: u.last_seen_at }));

export const adminUserMetrics = (userId: string, from?: string, to?: string) => {
  const fromTs = from ? new Date(from).getTime() : 0;
  const toTs = to ? new Date(to).getTime() : Date.now();
  const items = Array.from(db.telemetry.values()).filter((t) => t.user_id === userId && new Date(t.ts).getTime() >= fromTs && new Date(t.ts).getTime() <= toTs);
  const byType: Record<string, number> = {};
  for (const item of items) byType[item.event_type] = (byType[item.event_type] ?? 0) + 1;
  return { total: items.length, by_type: byType };
};

export const adminOverviewMetrics = () => {
  const telemetry = Array.from(db.telemetry.values());
  const errors = telemetry.filter((item) => item.event_type === "ERROR").length;
  return {
    total_users: db.users.size,
    active_users: Array.from(db.users.values()).filter((u) => u.status === "active").length,
    invites_pending: Array.from(db.invites.values()).filter((i) => !i.used_at).length,
    telemetry_events: telemetry.length,
    error_events: errors,
  };
};

export const adminErrors = () => Array.from(db.telemetry.values()).filter((item) => item.event_type === "ERROR");
export const createReceipt = (financialEntryId: string) => {
  const receipt: Receipt = {
    id: id(),
    financial_entry_id: financialEntryId,
    generated_at: now(),
    file_path: `vault://receipts/${financialEntryId}.pdf`,
  };
  db.receipts.set(receipt.id, receipt);
  return receipt;
};
