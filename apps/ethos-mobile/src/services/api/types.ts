export type AuthUser = {
  id: string;
  email: string;
  name: string;
  crp?: string;
  specialty?: string;
  clinical_approach?: string;
  accepted_ethics_at?: string;
  role: string;
  status: string;
  created_at: string;
  last_seen_at?: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type PatientRecord = {
  id: string;
  owner_user_id: string;
  external_id: string;
  label: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  birth_date?: string;
  address?: string;
  cpf?: string;
  main_complaint?: string;
  psychiatric_medications?: string;
  has_psychiatric_followup?: boolean;
  psychiatrist_name?: string;
  psychiatrist_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  billing?: {
    mode: "per_session" | "package";
    session_price?: number;
    package_total_price?: number;
    package_session_count?: number;
  };
  notes?: string;
  total_sessions?: number;
  next_session?: string;
  last_session?: string;
  created_at: string;
};

export type PatientSummaryRecord = {
  total_sessions: number;
  next_session: SessionRecord | null;
  last_session: SessionRecord | null;
};

export type SessionRecord = {
  id: string;
  owner_user_id: string;
  patient_id: string;
  scheduled_at: string;
  status: "scheduled" | "confirmed" | "missed" | "completed";
  duration_minutes?: number;
  reminderSent?: boolean;
  created_at: string;
};

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

export type ClinicalNoteRecord = {
  id: string;
  owner_user_id: string;
  session_id: string;
  content: string;
  structuredData?: ClinicalNoteStructuredData;
  status: "draft" | "validated";
  version: number;
  created_at: string;
  validated_at?: string;
};

export type ClinicalDocumentRecord = {
  id: string;
  owner_user_id: string;
  patient_id: string;
  case_id: string;
  template_id: string;
  title: string;
  created_at: string;
  status?: "draft" | "signed";
  versions_count?: number;
};

export type ClinicalDocumentVersionRecord = {
  id: string;
  owner_user_id: string;
  document_id: string;
  version: number;
  content: string;
  global_values: Record<string, string>;
  created_at: string;
};

export type FinancialEntryRecord = {
  id: string;
  owner_user_id: string;
  patient_id: string;
  session_id?: string;
  type: "receivable" | "payable";
  amount: number;
  due_date: string;
  status: "open" | "paid";
  description: string;
  lastReminderAt?: string;
  created_at: string;
};

export type JobRecord = {
  id: string;
  owner_user_id: string;
  type: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  resource_id?: string;
  result_uri?: string;
  draft_note_id?: string;
  error_code?: string;
  created_at: string;
  updated_at: string;
};

export type NotificationPreviewRecord = {
  id: string;
  type: "session" | "document" | "reminder";
  title: string;
  message: string;
  created_at: string;
  related_id?: string;
  status?: string;
};

export type EmotionalDiaryEntryRecord = {
  id: string;
  owner_user_id: string;
  patient_id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  intensity: number;
  description?: string;
  thoughts?: string;
  tags?: string[];
  created_at: string;
};

export type PatientTimelineItem = {
  id: string;
  patient_id: string;
  kind: "session" | "clinical_note" | "document";
  date: string;
  title: string;
  subtitle?: string;
  related_id: string;
};

export type PatientDetailResponse = {
  patient: PatientRecord;
  summary: PatientSummaryRecord;
  sessions: SessionRecord[];
  documents: ClinicalDocumentRecord[];
  clinical_notes: ClinicalNoteRecord[];
  emotional_diary: EmotionalDiaryEntryRecord[];
  timeline: PatientTimelineItem[];
};

export type DocumentDetailResponse = {
  document: ClinicalDocumentRecord;
  versions: ClinicalDocumentVersionRecord[];
  patient: PatientRecord | null;
};

export type FinanceSummary = {
  month: string;
  paid_sessions: number;
  pending_sessions: number;
  total_per_month: number;
  entries: FinancialEntryRecord[];
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

export const unwrapPaginatedResponse = <T>(payload: PaginatedResponse<T> | T[]): T[] =>
  Array.isArray(payload) ? payload : payload.items;
