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

export const formService = {
  list: (): Promise<ApiResult<Form[]>> =>
    api.get<Form[]>("/forms"),

  createEntry: (data: { form_id: string; patient_id: string; data: unknown }): Promise<ApiResult<FormEntry>> =>
    api.post<FormEntry>("/forms/entry", data),
};
