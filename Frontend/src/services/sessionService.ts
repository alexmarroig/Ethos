import { api, type ApiResult } from "./apiClient";
import { type Patient } from "./patientService";
import { resolvePatientsIndex } from "./patientIndexCache";

export interface RecurrenceRule {
  type: "weekly" | "2x-week" | "biweekly";
  days: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday">;
  time: string;
  duration_minutes: number;
}

export interface CalendarSuggestion {
  patient_id: string;
  patient_name: string;
  suggested_at: string;
  duration_minutes: number;
  source: "rule" | "pattern";
  confidence?: number;
  series_id?: string;
  recurrence_type?: string;
}

type RawSession = {
  id: string;
  patient_id: string;
  scheduled_at?: string;
  date?: string;
  time?: string;
  patient_name?: string;
  duration_minutes?: number;
  duration?: number;
  status: "scheduled" | "confirmed" | "pending" | "missed" | "completed" | "cancelled_with_notice" | "cancelled_no_show" | "rescheduled_by_patient" | "rescheduled_by_psychologist";
  has_audio?: boolean;
  has_transcription?: boolean;
  has_clinical_note?: boolean;
  clinical_note_status?: "draft" | "validated";
  payment_status?: "paid" | "open" | "exempt";
  recurrence?: RecurrenceRule;
  series_id?: string;
  is_series_anchor?: boolean;
  event_type?: "session" | "block" | "other";
  block_title?: string;
  location_type?: "remote" | "presencial";
};

type RawPaginatedSessions = {
  items: RawSession[];
  page: number;
  page_size: number;
  total: number;
  next_cursor?: string | null;
};

export interface Session {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_total_sessions?: number;
  date: string;
  time: string;
  duration?: number;
  status: "confirmed" | "pending" | "missed" | "completed" | "cancelled_with_notice" | "cancelled_no_show" | "rescheduled_by_patient" | "rescheduled_by_psychologist";
  has_audio?: boolean;
  has_transcription?: boolean;
  has_clinical_note?: boolean;
  clinical_note_status?: "draft" | "validated";
  payment_status?: "paid" | "open" | "exempt";
  scheduled_at?: string;
  recurrence?: RecurrenceRule;
  series_id?: string;
  is_series_anchor?: boolean;
  event_type?: "session" | "block" | "other";
  block_title?: string;
  location_type?: "remote" | "presencial";
}

export interface SessionTranscript {
  id: string;
  session_id: string;
  raw_text: string;
  created_at: string;
}

export interface SessionFilters {
  from?: string;
  to?: string;
  status?: string;
  patient_id?: string;
  exclude_blocks?: boolean;
  page?: number;
  page_size?: number;
  cursor?: string;
}

export interface PaginatedData<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  next_cursor?: string | null;
}

function formatDateParts(raw: RawSession) {
  const scheduled = raw.scheduled_at ?? "";
  const value = scheduled ? new Date(scheduled) : null;

  if (raw.date && raw.time) {
    return { date: raw.date, time: raw.time, scheduled_at: raw.scheduled_at };
  }

  if (!value || Number.isNaN(value.getTime())) {
    return {
      date: "",
      time: "",
      scheduled_at: raw.scheduled_at,
    };
  }

  const date = [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
  const time = [
    String(value.getHours()).padStart(2, "0"),
    String(value.getMinutes()).padStart(2, "0"),
  ].join(":");

  return {
    date,
    time,
    scheduled_at: raw.scheduled_at ?? value.toISOString(),
  };
}

function mapStatus(status: RawSession["status"]): Session["status"] {
  if (status === "scheduled") return "pending";
  return status;
}

function buildPatientsIndex(patients: Patient[]): Map<string, Patient> {
  const patientsIndex = new Map<string, Patient>();

  for (const patient of patients) {
    patientsIndex.set(patient.id, patient);
    if (patient.external_id) {
      patientsIndex.set(patient.external_id, patient);
    }
  }

  return patientsIndex;
}

function mapSession(raw: RawSession, patientsIndex: Map<string, Patient>): Session {
  const patient = patientsIndex.get(raw.patient_id);
  const { date, time, scheduled_at } = formatDateParts(raw);

  return {
    id: String(raw.id),
    patient_id: raw.patient_id,
    patient_name: (raw.event_type === "block" || raw.patient_id?.startsWith("block-"))
      ? (raw.block_title ?? "Tarefa")
      : (raw.patient_name ?? patient?.name ?? "Paciente"),
    patient_total_sessions: patient?.total_sessions,
    date,
    time,
    duration: raw.duration ?? raw.duration_minutes,
    status: mapStatus(raw.status),
    has_audio: raw.has_audio,
    has_transcription: raw.has_transcription,
    has_clinical_note: raw.has_clinical_note,
    clinical_note_status: raw.clinical_note_status,
    payment_status: raw.payment_status,
    scheduled_at,
    recurrence: raw.recurrence,
    series_id: raw.series_id,
    is_series_anchor: raw.is_series_anchor,
    event_type: raw.event_type ?? (raw.patient_id?.startsWith("block-") ? "block" : "session"),
    block_title: raw.block_title,
    location_type: raw.location_type,
  };
}

export const sessionService = {
  listPage: async (filters?: SessionFilters, patients?: Patient[]): Promise<ApiResult<PaginatedData<Session>>> => {
    const params = new URLSearchParams();
    params.set("page", String(filters?.page ?? 1));
    params.set("page_size", String(filters?.page_size ?? 100));
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.status) params.set("status", filters.status === "pending" ? "scheduled" : filters.status);
    if (filters?.patient_id) params.set("patient_id", filters.patient_id);
    if (filters?.exclude_blocks) params.set("exclude_blocks", "true");
    const qs = params.toString();

    const [sessionsResult, resolvedPatients] = await Promise.all([
      api.get<RawPaginatedSessions>(`/sessions?${qs}`),
      resolvePatientsIndex(patients),
    ]);

    if (!sessionsResult.success) return sessionsResult as unknown as ApiResult<PaginatedData<Session>>;

    const patientsIndex = buildPatientsIndex(resolvedPatients);
    const mapped = sessionsResult.data.items.map((item) => mapSession(item, patientsIndex));

    return {
      ...sessionsResult,
      data: {
        items: mapped,
        page: sessionsResult.data.page,
        page_size: sessionsResult.data.page_size,
        total: sessionsResult.data.total,
        next_cursor: sessionsResult.data.next_cursor,
      },
    };
  },

  list: async (filters?: SessionFilters, patients?: Patient[]): Promise<ApiResult<Session[]>> => {
    const result = await sessionService.listPage(filters, patients);
    if (!result.success) return result as unknown as ApiResult<Session[]>;
    return {
      ...result,
      data: result.data.items,
    };
  },

  getById: async (id: string): Promise<ApiResult<Session>> => {
    const [sessionResult, patients] = await Promise.all([
      api.get<RawSession>(`/sessions/${id}`),
      resolvePatientsIndex(),
    ]);

    if (!sessionResult.success) return sessionResult as unknown as ApiResult<Session>;

    return {
      ...sessionResult,
      data: mapSession(sessionResult.data, buildPatientsIndex(patients)),
    };
  },

  create: async (data: {
    patient_id: string;
    scheduled_at: string;
    duration_minutes?: number;
    recurrence?: RecurrenceRule;
    event_type?: "session" | "block" | "other";
    block_title?: string;
    location_type?: "remote" | "presencial";
  }): Promise<ApiResult<Session>> => {
    const [createResult, patients] = await Promise.all([
      api.post<RawSession>("/sessions", data),
      resolvePatientsIndex(),
    ]);

    if (!createResult.success) return createResult as unknown as ApiResult<Session>;

    return {
      ...createResult,
      data: mapSession(createResult.data, buildPatientsIndex(patients)),
    };
  },

  updateStatus: async (id: string, status: Session["status"]): Promise<ApiResult<Session>> => {
    const rawStatus = status === "pending" ? "scheduled" : status;
    const [result, patients] = await Promise.all([
      api.patch<RawSession>(`/sessions/${id}/status`, { status: rawStatus }),
      resolvePatientsIndex(),
    ]);

    if (!result.success) return result as unknown as ApiResult<Session>;

    return {
      ...result,
      data: mapSession(result.data, buildPatientsIndex(patients)),
    };
  },

  update: async (
    id: string,
    data: Partial<{
      patient_id: string;
      scheduled_at: string;
      duration_minutes?: number;
      location_type?: "remote" | "presencial"
    }>
  ): Promise<ApiResult<Session>> => {
    const [result, patients] = await Promise.all([
      api.patch<RawSession>(`/sessions/${id}`, data),
      resolvePatientsIndex(),
    ]);

    if (!result.success) return result as unknown as ApiResult<Session>;

    return {
      ...result,
      data: mapSession(result.data, buildPatientsIndex(patients)),
    };
  },

  getTranscript: (id: string): Promise<ApiResult<SessionTranscript>> =>
    api.get<SessionTranscript>(`/sessions/${id}/transcript`),

  getSuggestions: async (weekStart: string): Promise<ApiResult<CalendarSuggestion[]>> => {
    return api.get<CalendarSuggestion[]>(`/sessions/suggestions?week_start=${weekStart}`);
  },

  cancelSeries: async (seriesId: string): Promise<ApiResult<{ cancelled: number }>> => {
    return api.delete<{ cancelled: number }>(`/sessions/series/${seriesId}`);
  },

  updateSeries: async (seriesId: string, data: {
    time?: string;
    duration_minutes?: number;
    location_type?: "remote" | "presencial"
  }): Promise<ApiResult<{ updated: number }>> => {
    return api.patch<{ updated: number }>(`/sessions/series/${seriesId}`, data);
  },
  
  delete: async (id: string): Promise<ApiResult<{ deleted: boolean }>> => {
    return api.delete<{ deleted: boolean }>(`/sessions/${id}`);
  },
};
