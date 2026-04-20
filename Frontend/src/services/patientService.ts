import { api, type ApiResult } from "./apiClient";

type RawPatientBilling = {
  mode: "per_session" | "package";
  weekly_frequency?: 1 | 2 | 3 | 4 | 5;
  session_price?: number;
  package_total_price?: number;
  package_session_count?: number;
  payment_timing?: "advance" | "after";
  preferred_payment_day?: number;
};

type RawPatient = {
  id: string;
  external_id?: string;
  label?: string;
  name?: string;
  care_status?: "active" | "paused" | "transferred" | "inactive";
  email?: string;
  phone?: string;
  whatsapp?: string;
  birth_date?: string;
  gender?: "F" | "M";
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
  billing?: RawPatientBilling;
  notes?: string;
  created_at?: string;
  total_sessions?: number;
  last_session?: string;
  next_session?: string;
  portal_access_created?: boolean;
  portal_access_email?: string;
};

type RawPatientSummarySession = {
  id: string;
  scheduled_at: string;
  status: string;
  duration_minutes?: number;
};

type RawPatientSummary = {
  total_sessions?: number;
  next_session?: RawPatientSummarySession | null;
  last_session?: RawPatientSummarySession | null;
};

type RawPatientDetail = {
  patient: RawPatient;
  summary?: RawPatientSummary;
  sessions?: Array<{ id: string; scheduled_at?: string; status?: string; duration_minutes?: number }>;
  documents?: unknown[];
  clinical_notes?: unknown[];
  emotional_diary?: unknown[];
  form_entries?: unknown[];
  portal_access?: {
    id: string;
    patient_user_id: string;
    email?: string;
    name?: string;
    created_at: string;
    updated_at?: string;
    last_credentials_reset_at?: string;
    last_email_delivery_status?: "sent" | "skipped" | "failed";
    last_email_delivery_detail?: string;
  } | null;
  timeline?: unknown[];
};

type RawPatientAccessResponse = {
  access: { id: string; patient_id: string };
  patient_user: { id: string; email: string; name: string };
  temporary_password?: string | null;
  email_delivery?: {
    status: "sent" | "skipped" | "failed";
    detail?: string;
  } | null;
};

export interface PatientBilling {
  mode: "per_session" | "package";
  weekly_frequency?: 1 | 2 | 3 | 4 | 5;
  session_price?: number;
  package_total_price?: number;
  package_session_count?: number;
  payment_timing?: "advance" | "after";
  preferred_payment_day?: number;
}

export interface PatientSummarySession {
  id: string;
  scheduled_at: string;
  status: string;
  duration_minutes?: number;
}

export interface PatientOperationalSummary {
  total_sessions: number;
  next_session?: PatientSummarySession | null;
  last_session?: PatientSummarySession | null;
}

export interface Patient {
  id: string;
  external_id?: string;
  name: string;
  care_status?: "active" | "paused" | "transferred" | "inactive";
  email?: string;
  phone?: string;
  whatsapp?: string;
  birth_date?: string;
  gender?: "F" | "M";
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
  last_session?: string;
  next_session?: string;
  total_sessions?: number;
  created_at?: string;
  portal_access_created?: boolean;
  portal_access_email?: string;
}

export interface PatientDetail {
  patient: Patient;
  summary: PatientOperationalSummary;
  sessions: RawPatientDetail["sessions"];
  documents: RawPatientDetail["documents"];
  clinical_notes: RawPatientDetail["clinical_notes"];
  emotional_diary: RawPatientDetail["emotional_diary"];
  form_entries?: RawPatientDetail["form_entries"];
  portal_access?: RawPatientDetail["portal_access"];
  timeline: RawPatientDetail["timeline"];
}

export interface PatientAccessResult {
  credentials: string;
  patient_user: RawPatientAccessResponse["patient_user"];
  access_id: string;
  email_delivery?: RawPatientAccessResponse["email_delivery"];
}

export interface CreatePatientInput {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
}

export interface UpdatePatientInput extends Partial<Omit<Patient, "id" | "external_id" | "created_at" | "total_sessions" | "last_session" | "next_session">> {
  name?: string;
}

function mapSummarySession(raw?: RawPatientSummarySession | null): PatientSummarySession | null {
  if (!raw?.id || !raw.scheduled_at) return null;
  return {
    id: raw.id,
    scheduled_at: raw.scheduled_at,
    status: raw.status,
    duration_minutes: raw.duration_minutes,
  };
}

function mapPatient(raw: RawPatient): Patient {
  return {
    id: String(raw.id),
    external_id: raw.external_id,
    name: raw.name ?? raw.label ?? "Paciente sem nome",
    care_status: raw.care_status,
    email: raw.email,
    phone: raw.phone,
    whatsapp: raw.whatsapp ?? raw.phone,
    birth_date: raw.birth_date,
    gender: raw.gender,
    address: raw.address,
    address_street: raw.address_street,
    address_number: raw.address_number,
    address_complement: raw.address_complement,
    address_neighborhood: raw.address_neighborhood,
    address_city: raw.address_city,
    address_state: raw.address_state,
    address_zip: raw.address_zip,
    cpf: raw.cpf,
    profession: raw.profession,
    referral_source: raw.referral_source,
    care_interest: raw.care_interest,
    therapy_goals: raw.therapy_goals,
    main_complaint: raw.main_complaint,
    psychiatric_medications: raw.psychiatric_medications,
    has_psychiatric_followup: raw.has_psychiatric_followup,
    psychiatrist_name: raw.psychiatrist_name,
    psychiatrist_contact: raw.psychiatrist_contact,
    emergency_contact_name: raw.emergency_contact_name,
    emergency_contact_relationship: raw.emergency_contact_relationship,
    emergency_contact_phone: raw.emergency_contact_phone,
    education_level: raw.education_level,
    marital_status: raw.marital_status,
    legal_guardian_name: raw.legal_guardian_name,
    legal_guardian_relationship: raw.legal_guardian_relationship,
    report_indication: raw.report_indication,
    recurring_techniques: raw.recurring_techniques,
    report_notes: raw.report_notes,
    billing: raw.billing,
    notes: raw.notes,
    last_session: raw.last_session,
    next_session: raw.next_session,
    total_sessions: raw.total_sessions,
    created_at: raw.created_at,
    portal_access_created: raw.portal_access_created,
    portal_access_email: raw.portal_access_email,
  };
}

function mapPatientDetail(raw: RawPatientDetail): PatientDetail {
  const patient = mapPatient(raw.patient);
  const summary = {
    total_sessions: raw.summary?.total_sessions ?? raw.patient.total_sessions ?? raw.sessions?.length ?? 0,
    next_session: mapSummarySession(raw.summary?.next_session),
    last_session: mapSummarySession(raw.summary?.last_session),
  };

  return {
    patient: {
      ...patient,
      total_sessions: summary.total_sessions,
      next_session: summary.next_session?.scheduled_at ?? patient.next_session,
      last_session: summary.last_session?.scheduled_at ?? patient.last_session,
    },
    summary,
    sessions: raw.sessions ?? [],
    documents: raw.documents ?? [],
    clinical_notes: raw.clinical_notes ?? [],
    emotional_diary: raw.emotional_diary ?? [],
    form_entries: raw.form_entries ?? [],
    portal_access: raw.portal_access ?? null,
    timeline: raw.timeline ?? [],
  };
}

function ok<TInput, TOutput>(
  result: ApiResult<TInput>,
  mapper: (value: TInput) => TOutput,
): ApiResult<TOutput> {
  if (!result.success) return result as unknown as ApiResult<TOutput>;
  return {
    ...result,
    data: mapper(result.data),
  };
}

export const patientService = {
  list: async (): Promise<ApiResult<Patient[]>> => {
    const result = await api.get<RawPatient[]>("/patients");
    return ok(result, (items) => items
      .map(mapPatient)
      .filter((p) => !p.id.startsWith("block-") && !p.name.toLowerCase().includes("block-"))
    );
  },

  getById: async (id: string): Promise<ApiResult<PatientDetail>> => {
    const result = await api.get<RawPatientDetail>(`/patients/${id}`);
    return ok(result, mapPatientDetail);
  },

  create: async (data: CreatePatientInput): Promise<ApiResult<Patient>> => {
    const result = await api.post<RawPatient>("/patients", data);
    return ok(result, mapPatient);
  },

  update: async (id: string, data: UpdatePatientInput): Promise<ApiResult<Patient>> => {
    const result = await api.patch<RawPatient>(`/patients/${id}`, data);
    return ok(result, mapPatient);
  },

  grantAccess: async (input: {
    patient_id: string;
    patient_email: string;
    patient_name: string;
    patient_password?: string;
    reset_password?: boolean;
  }): Promise<ApiResult<PatientAccessResult>> => {
    const result = await api.post<RawPatientAccessResponse>("/patients/access", input);
    return ok(result, (data) => ({
      access_id: data.access.id,
      patient_user: data.patient_user,
      credentials:
        data.temporary_password || input.patient_password
          ? `Email: ${data.patient_user.email} | Senha: ${data.temporary_password ?? input.patient_password}`
          : `Email: ${data.patient_user.email}`,
      email_delivery: data.email_delivery ?? undefined,
    }));
  },
};
