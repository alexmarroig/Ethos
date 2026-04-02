import { clinicalApiClient } from "./clinicalClient";
import type { FinanceSummary } from "./types";

export const fetchFinanceSummary = () => clinicalApiClient.request<FinanceSummary>("/finance", { method: "GET" });
