export type UUID = string;

export type Role = "user" | "admin";
export type UserStatus = "invited" | "active" | "disabled";
export type SessionStatus = "scheduled" | "confirmed" | "missed" | "completed";
export type ClinicalNoteStatus = "draft" | "validated";
export type FinancialType = "receivable" | "payable";
export type FinancialStatus = "open" | "paid";
export type TelemetryEventType =
  | "SESSION_CREATED"
  | "AUDIO_UPLOADED"
  | "TRANSCRIBE_SUCCESS"
  | "NOTE_GENERATED"
  | "NOTE_VALIDATED"
  | "REPORT_CREATED"
  | "EXPORT_PDF"
  | "BACKUP"
  | "RESTORE"
  | "ERROR";

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
  token: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
};

export type SessionToken = {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
};

export type Owned = { owner_user_id: UUID };

export type Patient = Owned & {
  id: UUID;
  name: string;
  contact_info: string;
  created_at: string;
};

export type Session = Owned & {
  id: UUID;
  patient_id: UUID;
  scheduled_at: string;
  status: SessionStatus;
  created_at: string;
};

export type AudioRecord = Owned & {
  id: UUID;
  session_id: UUID;
  file_path: string;
  consent_confirmed: boolean;
  created_at: string;
  expires_at: string;
};

export type TranscriptJob = Owned & {
  id: UUID;
  session_id: UUID;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  error_code?: string;
  transcript_id?: string;
  created_at: string;
  updated_at: string;
};

export type Transcript = Owned & {
  id: UUID;
  session_id: UUID;
  raw_text: string;
  segments: Array<{ start: number; end: number; text: string }>;
  created_at: string;
};

export type ClinicalNote = Owned & {
  id: UUID;
  session_id: UUID;
  content: string;
  status: ClinicalNoteStatus;
  version: number;
  validated_at?: string;
  created_at: string;
};

export type ClinicalReport = Owned & {
  id: UUID;
  patient_id: UUID;
  purpose: "instituição" | "profissional" | "paciente";
  content: string;
  created_at: string;
};

export type AnamnesisTemplate = { id: UUID; name: string; structure: Record<string, unknown>; created_at: string };
export type AnamnesisResponse = Owned & { id: UUID; patient_id: UUID; template_id: UUID; content: Record<string, unknown>; version: number; created_at: string };
export type Scale = Owned & { id: UUID; name: string; description: string; items: unknown[] };
export type ScaleRecord = Owned & { id: UUID; scale_id: UUID; patient_id: UUID; score: number; recorded_at: string };
export type FormTemplate = Owned & { id: UUID; name: string; structure: Record<string, unknown> };
export type FormEntry = Owned & { id: UUID; patient_id: UUID; form_id: UUID; content: Record<string, unknown>; created_at: string };
export type FinancialEntry = Owned & { id: UUID; patient_id: UUID; type: FinancialType; amount: number; due_date: string; status: FinancialStatus; description: string };

export type TelemetryEvent = {
  id: UUID;
  user_id: UUID;
  event_type: TelemetryEventType;
  ts: string;
  duration_ms?: number;
  error_code?: string;
  app_version: string;
  worker_version: string;
};

export type AuditEvent = {
  id: UUID;
  actor_user_id: UUID;
  event: string;
  target_user_id?: UUID;
  ts: string;
};
