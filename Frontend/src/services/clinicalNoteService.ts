import { api, ApiResult } from "./apiClient";

export interface ClinicalNote {
  id: string;
  session_id: string;
  status: "draft" | "validated";
  validated_at?: string;
  validated_by?: string;
  content: {
    queixa_principal: string;
    observacoes_clinicas: string;
    evolucao: string;
    plano_terapeutico: string;
  };
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export const clinicalNoteService = {
  create: (sessionId: string, content: ClinicalNote["content"]): Promise<ApiResult<ClinicalNote>> =>
    api.post<ClinicalNote>(`/sessions/${sessionId}/clinical-note`, { content }),

  listBySession: (sessionId: string): Promise<ApiResult<ClinicalNote[]>> =>
    api.get<ClinicalNote[]>(`/sessions/${sessionId}/clinical-notes`),

  getById: (noteId: string): Promise<ApiResult<ClinicalNote>> =>
    api.get<ClinicalNote>(`/clinical-notes/${noteId}`),

  validate: (noteId: string): Promise<ApiResult<ClinicalNote>> =>
    api.post<ClinicalNote>(`/clinical-notes/${noteId}/validate`),
};
