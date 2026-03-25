import { api, ApiResult } from "./apiClient";

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

export interface SessionFilters {
  from?: string;
  to?: string;
  status?: string;
  patient_id?: string;
}

export const sessionService = {
  list: (filters?: SessionFilters): Promise<ApiResult<Session[]>> => {
    const params = new URLSearchParams();
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.patient_id) params.set("patient_id", filters.patient_id);
    const qs = params.toString();
    return api.get<Session[]>(`/sessions${qs ? `?${qs}` : ""}`);
  },

  getById: (id: string): Promise<ApiResult<Session>> =>
    api.get<Session>(`/sessions/${id}`),

  create: (data: Partial<Session>): Promise<ApiResult<Session>> =>
    api.post<Session>("/sessions", data),

  updateStatus: (id: string, status: string): Promise<ApiResult<Session>> =>
    api.patch<Session>(`/sessions/${id}/status`, { status }),
};
