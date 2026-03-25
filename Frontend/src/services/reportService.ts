import { api, ApiResult } from "./apiClient";

export interface Report {
  id: string;
  patient_id: string;
  patient_name?: string;
  clinical_note_id: string;
  purpose: string;
  content?: string;
  status: "draft" | "final";
  created_at?: string;
}

export const reportService = {
  create: (data: { patient_id: string; clinical_note_id: string; purpose: string }): Promise<ApiResult<Report>> =>
    api.post<Report>("/reports", data),

  list: (): Promise<ApiResult<Report[]>> =>
    api.get<Report[]>("/reports"),

  getById: (id: string): Promise<ApiResult<Report>> =>
    api.get<Report>(`/reports/${id}`),
};
