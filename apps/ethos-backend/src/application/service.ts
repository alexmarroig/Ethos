import crypto from "node:crypto";
import { db, encrypt, hashInviteToken, hashPassword, seeds, uid, verifyPassword } from "../infra/database";
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
  ScaleRecord,
  SessionStatus,
  TelemetryEvent,
  Transcript,
  User,
} from "../domain/types";

const now = seeds.now;

export const addAudit = (actorUserId: string, event: string, targetUserId?: string) => {
  db.audit.set(uid(), { id: uid(), actor_user_id: actorUserId, event, target_user_id: targetUserId, ts: now() });
};

export const addTelemetry = (event: Omit<TelemetryEvent, "id" | "ts">) => {
  const item: TelemetryEvent = { id: uid(), ts: now(), ...event };
  db.telemetry.set(item.id, item);
  return item;
};

export const createInvite = (email: string) => {
  const raw = crypto.randomBytes(24).toString("hex");
  const invite = { id: uid(), email, token_hash: hashInviteToken(raw), expires_at: new Date(Date.now() + 86400000).toISOString(), created_at: now() };
  db.invites.set(invite.id, invite);
  return { invite, token: raw };
};

export const acceptInvite = (token: string, name: string, password: string) => {
  const invite = Array.from(db.invites.values()).find((x) => x.token_hash === hashInviteToken(token) && !x.used_at);
  if (!invite || Date.parse(invite.expires_at) < Date.now()) return null;
  invite.used_at = now();
  const user: User = { id: uid(), email: invite.email, name, password_hash: hashPassword(password), role: "user", status: "active", created_at: now() };
  db.users.set(user.id, user);
  return user;
};

export const login = (email: string, password: string) => {
  const user = Array.from(db.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.status !== "active" || !user.password_hash || !verifyPassword(password, user.password_hash)) return null;
  const token = crypto.randomBytes(24).toString("hex");
  db.sessionsTokens.set(token, { token, user_id: user.id, created_at: now(), expires_at: new Date(Date.now() + 86_400_000).toISOString() });
  user.last_seen_at = now();
  return { user, token };
};

export const getUserFromToken = (token: string) => {
  const s = db.sessionsTokens.get(token);
  if (!s || Date.parse(s.expires_at) < Date.now()) return null;
  return db.users.get(s.user_id) ?? null;
};
export const logout = (token: string) => db.sessionsTokens.delete(token);

export const createSession = (owner: string, patientId: string, scheduledAt: string): ClinicalSession => {
  const item = { id: uid(), owner_user_id: owner, patient_id: patientId, scheduled_at: scheduledAt, status: "scheduled" as const, created_at: now() };
  db.sessions.set(item.id, item);
  return item;
};

const byOwner = <T extends { owner_user_id: string }>(list: Iterable<T>, owner: string) => Array.from(list).filter((x) => x.owner_user_id === owner);
export const getByOwner = <T extends { owner_user_id: string; id: string }>(map: Map<string, T>, owner: string, id: string) => {
  const v = map.get(id);
  return v && v.owner_user_id === owner ? v : null;
};

export const patchSessionStatus = (owner: string, sessionId: string, status: SessionStatus) => {
  const session = getByOwner(db.sessions, owner, sessionId);
  if (!session) return null;
  session.status = status;
  return session;
};

export const addAudio = (owner: string, sessionId: string, filePath: string) => {
  const item = { id: uid(), owner_user_id: owner, session_id: sessionId, file_path_encrypted: encrypt(filePath), consent_confirmed: true as const, expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(), created_at: now() };
  db.audioRecords.set(item.id, item);
  return item;
};

export const addTranscript = (owner: string, sessionId: string, rawText: string): Transcript => {
  const item = { id: uid(), owner_user_id: owner, session_id: sessionId, raw_text: rawText, segments: [{ start: 0, end: 1, text: rawText.slice(0, 120) }], created_at: now() };
  db.transcripts.set(item.id, item);
  return item;
};

export const createClinicalNoteDraft = (owner: string, sessionId: string, content: string): ClinicalNote => {
  const item = { id: uid(), owner_user_id: owner, session_id: sessionId, content, status: "draft" as const, version: 1, created_at: now() };
  db.clinicalNotes.set(item.id, item);
  return item;
};

export const validateClinicalNote = (owner: string, noteId: string) => {
  const note = getByOwner(db.clinicalNotes, owner, noteId);
  if (!note) return null;
  note.status = "validated";
  note.validated_at = now();
  return note;
};

export const createReport = (owner: string, patientId: string, purpose: ClinicalReport["purpose"], content: string) => {
  const hasValidated = byOwner(db.clinicalNotes.values(), owner).some((n) => n.status === "validated");
  if (!hasValidated) return null;
  const item = { id: uid(), owner_user_id: owner, patient_id: patientId, purpose, content, created_at: now() };
  db.reports.set(item.id, item);
  return item;
};

export const createAnamnesis = (owner: string, patientId: string, templateId: string, content: Record<string, unknown>): AnamnesisResponse => {
  const item = { id: uid(), owner_user_id: owner, patient_id: patientId, template_id: templateId, content, version: 1, created_at: now() };
  db.anamnesis.set(item.id, item);
  return item;
};

export const createScaleRecord = (owner: string, scaleId: string, patientId: string, score: number): ScaleRecord => {
  const item = { id: uid(), owner_user_id: owner, scale_id: scaleId, patient_id: patientId, score, recorded_at: now(), created_at: now() };
  db.scales.set(item.id, item);
  return item;
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
  await new Promise((r) => setTimeout(r, 20));
  if (job.type === "transcription" && job.resource_id) {
    const transcript = addTranscript(job.owner_user_id, job.resource_id, options.rawText ?? "");
    job.result_uri = `transcript:${transcript.id}`;
  }
  if (job.type === "export") job.result_uri = `vault://exports/${job.owner_user_id}.enc`;
  if (job.type === "backup") job.result_uri = `vault://backup/${job.owner_user_id}.enc`;
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
  for (const map of [db.sessions, db.audioRecords, db.transcripts, db.clinicalNotes, db.reports, db.anamnesis, db.scales, db.forms, db.financial, db.jobs]) {
    for (const [id, item] of map) if ((item as { owner_user_id: string }).owner_user_id === owner) map.delete(id);
  }
};

export const adminOverviewMetrics = () => ({
  users_total: db.users.size,
  users_active: Array.from(db.users.values()).filter((u) => u.status === "active").length,
  jobs_total: db.jobs.size,
  error_events: Array.from(db.telemetry.values()).filter((e) => e.error_code).length,
});
