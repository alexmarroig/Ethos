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

type RawScaleRecord = Omit<ScaleRecord, "applied_at"> & {
  applied_at?: string;
  recorded_at?: string;
};

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

const mapScaleRecord = (record: RawScaleRecord): ScaleRecord => ({
  ...record,
  applied_at: record.applied_at ?? record.recorded_at ?? new Date().toISOString(),
});

export const scaleService = {
  list: (): Promise<ApiResult<Scale[]>> =>
    api.get<Scale[]>("/scales"),

  record: async (data: { scale_id: string; patient_id: string; score: number; answers?: unknown }): Promise<ApiResult<ScaleRecord>> => {
    const result = await api.post<RawScaleRecord>("/scales/record", data);
    if (!result.success) return result;
    return { ...result, data: mapScaleRecord(result.data) };
  },

  listRecords: async (patientId?: string): Promise<ApiResult<ScaleRecord[]>> => {
    const qs = patientId ? `?patient_id=${patientId}` : "";
    const result = await api.get<PaginatedResponse<RawScaleRecord> | RawScaleRecord[]>(`/scales/records${qs}`);
    if (!result.success) return result;
    const items = Array.isArray(result.data) ? result.data : result.data.items;
    return { ...result, data: items.map(mapScaleRecord) };
  },
};
