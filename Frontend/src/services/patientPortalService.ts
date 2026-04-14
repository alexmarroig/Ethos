import { api, ApiResult } from "./apiClient";
import type { Form, FormEntry } from "./formService";

export interface PatientSession {
  id: string;
  date: string;
  time: string;
  scheduled_at?: string;
  status: string;
  confirmed: boolean;
}

export interface DiaryEntry {
  id: string;
  content: string;
  created_at: string;
}

export interface PatientMessage {
  id: string;
  content: string;
  sent_at: string;
  read: boolean;
}

export interface SharedDocument {
  id: string;
  type: "contract" | "report" | "document";
  title?: string;
  kind?: string;
  status?: string;
  content?: string;
  shared_at?: string;
  created_at: string;
  patient_id?: string;
  terms?: { value?: string; periodicity?: string; absence_policy?: string; payment_method?: string };
  psychologist?: { name?: string; license?: string; email?: string };
}

export interface PatientFinancialEntry {
  id: string;
  amount: number;
  status: "paid" | "open";
  due_date?: string;
  paid_at?: string;
  payment_method?: string;
  description?: string;
}

export interface PatientNotification {
  id: string;
  type: "session_reminder" | "payment_due" | "document_shared" | "slot_response";
  data: Record<string, string>;
  read: boolean;
  created_at: string;
}

export interface AvailableSlot {
  date: string;
  time: string;
  duration: number;
}

export interface SlotRequest {
  id: string;
  requested_date: string;
  requested_time: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "rejected";
  rejection_reason?: string;
  created_at: string;
}

export const patientPortalService = {
  getPermissions: (): Promise<ApiResult<{ scales: boolean; diary: boolean; messages: boolean }>> =>
    api.get("/patient/permissions"),

  getSessions: (): Promise<ApiResult<PatientSession[]>> =>
    api.get<PatientSession[]>("/patient/sessions"),

  confirmSession: (sessionId: string): Promise<ApiResult<{ confirmed: boolean }>> =>
    api.post(`/patient/sessions/${sessionId}/confirm`),

  recordScale: (data: { scale_id: string; score: number; answers?: unknown }): Promise<ApiResult<unknown>> =>
    api.post("/patient/scales/record", data),

  createDiaryEntry: (content: string): Promise<ApiResult<DiaryEntry>> =>
    api.post<DiaryEntry>("/patient/diary/entries", { content }),

  sendMessage: (content: string): Promise<ApiResult<PatientMessage>> =>
    api.post<PatientMessage>("/patient/messages", { content }),

  listForms: (): Promise<ApiResult<Form[]>> =>
    api.get<Form[]>("/patient/forms"),

  createFormEntry: (data: { form_id: string; content: Record<string, unknown> }): Promise<ApiResult<FormEntry>> =>
    api.post<FormEntry>("/patient/forms/entry", data),

  getSharedDocuments: (): Promise<ApiResult<SharedDocument[]>> =>
    api.get<SharedDocument[]>("/patient/shared-documents"),

  getFinancial: (): Promise<ApiResult<PatientFinancialEntry[]>> =>
    api.get<PatientFinancialEntry[]>("/patient/financial"),

  signContract: (contractId: string): Promise<ApiResult<unknown>> =>
    api.post(`/patient/contracts/${contractId}/sign`),

  getNotifications: (): Promise<ApiResult<PatientNotification[]>> =>
    api.get<PatientNotification[]>("/patient/notifications"),

  markNotificationRead: (notificationId: string): Promise<ApiResult<unknown>> =>
    api.post(`/patient/notifications/${notificationId}/read`),

  getAvailableSlots: (startDate: string, endDate: string): Promise<ApiResult<AvailableSlot[]>> =>
    api.get<AvailableSlot[]>(`/patient/available-slots?start=${startDate}&end=${endDate}`),

  requestSlot: (data: { date: string; time: string; duration: number }): Promise<ApiResult<SlotRequest>> =>
    api.post<SlotRequest>("/patient/slot-request", data),

  getSlotRequests: (): Promise<ApiResult<SlotRequest[]>> =>
    api.get<SlotRequest[]>("/patient/slot-requests"),
};

export const shareApi = {
  toggleShare: (
    type: "contracts" | "reports" | "documents" | "financial/entries",
    id: string,
    shared: boolean,
  ): Promise<ApiResult<unknown>> => api.post(`/${type}/${id}/share`, { shared }),
};
