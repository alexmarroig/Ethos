import { api, ApiResult } from "./apiClient";

export interface Form {
  id: string;
  name: string;
  description?: string;
  fields?: unknown[];
}

export interface FormEntry {
  id: string;
  form_id: string;
  patient_id: string;
  data: unknown;
  created_at: string;
}

type RawFormEntry = {
  id: string;
  form_id: string;
  patient_id: string;
  content?: unknown;
  data?: unknown;
  created_at: string;
};

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

const mapFormEntry = (entry: RawFormEntry): FormEntry => ({
  id: entry.id,
  form_id: entry.form_id,
  patient_id: entry.patient_id,
  data: entry.data ?? entry.content ?? {},
  created_at: entry.created_at,
});

export const formService = {
  list: async (): Promise<ApiResult<Form[]>> => {
    const result = await api.get<PaginatedResponse<Form> | Form[]>("/forms");
    if (!result.success) return result;
    return {
      ...result,
      data: Array.isArray(result.data) ? result.data : result.data.items,
    };
  },

  createEntry: async (data: { form_id: string; patient_id: string; data: unknown }): Promise<ApiResult<FormEntry>> => {
    const result = await api.post<RawFormEntry>("/forms/entry", { ...data, content: data.data });
    if (!result.success) return result;
    return { ...result, data: mapFormEntry(result.data) };
  },

  listEntries: async (filters?: { patient_id?: string; form_id?: string }): Promise<ApiResult<FormEntry[]>> => {
    const params = new URLSearchParams();
    if (filters?.patient_id) params.set("patient_id", filters.patient_id);
    if (filters?.form_id) params.set("form_id", filters.form_id);
    const qs = params.toString();
    const result = await api.get<PaginatedResponse<RawFormEntry> | RawFormEntry[]>(`/forms/entries${qs ? `?${qs}` : ""}`);
    if (!result.success) return result;
    const items = Array.isArray(result.data) ? result.data : result.data.items;
    return { ...result, data: items.map(mapFormEntry) };
  },
};
