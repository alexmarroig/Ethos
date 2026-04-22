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

type RawRevertPaymentResponse = RawFinancialEntry | {
  entry: RawFinancialEntry;
  affected_sessions?: Array<{
    id: string;
    status?: string;
    payment_status?: "paid" | "open" | "exempt";
  }>;
  audit?: {
    id?: string;
    created_at?: string;
  };
  reverted_at?: string;
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

export interface RevertPaymentResult {
  entry: FinancialEntry;
  affected_sessions: Array<{
    id: string;
    status?: string;
    payment_status?: "paid" | "open" | "exempt";
  }>;
  audit?: {
    id?: string;
    created_at?: string;
  };
  reverted_at?: string;
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

  revertPayment: async (
    entryId: string,
    data?: {
      reason?: string;
      actor_id?: string;
      actor_name?: string;
    },
  ): Promise<ApiResult<RevertPaymentResult>> => {
    const [result, patients] = await Promise.all([
      api.post<RawRevertPaymentResponse>(`/financial/entries/${entryId}/revert`, data ?? {}),
      resolvePatientsIndex(),
    ]);

    if (!result.success) return result;

    const response = result.data;
    const rawEntry = "entry" in response ? response.entry : response;
    const affectedSessions = "entry" in response ? (response.affected_sessions ?? []) : [];
    const revertedAt = "entry" in response ? response.reverted_at : undefined;
    const audit = "entry" in response ? response.audit : undefined;

    return {
      ...result,
      data: {
        entry: mapEntry(rawEntry, patients),
        affected_sessions: affectedSessions,
        reverted_at: revertedAt,
        audit,
      },
    };
  },
};
