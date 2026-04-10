import { api, ApiResult } from "./apiClient";

export interface Form {
  id: string;
  title?: string;
  name: string;
  description?: string;
  audience?: "patient" | "professional";
  active?: boolean;
  fields?: Array<{
    id: string;
    label: string;
    type: "text" | "textarea" | "date" | "select";
    placeholder?: string;
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
  }>;
}

export interface FormEntry {
  id: string;
  form_id: string;
  patient_id: string;
  data: unknown;
  submitted_by?: "patient" | "professional";
  created_at: string;
}

type RawFormEntry = {
  id: string;
  form_id: string;
  patient_id: string;
  content?: unknown;
  data?: unknown;
  submitted_by?: "patient" | "professional";
  created_at: string;
};

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

const mapForm = (form: Form): Form => ({
  ...form,
  name: form.name ?? form.title ?? "Formulário",
});

const mapFormEntry = (entry: RawFormEntry): FormEntry => ({
  id: entry.id,
  form_id: entry.form_id,
  patient_id: entry.patient_id,
  data: entry.data ?? entry.content ?? {},
  submitted_by: entry.submitted_by,
  created_at: entry.created_at,
});

export const formService = {
  list: async (): Promise<ApiResult<Form[]>> => {
    const result = await api.get<PaginatedResponse<Form> | Form[]>("/forms");
    if (!result.success) return result;
    return {
      ...result,
      data: (Array.isArray(result.data) ? result.data : result.data.items).map(mapForm),
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

  createTemplate: async (data: Omit<Form, "id" | "name"> & { title: string; fields: NonNullable<Form["fields"]> }): Promise<ApiResult<Form>> => {
    const result = await api.post<Form>("/forms", data);
    if (!result.success) return result;
    return { ...result, data: mapForm(result.data) };
  },

  updateTemplate: async (formId: string, data: Partial<Form>): Promise<ApiResult<Form>> =>
    (async () => {
      const result = await api.patch<Form>(`/forms/${formId}`, data);
      if (!result.success) return result;
      return { ...result, data: mapForm(result.data) };
    })(),

  deleteTemplate: async (formId: string): Promise<ApiResult<{ deleted: boolean }>> =>
    api.delete<{ deleted: boolean }>(`/forms/${formId}`),
};
