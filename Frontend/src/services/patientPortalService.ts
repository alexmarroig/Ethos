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
  content: Record<string, unknown>;
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

export interface SharedDocumentDetail extends SharedDocument {
  versions?: Array<{ id: string; content: string; created_at?: string }>;
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

export interface PatientTask {
  id: string;
  title: string;
  date: string;
  time?: string;
  completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export type PatientTaskPayload = {
  title: string;
  date: string;
  time?: string;
  completed?: boolean;
};

export interface DreamDiaryEntry {
  id: string;
  patient_id: string;
  dream_date: string;
  title?: string;
  narrative: string;
  emotions: string[];
  emotional_intensity: 1 | 2 | 3 | 4 | 5;
  physical_sensations?: string;
  characters?: string;
  setting?: string;
  patient_interpretation?: string;
  associations?: string;
  is_recurring: boolean;
  wake_state: "tranquilo" | "agitado" | "confuso" | "assustado" | "neutro";
  created_at: string;
}

export type DreamDiaryEntryPayload = Omit<DreamDiaryEntry, "id" | "patient_id" | "created_at">;

const builtInFormFields: Record<string, NonNullable<Form["fields"]>> = {
  "emotion-diary": [
    {
      id: "mood",
      label: "Como você se sentiu hoje?",
      type: "select",
      required: true,
      options: [
        { label: "Muito mal", value: "muito_mal" },
        { label: "Mal", value: "mal" },
        { label: "Neutro", value: "neutro" },
        { label: "Bem", value: "bem" },
        { label: "Muito bem", value: "muito_bem" },
      ],
    },
    {
      id: "trigger",
      label: "O que aconteceu de importante hoje?",
      type: "textarea",
      required: true,
      placeholder: "Descreva brevemente o que aconteceu.",
    },
    {
      id: "body_reaction",
      label: "Como seu corpo reagiu?",
      type: "textarea",
      placeholder: "Ex.: aperto no peito, cansaço, agitação...",
    },
  ],
  "initial-anamnesis": [
    {
      id: "main_reason",
      label: "Qual o principal motivo para buscar atendimento agora?",
      type: "textarea",
      required: true,
    },
    {
      id: "history",
      label: "Há algum histórico importante que queira compartilhar?",
      type: "textarea",
    },
    {
      id: "expectation",
      label: "O que você espera do processo terapêutico?",
      type: "textarea",
    },
  ],
  "weekly-checkin": [
    {
      id: "week_summary",
      label: "Como foi sua semana?",
      type: "textarea",
      required: true,
    },
    {
      id: "main_difficulty",
      label: "Qual foi a maior dificuldade da semana?",
      type: "textarea",
    },
    {
      id: "highlight",
      label: "Houve algo positivo que gostaria de registrar?",
      type: "textarea",
    },
  ],
};

const withFallbackFields = (form: Form): Form => ({
  ...form,
  fields:
    form.fields && form.fields.length > 0
      ? form.fields
      : builtInFormFields[form.id] ?? [],
});

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

  listForms: async (): Promise<ApiResult<Form[]>> => {
    const result = await api.get<Form[]>("/patient/forms");
    return ok(result, (forms) => forms.map(withFallbackFields));
  },

  createFormEntry: (data: { form_id: string; content: Record<string, unknown> }) =>
    api.post<FormEntry>("/patient/forms/entry", data),

  getFormEntries: async (formId?: string): Promise<ApiResult<FormEntry[]>> => {
    const suffix = formId ? `?form_id=${encodeURIComponent(formId)}` : "";
    const result = await api.get<FormEntry[]>(`/patient/forms/entries${suffix}`);
    return ok(result, (entries) =>
      entries.map((entry) => ({
        ...entry,
        data: (entry as unknown as { data?: unknown; content?: unknown }).data
          ?? (entry as unknown as { content?: unknown }).content
          ?? {},
      })),
    );
  },

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

  getSharedDocumentById: async (id: string): Promise<ApiResult<SharedDocumentDetail>> => {
    const result = await api.get<any>(`/patient/documents/${id}`);
    return ok(result, (payload) => ({
      id: payload.document?.id ?? id,
      type: payload.document?.template_id === "therapy-contract" ? "contract" : "document",
      title: payload.document?.title,
      kind: payload.document?.template_id,
      status: payload.document?.status,
      created_at: payload.document?.created_at,
      shared_at: payload.document?.shared_at ?? payload.document?.created_at,
      patient_id: payload.document?.patient_id,
      versions: payload.versions ?? [],
    }));
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


  getTasks: async (): Promise<ApiResult<PatientTask[]>> => {
    const result = await api.get<PatientTask[]>("/patient/tasks");
    if (!result.success && result.status === 404) return emptySuccess(result.request_id, []);
    return result;
  },

  createTask: (data: PatientTaskPayload) => api.post<PatientTask>("/patient/tasks", data),

  updateTask: (taskId: string, data: Partial<PatientTaskPayload>) =>
    api.patch<PatientTask>(`/patient/tasks/${taskId}`, data),

  deleteTask: (taskId: string) => api.delete<{ deleted: boolean }>(`/patient/tasks/${taskId}`),

  getDreamDiary: () => api.get<DreamDiaryEntry[]>("/patient/dream-diary"),
  createDreamDiaryEntry: (data: DreamDiaryEntryPayload) => api.post<DreamDiaryEntry>("/patient/dream-diary", data),
  deleteDreamDiaryEntry: (id: string) => api.delete<{ deleted: boolean }>(`/patient/dream-diary/${id}`),
};

export const shareApi = {
  toggleShare: (
    type: "contracts" | "reports" | "documents" | "financial/entries",
    id: string,
    shared: boolean,
  ) => api.post(`/${type}/${id}/share`, { shared }),
};
