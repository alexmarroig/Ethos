import { api, ApiResult } from "./apiClient";

export interface Anamnesis {
  id: string;
  patient_id: string;
  template?: string;
  content: Record<string, string>;
  version: number;
  created_at: string;
  updated_at?: string;
}

export const anamnesisService = {
  create: (data: { patient_id: string; template?: string; content: Record<string, string> }): Promise<ApiResult<Anamnesis>> =>
    api.post<Anamnesis>("/anamnesis", data),

  list: (patientId?: string): Promise<ApiResult<Anamnesis[]>> => {
    const qs = patientId ? `?patient_id=${patientId}` : "";
    return api.get<Anamnesis[]>(`/anamnesis${qs}`);
  },
};
