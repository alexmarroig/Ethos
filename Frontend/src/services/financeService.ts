import { api, type ApiResult } from "./apiClient";
import { type Patient } from "./patientService";
import { resolvePatientsIndex } from "./patientIndexCache";

type RawFinancialEntry = {
  id: string;
  patient_id: string;
  session_id?: string;
  amount: number;
  payment_method?: string;
  status: "paid" | "open" | "exempt" | "package";
  due_date?: string;
  paid_at?: string;
  notes?: string;
  description?: string;
  created_at: string;
  is_exempt?: boolean;
  is_partial?: boolean;
  total_amount?: number;
  amount_paid?: number;
  paid_amount?: number;
  insurance_provider?: string;
  session_package_id?: string;
  repasse_amount?: number;
  receivable_amount?: number;
  payment_origin?: string;
};

type RawPaginatedFinancialEntries = {
  items: RawFinancialEntry[];
  page: number;
  page_size: number;
  total: number;
  next_cursor?: string | null;
};

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
  description?: string;
  created_at: string;
  is_exempt?: boolean;
  is_partial?: boolean;
  total_amount?: number;
  amount_paid?: number;
  paid_amount?: number;
  insurance_provider?: string;
  session_package_id?: string;
  repasse_amount?: number;
  receivable_amount?: number;
  payment_origin?: string;
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
    is_exempt: raw.is_exempt,
    is_partial: raw.is_partial,
    total_amount: raw.total_amount,
    amount_paid: raw.amount_paid,
    paid_amount: raw.paid_amount,
    insurance_provider: raw.insurance_provider,
    session_package_id: raw.session_package_id,
    repasse_amount: raw.repasse_amount,
    receivable_amount: raw.receivable_amount,
    payment_origin: raw.payment_origin,
  };
}

export interface FinancialSummary {
  overdue_count: number;
  overdue_total: number;
  due_soon_count: number;
}

export interface FinanceListFilters {
  page?: number;
  page_size?: number;
  cursor?: string;
  patient_id?: string;
  session_id?: string;
  status?: string;
  due_from?: string;
  due_to?: string;
}

export interface FinancialEntriesPage {
  items: FinancialEntry[];
  page: number;
  page_size: number;
  total: number;
  next_cursor?: string | null;
}

export const financeService = {
  createEntry: async (data: {
    patient_id: string;
    session_id?: string;
    amount: number;
    payment_method?: string;
    due_date?: string;
    status?: "open" | "paid" | "exempt" | "package";
    notes?: string;
    description?: string;
    is_exempt?: boolean;
    is_partial?: boolean;
    total_amount?: number;
    amount_paid?: number;
    paid_amount?: number;
    insurance_provider?: string;
    session_package_id?: string;
    repasse_amount?: number;
    receivable_amount?: number;
    payment_origin?: string;
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
        is_exempt: data.is_exempt,
        is_partial: data.is_partial,
        total_amount: data.total_amount,
        amount_paid: data.amount_paid,
        paid_amount: data.paid_amount,
        insurance_provider: data.insurance_provider,
        session_package_id: data.session_package_id,
        repasse_amount: data.repasse_amount,
        receivable_amount: data.receivable_amount,
        payment_origin: data.payment_origin,
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
      status: "open" | "paid" | "exempt" | "package";
      paid_at?: string;
      notes?: string;
      description?: string;
      is_exempt?: boolean;
      is_partial?: boolean;
      total_amount?: number;
      amount_paid?: number;
      paid_amount?: number;
      insurance_provider?: string;
      session_package_id?: string;
      repasse_amount?: number;
      receivable_amount?: number;
      payment_origin?: string;
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

  listEntriesPage: async (
    filters?: FinanceListFilters,
    patientsIndex?: Patient[],
  ): Promise<ApiResult<FinancialEntriesPage>> => {
    const params = new URLSearchParams();
    params.set("page", String(filters?.page ?? 1));
    params.set("page_size", String(filters?.page_size ?? 100));
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.patient_id) params.set("patient_id", filters.patient_id);
    if (filters?.session_id) params.set("session_id", filters.session_id);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.due_from) params.set("due_from", filters.due_from);
    if (filters?.due_to) params.set("due_to", filters.due_to);
    const qs = params.toString();

    const [result, patients] = await Promise.all([
      api.get<RawPaginatedFinancialEntries>(`/financial/entries?${qs}`),
      resolvePatientsIndex(patientsIndex),
    ]);

    if (!result.success) return result;

    return {
      ...result,
      data: {
        items: result.data.items.map((item) => mapEntry(item, patients)),
        page: result.data.page,
        page_size: result.data.page_size,
        total: result.data.total,
        next_cursor: result.data.next_cursor,
      },
    };
  },

  listEntries: async (filters?: FinanceListFilters): Promise<ApiResult<FinancialEntry[]>> => {
    const result = await financeService.listEntriesPage(filters);
    if (!result.success) return result;
    return {
      ...result,
      data: result.data.items,
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
