import { api, ApiResult } from "./apiClient";

export interface Form {
  id: string;
  title?: string;
  name: string;
  description?: string;
  audience?: "patient" | "professional";
  active?: boolean;
  assignment_id?: string;
  mode?: "single_use" | "recurring";
  can_submit?: boolean;
  shared_at?: string;
  last_submitted_at?: string;
  response_count?: number;
  assignments_count?: number;
  responses_count?: number;
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
  assignment_id?: string;
  data: unknown;
  submitted_by?: "patient" | "professional";
  created_at: string;
}

export interface FormAssignment {
  id: string;
  form_id: string;
  patient_id: string;
  mode: "single_use" | "recurring";
  active: boolean;
  shared_at: string;
  last_submitted_at?: string;
  response_count?: number;
  can_submit?: boolean;
  form?: Form;
  patient?: { id: string; name?: string; label?: string; email?: string };
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
  assignment_id: (entry as RawFormEntry & { assignment_id?: string }).assignment_id,
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

  listAssignments: async (filters?: { patient_id?: string; form_id?: string; active?: boolean }): Promise<ApiResult<FormAssignment[]>> => {
    const params = new URLSearchParams();
    if (filters?.patient_id) params.set("patient_id", filters.patient_id);
    if (filters?.form_id) params.set("form_id", filters.form_id);
    if (filters?.active !== undefined) params.set("active", String(filters.active));
    const qs = params.toString();
    return api.get<FormAssignment[]>(`/forms/assignments${qs ? `?${qs}` : ""}`);
  },

  assignToPatient: (data: {
    form_id: string;
    patient_id: string;
    mode: "single_use" | "recurring";
    active?: boolean;
  }): Promise<ApiResult<FormAssignment>> =>
    api.post<FormAssignment>("/forms/assignments", data),

  updateAssignment: (
    assignmentId: string,
    data: Partial<Pick<FormAssignment, "active" | "mode">>,
  ): Promise<ApiResult<FormAssignment>> =>
    api.patch<FormAssignment>(`/forms/assignments/${assignmentId}`, data),
};
