import { api, ApiResult } from "./apiClient";

export interface Scale {
  id: string;
  name: string;
  description?: string;
  items?: unknown[];
}

export interface ScaleRecord {
  id: string;
  scale_id: string;
  patient_id: string;
  score: number;
  answers?: unknown;
  applied_at: string;
}

export const scaleService = {
  list: (): Promise<ApiResult<Scale[]>> =>
    api.get<Scale[]>("/scales"),

  record: (data: { scale_id: string; patient_id: string; score: number; answers?: unknown }): Promise<ApiResult<ScaleRecord>> =>
    api.post<ScaleRecord>("/scales/record", data),

  listRecords: (patientId?: string): Promise<ApiResult<ScaleRecord[]>> => {
    const qs = patientId ? `?patient_id=${patientId}` : "";
    return api.get<ScaleRecord[]>(`/scales/records${qs}`);
  },
};
