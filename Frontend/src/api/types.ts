// ETHOS Centralized Type Definitions

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "professional" | "patient";
  token?: string;
}

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  last_session?: string;
  total_sessions?: number;
  created_at?: string;
}

export interface Session {
  id: string;
  patient_id: string;
  patient_name: string;
  date: string;
  time: string;
  duration?: number;
  status: "confirmed" | "pending" | "missed" | "completed";
  has_audio?: boolean;
  has_transcription?: boolean;
  has_clinical_note?: boolean;
  clinical_note_status?: "draft" | "validated";
  payment_status?: "paid" | "open" | "exempt";
}

export interface ClinicalNote {
  id: string;
  session_id: string;
  status: "draft" | "validated";
  validated_at?: string;
  validated_by?: string;
  content: {
    queixa_principal: string;
    observacoes_clinicas: string;
    evolucao: string;
    plano_terapeutico: string;
  };
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PrivateComment {
  id: string;
  clinical_note_id: string;
  content: string;
  created_at: string;
  author_id?: string;
}

export interface Report {
  id: string;
  patient_id: string;
  patient_name?: string;
  clinical_note_id: string;
  purpose: string;
  content?: string;
  status: "draft" | "final";
  created_at?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  template_body?: string;
  created_at?: string;
}

export interface Document {
  id: string;
  template_id?: string;
  case_id?: string;
  patient_id?: string;
  title: string;
  content?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  content: string;
  created_at: string;
}

export interface Contract {
  id: string;
  patient_id: string;
  patient_name?: string;
  title: string;
  content: string;
  status: "draft" | "sent" | "accepted" | "expired";
  portal_url?: string;
  accepted_at?: string;
  accepted_by?: string;
  created_at?: string;
}

export interface Job {
  job_id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "pending" | "processing" | "completed";
  result?: unknown;
  error?: string;
  progress?: number;
  created_at?: string;
}

export interface FinancialEntry {
  id: string;
  patient_id: string;
  patient_name?: string;
  session_id?: string;
  amount: number;
  payment_method?: string;
  status: "paid" | "open" | "exempt" | "package";
  due_date?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
}

export interface Scale {
  id: string;
  name: string;
  description?: string;
  items?: unknown[];
}

export interface ScaleRecord {
  id: string;
  scale_id: string;
  patient_id: string;
  score: number;
  answers?: unknown;
  applied_at: string;
}

export interface Form {
  id: string;
  name: string;
  description?: string;
  fields?: unknown[];
}

export interface FormEntry {
  id: string;
  form_id: string;
  patient_id: string;
  data: unknown;
  created_at: string;
}

export interface Anamnesis {
  id: string;
  patient_id: string;
  template?: string;
  content: Record<string, string>;
  version: number;
  created_at: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface RetentionPolicy {
  retention_days: number;
  auto_purge: boolean;
  updated_at?: string;
}

export interface AnonymizedCase {
  id: string;
  summary: string;
  tags?: string[];
  created_at: string;
}

export interface CaseCloseData {
  patient_id: string;
  summary: string;
  reason: string;
  next_steps?: string;
}

export interface Entitlements {
  exports_enabled: boolean;
  backup_enabled: boolean;
  forms_enabled: boolean;
  scales_enabled: boolean;
  finance_enabled: boolean;
  transcription_minutes_per_month: number;
  max_patients: number;
  max_sessions_per_month: number;
  subscription_status: string;
  is_in_grace: boolean;
  grace_until: string | null;
}

export interface AdminMetrics {
  active_users: number;
  sessions_today: number;
  errors_recent: number;
  total_patients: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
}

export interface ObservabilityAlert {
  id: string;
  level: "info" | "warning" | "critical";
  message: string;
  created_at: string;
}
