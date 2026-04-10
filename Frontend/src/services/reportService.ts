import { api, ApiResult } from "./apiClient";

export interface Report {
  id: string;
  patient_id: string;
  patient_name?: string;
  purpose: string;
  content?: string;
  status?: "draft" | "final";
  created_at?: string;
}

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

export const reportService = {
  create: (data: { patient_id: string; purpose: string; content: string }): Promise<ApiResult<Report>> =>
    api.post<Report>("/reports", data),

  update: (
    reportId: string,
    data: Partial<{ purpose: string; content: string; status: "draft" | "final" }>,
  ): Promise<ApiResult<Report>> =>
    api.patch<Report>(`/reports/${reportId}`, data),

  list: async (): Promise<ApiResult<Report[]>> => {
    const result = await api.get<PaginatedResponse<Report> | Report[]>("/reports");
    if (!result.success) return result;
    return {
      ...result,
      data: Array.isArray(result.data) ? result.data : result.data.items,
    };
  },

  getById: (id: string): Promise<ApiResult<Report>> =>
    api.get<Report>(`/reports/${id}`),
};
