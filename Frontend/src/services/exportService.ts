import { api, ApiResult } from "./apiClient";

export const exportService = {
  exportPdf: (data: { document_type: string; document_id: string }): Promise<ApiResult<{ url: string }>> =>
    api.post<{ url: string }>("/export/pdf", data),

  exportDocx: (data: { document_type: string; document_id: string }): Promise<ApiResult<{ url: string }>> =>
    api.post<{ url: string }>("/export/docx", data),
};
