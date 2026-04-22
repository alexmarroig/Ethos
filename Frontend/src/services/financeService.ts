import { api, type ApiResult } from "./apiClient";
import { type Patient } from "./patientService";
import { resolvePatientsIndex } from "./patientIndexCache";

type RawFinancialEntry = {
  id: string;
  patient_id: string;
  session_id?: string;
  amount: number;
  payment_method?: string;
  status: "paid" | "open";
  due_date?: string;
  paid_at?: string;
  notes?: string;
  description?: string;
  created_at: string;
};

type RawPaginatedFinancialEntries = {
  items: RawFinancialEntry[];
  page: number;
  page_size: number;
  total: number;
};

export interface FinancialEntry {
  id: string;
  patient_id: string;
  patient_name?: string;
  session_id?: string;
  amount: number;
  payment_method?: string;
  status: "paid" | "open";
  due_date?: string;
  paid_at?: string;
  notes?: string;
  description?: string;
  created_at: string;
}

export interface FinanceSummary {
  month: string;
  paid_sessions: number;
  pending_sessions: number;
  total_per_month: number;
  entries: FinancialEntry[];
}

function mapEntry(raw: RawFinancialEntry, patients: Patient[]): FinancialEntry {
  const patient = patients.find(
    (item) => item.id === raw.patient_id || item.external_id === raw.patient_id,
  );

  return {
    id: raw.id,
    patient_id: raw.patient_id,
    patient_name: patient?.name,
    session_id: raw.session_id,
    amount: raw.amount,
    payment_method: raw.payment_method,
    status: raw.status,
    due_date: raw.due_date,
    paid_at: raw.paid_at,
    notes: raw.notes ?? raw.description,
    description: raw.description,
    created_at: raw.created_at,
  };
}

export interface FinancialSummary {
  overdue_count: number;
  overdue_total: number;
  due_soon_count: number;
}

export const financeService = {
  createEntry: async (data: {
    patient_id: string;
    session_id?: string;
    amount: number;
    payment_method?: string;
    due_date?: string;
    status?: "open" | "paid";
    notes?: string;
    description?: string;
  }): Promise<ApiResult<FinancialEntry>> => {
    const [result, patients] = await Promise.all([
      api.post<RawFinancialEntry>("/financial/entry", {
        patient_id: data.patient_id,
        session_id: data.session_id,
        amount: data.amount,
        payment_method: data.payment_method,
        status: data.status ?? "open",
        due_date: data.due_date ?? new Date().toISOString(),
        type: "receivable",
        notes: data.notes,
        description: data.description ?? "Sessão de psicoterapia",
      }),
      resolvePatientsIndex(),
    ]);

    if (!result.success) return result;

    return {
      ...result,
      data: mapEntry(result.data, patients),
    };
  },

  updateEntry: async (
    entryId: string,
    data: Partial<{
      amount: number;
      payment_method?: string;
      due_date?: string;
      status: "open" | "paid";
      paid_at?: string;
      notes?: string;
      description?: string;
    }>,
  ): Promise<ApiResult<FinancialEntry>> => {
    const [result, patients] = await Promise.all([
      api.patch<RawFinancialEntry>(`/financial/entries/${entryId}`, data),
      resolvePatientsIndex(),
    ]);

    if (!result.success) return result;

    return {
      ...result,
      data: mapEntry(result.data, patients),
    };
  },

  listEntries: async (filters?: {
    patient_id?: string;
    status?: string;
  }, patientsIndex?: Patient[]): Promise<ApiResult<FinancialEntry[]>> => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "100");
    if (filters?.patient_id) params.set("patient_id", filters.patient_id);
    if (filters?.status) params.set("status", filters.status);
    const qs = params.toString();

    const [result, patients] = await Promise.all([
      api.get<RawPaginatedFinancialEntries>(`/financial/entries?${qs}`),
      resolvePatientsIndex(patientsIndex),
    ]);

    if (!result.success) return result;

    return {
      ...result,
      data: result.data.items.map((item) => mapEntry(item, patients)),
    };
  },

  getFinancialSummary: async (): Promise<ApiResult<FinancialSummary>> => {
    return api.get<FinancialSummary>("/financial/summary");
  },

  getSummary: async (): Promise<ApiResult<FinanceSummary>> => {
    const [result, patients] = await Promise.all([
      api.get<{
        month: string;
        paid_sessions: number;
        pending_sessions: number;
        total_per_month: number;
        entries: RawFinancialEntry[];
      }>("/finance"),
      resolvePatientsIndex(),
    ]);

    if (!result.success) return result;

    return {
      ...result,
      data: {
        ...result.data,
        entries: result.data.entries.map((entry) => mapEntry(entry, patients)),
      },
    };
  },
};
