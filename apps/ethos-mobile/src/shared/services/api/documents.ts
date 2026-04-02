import { clinicalApiClient } from "./clinicalClient";
import type { ClinicalDocumentRecord, DocumentDetailResponse, PaginatedResponse } from "./types";
import { unwrapPaginatedResponse } from "./types";

export const fetchDocuments = async () => {
  const response = await clinicalApiClient.request<PaginatedResponse<ClinicalDocumentRecord>>("/documents", { method: "GET" });
  return unwrapPaginatedResponse(response);
};

export const fetchDocumentDetail = (documentId: string) =>
  clinicalApiClient.request<DocumentDetailResponse>(`/documents/${documentId}`, { method: "GET" });
