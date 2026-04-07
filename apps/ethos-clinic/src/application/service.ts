import crypto from "node:crypto";
import { db, persistMutation, nextUserVersion, uid, now } from "../infra/database";
import type {
  AnamnesisResponse,
  ClinicalDocument,
  ClinicalDocumentType,
  ClinicalNote,
  ClinicalNoteStatus,
  ClinicalNoteStructuredData,
  ClinicalSession,
  ClinicalReport,
  FinancialEntry,
  Job,
  JobStatus,
  JobType,
  LocalEntitlementSnapshot,
  ObservabilityAlert,
  Patient,
  PatientBilling,
  Role,
  SessionStatus,
  Transcript,
  UUID,
  User
} from "../domain/types";

// Auth
const hashPassword = (p: string) => crypto.createHash("sha256").update(p).digest("hex");
const hashInviteToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export const login = (email: string, password: string) => {
  const hash = hashPassword(password);
  const user = Array.from(db.users.values()).find((u) => u.email === email && u.password_hash === hash);
  if (!user) return null;

  const token: string = crypto.randomBytes(32).toString("hex");
  const session = {
    token,
    user_id: user.id,
    created_at: now(),
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
  };
  db.tokens.set(token, session);
  user.last_seen_at = now();
  persistMutation();
  return { user, token };
};

export const logout = (token: string) => {
  db.tokens.delete(token);
  persistMutation();
};

export const registerUser = (email: string, name: string, password: string, role: Role = "psychologist") => {
  if (Array.from(db.users.values()).some((u) => u.email === email)) return null;

  const user: User = {
    id: uid(),
    email,
    name,
    password_hash: hashPassword(password),
    role,
    status: "active",
    created_at: now(),
  };
  db.users.set(user.id, user);

  const token: string = crypto.randomBytes(32).toString("hex");
  const session = {
    token,
    user_id: user.id,
    created_at: now(),
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
  };
  db.tokens.set(token, session);
  grantClinicalEntitlements(user.id);
  persistMutation();
  return { user, token };
};

export const createInvite = (email: string) => {
  const token = crypto.randomBytes(24).toString("hex");
  const invite = {
    id: uid(),
    email,
    token_hash: hashInviteToken(token),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: now(),
  };
  db.invites.set(invite.id, invite);
  persistMutation();
  return { invite, token };
};

export const acceptInvite = (token: string, name: string, password: string, role: Role = "psychologist") => {
  const tokenHash = hashInviteToken(token);
  const invite = Array.from(db.invites.values()).find((entry) => entry.token_hash === tokenHash && !entry.used_at);
  if (!invite || Date.parse(invite.expires_at) < Date.now()) return null;

  invite.used_at = now();
  const user: User = {
    id: uid(),
    email: invite.email,
    name,
    password_hash: hashPassword(password),
    role,
    status: "active",
    created_at: now(),
  };
  db.users.set(user.id, user);
  grantClinicalEntitlements(user.id);
  persistMutation();
  return user;
};

// Entitlements
export const grantClinicalEntitlements = (userId: string) => {
  db.entitlements.set(userId, {
    user_id: userId,
    entitlements: {
      exports_enabled: true,
      backup_enabled: true,
      forms_enabled: true,
      scales_enabled: true,
      finance_enabled: true,
      transcription_minutes_per_month: 300,
      max_patients: 50,
      max_sessions_per_month: 200,
    },
    source_subscription_status: "active",
    last_entitlements_sync_at: now(),
    last_successful_subscription_validation_at: now(),
  });
};

export const syncEntitlements = (userId: string, snapshot: any) => {
  const current = db.entitlements.get(userId);
  const updated = {
    user_id: userId,
    entitlements: {
      ...(current?.entitlements ?? {}),
      ...(snapshot.entitlements ?? {}),
      ...(snapshot.features ?? {}), // handle legacy naming
    },
    source_subscription_status: snapshot.source_subscription_status ?? "active",
    last_entitlements_sync_at: now(),
    last_successful_subscription_validation_at: now(),
  };
  db.entitlements.set(userId, updated);
  persistMutation();
  return updated;
};

// Patients
export const createPatient = (ownerId: UUID, data: Partial<Patient>) => {
  const patient: Patient = {
    id: uid(),
    owner_user_id: ownerId,
    created_at: now(),
    external_id: uid(),
    label: data.label || "Novo Paciente",
    email: data.email,
    phone: data.phone,
    whatsapp: data.whatsapp,
    birth_date: data.birth_date,
    address: data.address,
    cpf: data.cpf,
    billing: data.billing,
    notes: data.notes,
  };
  db.patients.set(patient.id, patient);
  persistMutation();
  return patient;
};

export const listPatients = (ownerId: UUID) => {
  return Array.from(db.patients.values()).filter((p) => p.owner_user_id === ownerId);
};

export const updatePatient = (ownerId: UUID, id: UUID, data: Partial<Patient>) => {
  const patient = db.patients.get(id);
  if (!patient || patient.owner_user_id !== ownerId) return null;
  Object.assign(patient, data);
  persistMutation();
  return patient;
};

// Sessions
export const createSession = (ownerId: UUID, patientId: UUID, scheduledAt: string, duration?: number, isRecurring?: boolean) => {
  const session: ClinicalSession = {
    id: uid(),
    owner_user_id: ownerId,
    created_at: now(),
    patient_id: patientId,
    scheduled_at: scheduledAt,
    status: "scheduled",
    duration_minutes: duration,
    is_recurring: isRecurring,
  };
  db.sessions.set(session.id, session);
  persistMutation();
  return session;
};

// Clinical Notes
export const createClinicalNote = (ownerId: UUID, sessionId: UUID, content: string, structured?: ClinicalNoteStructuredData) => {
  const note: ClinicalNote = {
    id: uid(),
    owner_user_id: ownerId,
    created_at: now(),
    session_id: sessionId,
    content,
    structuredData: structured,
    status: "draft",
    version: 1,
  };
  db.clinicalNotes.set(note.id, note);
  persistMutation();
  return note;
};

export const validateClinicalNote = (ownerId: UUID, noteId: UUID) => {
  const note = db.clinicalNotes.get(noteId);
  if (!note || note.owner_user_id !== ownerId) return null;
  note.status = "validated";
  note.validated_at = now();
  persistMutation();
  return note;
};

// Reports
export const createReport = (ownerId: string, patientId: string, purpose: ClinicalReport["purpose"], content: string) => {
  // Check for validated notes first
  const hasValidatedNote = Array.from(db.clinicalNotes.values()).some(
    (n) => n.owner_user_id === ownerId && n.status === "validated" &&
    db.sessions.get(n.session_id)?.patient_id === patientId
  );
  if (!hasValidatedNote) return null;

  const report = {
    id: uid(),
    owner_user_id: ownerId,
    patient_id: patientId,
    purpose,
    content,
    created_at: now()
  };
  db.reports.set(report.id, report);
  persistMutation();
  return report;
};

// Documents
export const createDocument = (ownerId: UUID, data: Partial<ClinicalDocument>) => {
  const doc: ClinicalDocument = {
    id: uid(),
    owner_user_id: ownerId,
    created_at: now(),
    patient_id: data.patient_id || uid(),
    case_id: data.case_id || uid(),
    template_id: data.template_id || uid(),
    title: data.title || "Documento",
    type: data.type || "report",
    content: data.content || "",
    metadata: data.metadata,
  };
  db.documents.set(doc.id, doc);
  persistMutation();
  return doc;
};

export const listDocuments = (ownerId: UUID) => {
  return Array.from(db.documents.values()).filter((d) => d.owner_user_id === ownerId);
};

// Jobs
export const createJob = (ownerId: UUID, type: JobType) => {
  const job: Job = {
    id: uid(),
    owner_user_id: ownerId,
    type,
    status: "queued",
    progress: 0,
    created_at: now(),
    updated_at: now(),
  };
  db.jobs.set(job.id, job);
  persistMutation();
  return job;
};

export const getJob = (ownerId: UUID, id: UUID) => {
  const job = db.jobs.get(id);
  if (!job || job.owner_user_id !== ownerId) return null;
  return job;
};

export const runJob = async (id: UUID, payload: any) => {
  const job = db.jobs.get(id);
  if (!job) return;
  job.status = "running";
  job.updated_at = now();
  persistMutation();
  // Simulate async work
  setTimeout(() => {
    job.status = "completed";
    job.progress = 100;
    job.updated_at = now();
    persistMutation();
  }, 1000);
};

// Other
export const authUserId = (req: any) => "test-user";
export const getPatientAccessForUser = (userId: string) => true;
export const recordProntuarioAudit = (userId: string, action: string, target: string) => {};
export const addAudit = (userId: string, event: string) => {};
export const addTelemetry = (event: any) => {};
export const getRetentionPolicy = (userId: string) => ({ clinical_record_days: 3650 });
export const updateRetentionPolicy = (userId: string, data: any) => data;
export const closeCase = (userId: string, patientId: string, data: any) => ({ success: true });
export const exportCase = (userId: string, patientId: string, data: any) => ({ url: "http://export.local/case.pdf" });
export const purgeUserData = (userId: string) => {};
export const handleTranscriberWebhook = (jobId: string, status: JobStatus, errorCode?: string) => {
  const job = db.jobs.get(jobId);
  if (!job) return false;
  job.status = status;
  job.error_code = errorCode;
  job.updated_at = now();
  persistMutation();
  return true;
};
export const adminOverviewMetrics = () => ({ total_users: db.users.size, total_patients: db.patients.size });
export const ingestPerformanceSample = (sample: any) => [];
export const ingestErrorLog = (log: any) => [];
export const evaluateObservability = () => [];
export const listObservabilityAlerts = () => [];
