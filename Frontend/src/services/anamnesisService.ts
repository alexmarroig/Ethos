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

type RawAnamnesis = {
  id: string;
  patient_id: string;
  template?: string;
  template_id?: string;
  content: Record<string, string>;
  version: number;
  created_at: string;
  updated_at?: string;
};

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

const mapAnamnesis = (record: RawAnamnesis): Anamnesis => ({
  id: record.id,
  patient_id: record.patient_id,
  template: record.template ?? record.template_id ?? "default",
  content: record.content ?? {},
  version: record.version,
  created_at: record.created_at,
  updated_at: record.updated_at,
});

export const anamnesisService = {
  create: async (data: { patient_id: string; template?: string; content: Record<string, string> }): Promise<ApiResult<Anamnesis>> => {
    const result = await api.post<RawAnamnesis>("/anamnesis", {
      patient_id: data.patient_id,
      template_id: data.template,
      content: data.content,
    });
    if (!result.success) return result;
    return { ...result, data: mapAnamnesis(result.data) };
  },

  list: (patientId?: string): Promise<ApiResult<Anamnesis[]>> => {
    const qs = patientId ? `?patient_id=${patientId}` : "";
    return api.get<PaginatedResponse<RawAnamnesis> | RawAnamnesis[]>(`/anamnesis${qs}`).then((result) => {
      if (!result.success) return result;
      const items = Array.isArray(result.data) ? result.data : result.data.items;
      return {
        ...result,
        data: items.map(mapAnamnesis),
      };
    });
  },
};
