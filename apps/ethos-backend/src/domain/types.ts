export type UUID = string;

export type Role = "user" | "admin";
export type UserStatus = "invited" | "active" | "disabled";
export type SessionStatus = "scheduled" | "confirmed" | "missed" | "completed";
export type ClinicalNoteStatus = "draft" | "validated";

export type User = {
  id: UUID;
  email: string;
  name: string;
  password_hash?: string;
  role: Role;
  status: UserStatus;
  created_at: string;
  last_seen_at?: string;
};

export type Invite = {
  id: UUID;
  email: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  used_at?: string;
};

export type SessionToken = {
  token: string;
  user_id: UUID;
  created_at: string;
  expires_at: string;
};

export type Owned = { id: UUID; owner_user_id: UUID; created_at: string };

export type ClinicalSession = Owned & {
  patient_id: string;
  scheduled_at: string;
  status: SessionStatus;
};

export type AudioRecord = Owned & {
  session_id: UUID;
  file_path_encrypted: string;
  consent_confirmed: true;
  expires_at: string;
};

export type Transcript = Owned & {
  session_id: UUID;
  raw_text: string;
  segments: Array<{ start: number; end: number; text: string }>;
};

export type ClinicalNote = Owned & {
  session_id: UUID;
  content: string;
  status: ClinicalNoteStatus;
  version: number;
  validated_at?: string;
};

export type ClinicalReport = Owned & {
  patient_id: string;
  purpose: "instituição" | "profissional" | "paciente";
  content: string;
};

export type AnamnesisResponse = Owned & {
  patient_id: string;
  template_id: string;
  content: Record<string, unknown>;
  version: number;
};

export type ScaleRecord = Owned & {
  scale_id: string;
  patient_id: string;
  score: number;
  recorded_at: string;
};

export type FormEntry = Owned & {
  patient_id: string;
  form_id: string;
  content: Record<string, unknown>;
};

export type FinancialEntry = Owned & {
  patient_id: string;
  type: "receivable" | "payable";
  amount: number;
  due_date: string;
  status: "open" | "paid";
  description: string;
};

export type JobType = "transcription" | "export" | "backup";
export type JobStatus = "queued" | "running" | "completed" | "failed";

export type Job = {
  id: UUID;
  owner_user_id: UUID;
  type: JobType;
  status: JobStatus;
  progress: number;
  resource_id?: UUID;
  result_uri?: string;
  error_code?: string;
  created_at: string;
  updated_at: string;
};

export type TelemetryEvent = {
  id: UUID;
  user_id?: UUID;
  event_type: string;
  route?: string;
  status_code?: number;
  error_code?: string;
  ts: string;
};

export type AuditEvent = {
  id: UUID;
  actor_user_id: UUID;
  event: string;
  target_user_id?: UUID;
  ts: string;
};

export type ApiEnvelope<T> = {
  request_id: string;
  data: T;
};

export type ApiError = {
  request_id: string;
  error: { code: string; message: string };
};
