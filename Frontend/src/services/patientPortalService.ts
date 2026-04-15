import { api, type ApiResult } from "./apiClient";
import type { Form, FormEntry } from "./formService";

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

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
  type: string;
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

function ok<TInput, TOutput>(
  result: ApiResult<TInput>,
  mapper: (value: TInput) => TOutput,
): ApiResult<TOutput> {
  if (!result.success) return result;
  return {
    ...result,
    data: mapper(result.data),
  };
}

function emptySuccess<T>(requestId = "local", data: T): ApiResult<T> {
  return {
    success: true,
    data,
    request_id: requestId,
  };
}

export const patientPortalService = {
  getPermissions: () =>
    api.get<{
      permissions: { scales: boolean; diary: boolean; session_confirmation: boolean; async_messages_per_day: number };
      patient_id: string;
      owner_user_id: string;
    }>("/patient/permissions"),

  getSessions: async (): Promise<ApiResult<PatientSession[]>> => {
    const result = await api.get<PaginatedResponse<any>>("/patient/sessions?page=1&page_size=50");
    return ok(result, (payload) =>
      payload.items.map((item) => ({
        id: item.id,
        date: item.scheduled_at
          ? new Date(item.scheduled_at).toLocaleDateString("pt-BR")
          : item.date ?? "",
        time: item.scheduled_at
          ? new Date(item.scheduled_at).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : item.time ?? "",
        scheduled_at: item.scheduled_at,
        status: item.status,
        confirmed: item.status === "confirmed",
      })),
    );
  },

  confirmSession: (sessionId: string) => api.post(`/patient/sessions/${sessionId}/confirm`),

  recordScale: (data: { scale_id: string; score: number; answers?: unknown }) =>
    api.post("/patient/scales/record", data),

  createDiaryEntry: (content: string): Promise<ApiResult<DiaryEntry>> =>
    api.post<DiaryEntry>("/patient/diary/entries", { content }),

  sendMessage: async (content: string): Promise<ApiResult<PatientMessage>> => {
    const result = await api.post<{ message: { id: string; message: string; created_at: string } }>(
      "/patient/messages",
      { message: content },
    );
    return ok(result, (payload) => ({
      id: payload.message.id,
      content: payload.message.message,
      sent_at: payload.message.created_at,
      read: true,
    }));
  },

  listForms: () => api.get<Form[]>("/patient/forms"),

  createFormEntry: (data: { form_id: string; content: Record<string, unknown> }) =>
    api.post<FormEntry>("/patient/forms/entry", data),

  getSharedDocuments: async (): Promise<ApiResult<SharedDocument[]>> => {
    const shared = await api.get<SharedDocument[]>("/patient/shared-documents");
    if (shared.success) return shared;
    if (shared.status === 404) {
      const docs = await api.get<PaginatedResponse<any>>("/patient/documents?page=1&page_size=50");
      return ok(docs, (payload) =>
        payload.items.map((item) => ({
          id: item.id,
          type: item.template_id === "therapy-contract" ? "contract" : "document",
          title: item.title,
          kind: item.template_id,
          status: item.status,
          created_at: item.created_at,
          shared_at: item.created_at,
          patient_id: item.patient_id,
        })),
      );
    }
    return shared;
  },

  getFinancial: async (): Promise<ApiResult<PatientFinancialEntry[]>> => {
    const result = await api.get<PatientFinancialEntry[]>("/patient/financial");
    if (!result.success && result.status === 404) return emptySuccess(result.request_id, []);
    return result;
  },

  signContract: (contractId: string) => api.post(`/patient/contracts/${contractId}/sign`),

  getNotifications: async (): Promise<ApiResult<PatientNotification[]>> => {
    const result = await api.get<PatientNotification[]>("/patient/notifications");
    if (!result.success && result.status === 404) return emptySuccess(result.request_id, []);
    return result;
  },

  markNotificationRead: async (notificationId: string) => {
    const result = await api.post(`/patient/notifications/${notificationId}/read`);
    if (!result.success && result.status === 404) return emptySuccess(result.request_id, {});
    return result;
  },

  getAvailableSlots: (startDate: string, endDate: string) =>
    api.get<AvailableSlot[]>(`/patient/available-slots?start=${startDate}&end=${endDate}`),

  requestSlot: (data: { date: string; time: string; duration: number }) =>
    api.post<SlotRequest>("/patient/slot-request", data),

  getSlotRequests: () => api.get<SlotRequest[]>("/patient/slot-requests"),
};

export const shareApi = {
  toggleShare: (
    type: "contracts" | "reports" | "documents" | "financial/entries",
    id: string,
    shared: boolean,
  ) => api.post(`/${type}/${id}/share`, { shared }),
};
