import { clinicalApiClient } from "./clinicalClient";
import type { FinanceSummary, FinancialEntryRecord, PaginatedResponse } from "./types";
import { unwrapPaginatedResponse } from "./types";

export const fetchFinanceSummary = () => clinicalApiClient.request<FinanceSummary>("/finance", { method: "GET" });

export const fetchFinancialEntries = async () => {
  const response = await clinicalApiClient.request<PaginatedResponse<FinancialEntryRecord> | FinancialEntryRecord[]>(
    "/finance/entries",
    { method: "GET" }
  );

  return Array.isArray(response) ? response : unwrapPaginatedResponse(response);
};
