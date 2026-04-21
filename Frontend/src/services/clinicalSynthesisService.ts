import { api, type ApiResult, ok } from "./apiClient";

export type ClinicalSynthesis = {
  id: string;
  patient_id: string;
  content: string;
  based_on_sessions: string[];
  date_range?: string;
  last_updated: string;
  version: number;
  is_stale?: boolean;
};

export const clinicalSynthesisService = {
  get: async (patientId: string): Promise<ApiResult<ClinicalSynthesis | null>> => {
    const result = await api.get<ClinicalSynthesis | null>(`/patients/${patientId}/synthesis`);
    return ok(result, (data) => data);
  },

  refresh: async (patientId: string, sessionsLimit = 5, force = false): Promise<ApiResult<ClinicalSynthesis>> => {
    const result = await api.post<ClinicalSynthesis>(`/patients/${patientId}/synthesis`, { sessionsLimit, force });
    return ok(result, (data) => data);
  },

  update: async (patientId: string, content: string): Promise<ApiResult<ClinicalSynthesis>> => {
    const result = await api.patch<ClinicalSynthesis>(`/patients/${patientId}/synthesis`, { content });
    return ok(result, (data) => data);
  },
};
