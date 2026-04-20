export type UUID = string;

export type Role = "admin" | "user" | "assistente" | "supervisor" | "patient";
export type UserStatus = "invited" | "active" | "disabled";
export type SessionStatus = "scheduled" | "confirmed" | "missed" | "completed";
export type ClinicalNoteStatus = "draft" | "validated";

export type ClinicalNoteStructuredData = {
  complaint?: string;
  context?: string;
  objectives?: string[];
  anamnesis?: {
    personal?: string;
    family?: string;
    psychiatric?: string;
    medication?: string;
    events?: string;
  };
  plan?: {
    approach?: string;
    strategies?: string;
    interventions?: string;
  };
  soap?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  events?: string;
  closure?: {
    date?: string;
    reason?: string;
    summary?: string;
    results?: string;
    recommendations?: string;
  };
};

export type User = {
  id: UUID;
  email: string;
  name: string;
  password_hash?: string;
  avatar_url?: string;
  crp?: string;
  rg?: string;
  cpf?: string;
  gender?: "F" | "M";
  specialty?: string;
  clinical_approach?: string;
  accepted_ethics_at?: string;
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

export type PatientBilling = {
  mode: "per_session" | "package";
  weekly_frequency?: 1 | 2 | 3 | 4 | 5;
  session_price?: number;
  package_total_price?: number;
  package_session_count?: number;
  payment_timing?: "advance" | "after";
  preferred_payment_day?: number;
  billing_reminder_days?: number;
  billing_auto_charge?: boolean;
};

export type PatientCareStatus = "active" | "paused" | "transferred" | "inactive";

export type Patient = Owned & {
  external_id: string;
  label: string;
  care_status?: PatientCareStatus;
  gender?: "M" | "F";
  email?: string;
  phone?: string;
  whatsapp?: string;
  birth_date?: string;
  address?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  cpf?: string;
  profession?: string;
  referral_source?: string;
  care_interest?: string;
  therapy_goals?: string;
  main_complaint?: string;
  psychiatric_medications?: string;
  has_psychiatric_followup?: boolean;
  psychiatrist_name?: string;
  psychiatrist_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  education_level?: string;
  marital_status?: string;
  legal_guardian_name?: string;
  legal_guardian_relationship?: string;
  report_indication?: string;
  recurring_techniques?: string;
  report_notes?: string;
  billing?: PatientBilling;
  notes?: string;
};

export type RecurrenceRule = {
  type: "weekly" | "2x-week" | "biweekly";
  days: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday">;
  time: string;           // "HH:MM"
  duration_minutes: number;
};

export type ClinicalSession = Owned & {
  patient_id: string;
  scheduled_at: string;
  status: SessionStatus;
  duration_minutes?: number;
  recurrence?: RecurrenceRule;
  series_id?: string;
  is_series_anchor?: boolean;
  event_type?: "session" | "block" | "other";
  block_title?: string;
};

export type CalendarSuggestion = {
  patient_id: string;
  patient_name: string;
  suggested_at: string;
  duration_minutes: number;
  source: "rule" | "pattern";
  confidence?: number;
  series_id?: string;
  recurrence_type?: string;
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
  structuredData?: ClinicalNoteStructuredData;
  status: ClinicalNoteStatus;
  version: number;
  validated_at?: string;
};

export type ClinicalReport = Owned & {
  patient_id: string;
  purpose: "instituição" | "profissional" | "paciente";
  kind?: "session_report" | "longitudinal_record" | "referral" | "psychological_report" | "school_report" | "attendance_declaration";
  content: string;
  status?: "draft" | "final";
  shared_with_patient?: boolean;
  shared_at?: string;
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

export type GoalStatus = "active" | "achieved" | "paused" | "abandoned";

export type GoalMilestone = {
  id: string;
  title: string;
  achieved: boolean;
  achieved_at?: string;
};

export type TherapeuticGoal = Owned & {
  patient_id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  progress: number;
  milestones: GoalMilestone[];
  achieved_at?: string;
};

export type HomeworkTask = Owned & {
  patient_id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  week_number: number;
};

export type FormEntry = Owned & {
  patient_id: string;
  form_id: string;
  assignment_id?: string;
  content: Record<string, unknown>;
  submitted_by?: "patient" | "professional";
};

export type FormFieldType = "text" | "textarea" | "date" | "select" | "radio" | "checkbox";

export type FormFieldOption = {
  label: string;
  value: string;
};

export type FormField = {
  id: UUID;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[];
};

export type FormTemplate = Owned & {
  title: string;
  description?: string;
  audience: "patient" | "professional";
  active: boolean;
  cover?: {
    title?: string;
    description?: string;
  };
  fields: FormField[];
};

export type FormAssignmentMode = "single_use" | "recurring";

export type FormAssignment = Owned & {
  form_id: string;
  patient_id: string;
  active: boolean;
  mode: FormAssignmentMode;
  shared_at: string;
  last_submitted_at?: string;
};

export type FinancialEntry = Owned & {
  patient_id: string;
  session_id?: string;
  type: "receivable" | "payable";
  amount: number;
  due_date: string;
  status: "open" | "paid";
  description: string;
  payment_method?: string;
  paid_at?: string;
  notes?: string;
  shared_with_patient?: boolean;
  shared_at?: string;
  reminder_sent_at?: string;
};

export type PatientTimelineItem = {
  id: UUID;
  patient_id: string;
  kind: "session" | "clinical_note" | "document";
  date: string;
  title: string;
  subtitle?: string;
  related_id: string;
};

export type EmotionalDiaryEntry = Owned & {
  patient_id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  intensity: number;
  description?: string;
  thoughts?: string;
  tags?: string[];
};

export type PatientAsyncMessage = Owned & {
  patient_id: string;
  message: string;
};

export type SupportedScaleType = "PHQ-9" | "GAD-7";

export type ScaleModel = {
  patient_id: string;
  type: SupportedScaleType;
  score: number;
  date: string;
};

export type JobType = "transcription" | "export" | "export_full" | "backup";

export type DocumentTemplate = {
  id: UUID;
  owner_user_id: UUID;
  created_at: string;
  title: string;
  description?: string;
  kind?: "document" | "contract";
  version: number;
  html: string;
  fields: Array<{ key: string; label: string; required?: boolean }>;
};

export type ClinicalDocument = Owned & {
  patient_id: UUID;
  case_id: string;
  template_id: UUID;
  title: string;
  shared_with_patient?: boolean;
  shared_at?: string;
};

export type ClinicalDocumentVersion = Owned & {
  document_id: UUID;
  version: number;
  content: string;
  global_values: Record<string, string>;
};
export type JobStatus = "queued" | "running" | "completed" | "failed";

export type Job = {
  id: UUID;
  owner_user_id: UUID;
  type: JobType;
  status: JobStatus;
  progress: number;
  resource_id?: UUID;
  result_uri?: string;
  draft_note_id?: UUID;
  error_code?: string;
  created_at: string;
  updated_at: string;
};

export type LocalEntitlementSnapshot = {
  user_id: UUID;
  entitlements: {
    exports_enabled: boolean;
    backup_enabled: boolean;
    forms_enabled: boolean;
    scales_enabled: boolean;
    finance_enabled: boolean;
    transcription_minutes_per_month: number;
    max_patients: number;
    max_sessions_per_month: number;
  };
  source_subscription_status: "none" | "trialing" | "active" | "past_due" | "canceled";
  last_entitlements_sync_at: string;
  last_successful_subscription_validation_at?: string;
  grace_until?: string;
};

export type ScaleTemplate = {
  id: string;
  name: string;
  description: string;
};

export type NotificationChannel = "email" | "whatsapp";

export type NotificationTemplate = Owned & {
  name: string;
  channel: NotificationChannel;
  content: string;
  subject?: string;
};

export type NotificationConsent = Owned & {
  patient_id: UUID;
  channel: NotificationChannel;
  source: string;
  granted_at: string;
  revoked_at?: string;
};

export type NotificationSchedule = Owned & {
  session_id: UUID;
  patient_id: UUID;
  template_id: UUID;
  channel: NotificationChannel;
  recipient: string;
  scheduled_for: string;
  status: "scheduled" | "sent" | "failed";
  sent_at?: string;
};

export type NotificationLog = Owned & {
  schedule_id: UUID;
  template_id: UUID;
  channel: NotificationChannel;
  recipient: string;
  status: "sent" | "failed";
  dispatched_at: string;
  reason?: string;
  subject?: string;
  message?: string;
  delivery_url?: string;
  provider_response?: string;
};

export type NotificationPreview = {
  id: UUID;
  type: "session" | "document" | "reminder";
  title: string;
  message: string;
  created_at: string;
  related_id?: UUID;
  status?: string;
};

export type TelemetryEvent = {
  id: UUID;
  user_id?: UUID;
  event_type: string;
  route?: string;
  status_code?: number;
  duration_ms?: number;
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

export type ObservabilityAlert = {
  id: UUID;
  source: "detectBottlenecks" | "predictFailureRisk" | "detectAnomalousBehavior" | "suggestRootCauseFromLogs";
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
  fingerprint: string;
  first_seen_at: string;
  last_seen_at: string;
  occurrences: number;
  context: Record<string, unknown>;
};

export type ApiEnvelope<T> = {
  request_id: string;
  data: T;
};

export type ApiError = {
  request_id: string;
  error: { code: string; message: string };
};

export type PatientNotification = {
  id: string;
  patient_user_id: string;
  type: "session_reminder" | "payment_due" | "document_shared" | "slot_response";
  data: Record<string, string>;
  read: boolean;
  created_at: string;
};

export type AvailabilityBlock = Owned & {
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  enabled: boolean;
  patient_ids?: string[];
};

export type SlotRequest = Owned & {
  patient_id: string;
  patient_user_id: string;
  requested_date: string;
  requested_time: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "rejected";
  responded_at?: string;
  rejection_reason?: string;
};

export type WhatsAppConfig = {
  url: string;
  apiKey: string;
  instanceName: string;
  enabled: boolean;
};

export type SessionReminderConfig = {
  enabled: boolean;
  hoursBeforeSession: number;
  template: string;
};


