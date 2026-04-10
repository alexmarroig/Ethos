import { api, type ApiResult } from "./apiClient";
import { patientService, type Patient } from "./patientService";

type RawSession = {
  id: string;
  patient_id: string;
  scheduled_at?: string;
  date?: string;
  time?: string;
  patient_name?: string;
  duration_minutes?: number;
  duration?: number;
  status: "scheduled" | "confirmed" | "pending" | "missed" | "completed";
  has_audio?: boolean;
  has_transcription?: boolean;
  has_clinical_note?: boolean;
  clinical_note_status?: "draft" | "validated";
  payment_status?: "paid" | "open" | "exempt";
};

type RawPaginatedSessions = {
  items: RawSession[];
  page: number;
  page_size: number;
  total: number;
};

export interface Session {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_total_sessions?: number;
  date: string;
  time: string;
  duration?: number;
  status: "confirmed" | "pending" | "missed" | "completed";
  has_audio?: boolean;
  has_transcription?: boolean;
  has_clinical_note?: boolean;
  clinical_note_status?: "draft" | "validated";
  payment_status?: "paid" | "open" | "exempt";
  scheduled_at?: string;
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
  return status === "scheduled" ? "pending" : status;
}

function mapSession(raw: RawSession, patients: Patient[]): Session {
  const patient = patients.find((item) => item.id === raw.patient_id || item.external_id === raw.patient_id);
  const { date, time, scheduled_at } = formatDateParts(raw);

  return {
    id: String(raw.id),
    patient_id: raw.patient_id,
    patient_name: raw.patient_name ?? patient?.name ?? "Paciente",
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
  };
}

async function loadPatientsIndex() {
  const patientsResult = await patientService.list();
  return patientsResult.success ? patientsResult.data : [];
}

export const sessionService = {
  list: async (filters?: SessionFilters): Promise<ApiResult<Session[]>> => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "100");
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.status) params.set("status", filters.status === "pending" ? "scheduled" : filters.status);
    if (filters?.patient_id) params.set("patient_id", filters.patient_id);
    const qs = params.toString();

    const [sessionsResult, patients] = await Promise.all([
      api.get<RawPaginatedSessions>(`/sessions?${qs}`),
      loadPatientsIndex(),
    ]);

    if (!sessionsResult.success) return sessionsResult;

    const mapped = sessionsResult.data.items.map((item) => mapSession(item, patients));
    const filtered = mapped.filter((item) => {
      if (filters?.from && item.date < filters.from) return false;
      if (filters?.to && item.date > filters.to) return false;
      if (filters?.status && item.status !== filters.status) return false;
      if (filters?.patient_id && item.patient_id !== filters.patient_id) return false;
      return true;
    });

    return {
      ...sessionsResult,
      data: filtered,
    };
  },

  getById: async (id: string): Promise<ApiResult<Session>> => {
    const [sessionResult, patients] = await Promise.all([
      api.get<RawSession>(`/sessions/${id}`),
      loadPatientsIndex(),
    ]);

    if (!sessionResult.success) return sessionResult;

    return {
      ...sessionResult,
      data: mapSession(sessionResult.data, patients),
    };
  },

  create: async (data: {
    patient_id: string;
    scheduled_at: string;
    duration_minutes?: number;
  }): Promise<ApiResult<Session>> => {
    const [createResult, patients] = await Promise.all([
      api.post<RawSession>("/sessions", data),
      loadPatientsIndex(),
    ]);

    if (!createResult.success) return createResult;

    return {
      ...createResult,
      data: mapSession(createResult.data, patients),
    };
  },

  updateStatus: async (id: string, status: "pending" | "confirmed" | "missed" | "completed"): Promise<ApiResult<Session>> => {
    const rawStatus = status === "pending" ? "scheduled" : status;
    const [result, patients] = await Promise.all([
      api.patch<RawSession>(`/sessions/${id}/status`, { status: rawStatus }),
      loadPatientsIndex(),
    ]);

    if (!result.success) return result;

    return {
      ...result,
      data: mapSession(result.data, patients),
    };
  },

  update: async (
    id: string,
    data: Partial<{ patient_id: string; scheduled_at: string; duration_minutes?: number }>
  ): Promise<ApiResult<Session>> => {
    const [result, patients] = await Promise.all([
      api.patch<RawSession>(`/sessions/${id}`, data),
      loadPatientsIndex(),
    ]);

    if (!result.success) return result;

    return {
      ...result,
      data: mapSession(result.data, patients),
    };
  },

  getTranscript: (id: string): Promise<ApiResult<SessionTranscript>> =>
    api.get<SessionTranscript>(`/sessions/${id}/transcript`),
};
