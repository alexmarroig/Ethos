import { api, ApiResult } from "./apiClient";

export interface PatientSession {
  id: string;
  date: string;
  time: string;
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
};
