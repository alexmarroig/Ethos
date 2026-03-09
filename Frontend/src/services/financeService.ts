import { api, ApiResult } from "./apiClient";

export interface FinancialEntry {
  id: string;
  patient_id: string;
  patient_name?: string;
  session_id?: string;
  amount: number;
  payment_method?: string;
  status: "paid" | "open" | "exempt" | "package";
  due_date?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
}

export const financeService = {
  createEntry: (data: Partial<FinancialEntry>): Promise<ApiResult<FinancialEntry>> =>
    api.post<FinancialEntry>("/financial/entry", data),

  listEntries: (filters?: { patient_id?: string; status?: string }): Promise<ApiResult<FinancialEntry[]>> => {
    const params = new URLSearchParams();
    if (filters?.patient_id) params.set("patient_id", filters.patient_id);
    if (filters?.status) params.set("status", filters.status);
    const qs = params.toString();
    return api.get<FinancialEntry[]>(`/financial/entries${qs ? `?${qs}` : ""}`);
  },
};
