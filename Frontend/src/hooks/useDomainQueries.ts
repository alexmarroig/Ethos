import {
  keepPreviousData,
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { financeService, type FinancialEntry, type FinancialSummary } from "@/services/financeService";
import type { Patient } from "@/services/patientService";
import { patientsDomainService } from "@/domain/services/patientsDomainService";
import type { Session, SessionFilters } from "@/services/sessionService";
import { sessionsDomainService } from "@/domain/services/sessionsDomainService";
import type { ApiResult } from "@/services/apiClient";

const MINUTE = 60_000;

type DataDomain = "sessions" | "patients" | "finance";

type QueryFailure = {
  code?: string;
  status?: number;
  message: string;
  domain: DataDomain;
};

const domainCachePolicy = {
  sessions: {
    staleTime: 30 * 1000,
    gcTime: 10 * MINUTE,
  },
  patients: {
    staleTime: 10 * MINUTE,
    gcTime: 60 * MINUTE,
  },
  finance: {
    staleTime: 2 * MINUTE,
    gcTime: 20 * MINUTE,
  },
} as const;

export const domainQueryKeys = {
  sessions: (filters?: SessionFilters) => ["sessions", filters ?? {}] as const,
  patients: () => ["patients"] as const,
  financialEntries: (filters?: { patient_id?: string; status?: string }) =>
    ["financialEntries", filters ?? {}] as const,
  financialSummary: () => ["financialSummary"] as const,
};

function unwrapResult<T>(result: ApiResult<T>, domain: DataDomain): T {
  if (result.success) return result.data;

  throw {
    code: result.error.code,
    status: result.status,
    message: result.error.message,
    domain,
  } satisfies QueryFailure;
}

export function shouldRetryByError(error: unknown, attempt: number) {
  if (attempt >= 2) return false;

  const queryError = error as Partial<QueryFailure> | undefined;
  if (!queryError?.code) return attempt < 1;

  if (queryError.code === "UNAUTHORIZED") return false;
  if (queryError.status && queryError.status >= 400 && queryError.status < 500) return false;

  return queryError.code === "NETWORK_ERROR" || queryError.code === "TIMEOUT";
}

export function retryDelayByError(attempt: number, error: unknown) {
  const queryError = error as Partial<QueryFailure> | undefined;
  const baseDelay = queryError?.code === "TIMEOUT" ? 800 : 600;
  return Math.min(baseDelay * (2 ** attempt), 4_000);
}

export function useSessions(filters?: SessionFilters) {
  return useQuery({
    queryKey: domainQueryKeys.sessions(filters),
    queryFn: async () => unwrapResult(await sessionsDomainService.list(filters), "sessions"),
    staleTime: domainCachePolicy.sessions.staleTime,
    gcTime: domainCachePolicy.sessions.gcTime,
    placeholderData: keepPreviousData,
  });
}

export function usePatients() {
  return useQuery({
    queryKey: domainQueryKeys.patients(),
    queryFn: async (): Promise<Patient[]> => unwrapResult(await patientsDomainService.list(), "patients"),
    staleTime: domainCachePolicy.patients.staleTime,
    gcTime: domainCachePolicy.patients.gcTime,
    placeholderData: keepPreviousData,
  });
}

export function useFinancialEntries(filters?: { patient_id?: string; status?: string }) {
  return useQuery({
    queryKey: domainQueryKeys.financialEntries(filters),
    queryFn: async (): Promise<FinancialEntry[]> =>
      unwrapResult(await financeService.listEntries(filters), "finance"),
    staleTime: domainCachePolicy.finance.staleTime,
    gcTime: domainCachePolicy.finance.gcTime,
    placeholderData: keepPreviousData,
  });
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: domainQueryKeys.financialSummary(),
    queryFn: async (): Promise<FinancialSummary> =>
      unwrapResult(await financeService.getFinancialSummary(), "finance"),
    staleTime: domainCachePolicy.finance.staleTime,
    gcTime: domainCachePolicy.finance.gcTime,
  });
}

export async function prefetchHomeQueries(queryClient: QueryClient) {
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: domainQueryKeys.patients(),
      queryFn: async () => unwrapResult(await patientsDomainService.list(), "patients"),
      staleTime: domainCachePolicy.patients.staleTime,
      gcTime: domainCachePolicy.patients.gcTime,
    }),
    queryClient.prefetchQuery({
      queryKey: domainQueryKeys.financialSummary(),
      queryFn: async () => unwrapResult(await financeService.getFinancialSummary(), "finance"),
      staleTime: domainCachePolicy.finance.staleTime,
      gcTime: domainCachePolicy.finance.gcTime,
    }),
  ]);
}

export function usePrefetchHomeQueries() {
  const queryClient = useQueryClient();

  return () => prefetchHomeQueries(queryClient);
}
