import { clinicalApiClient } from "./clinicalClient";
import type {
  ClinicalDocumentRecord,
  DocumentDetailResponse,
  PaginatedResponse,
  SessionRecord,
} from "./types";
import { unwrapPaginatedResponse } from "./types";

export const fetchPatientSessions = async () => {
  const response = await clinicalApiClient.request<PaginatedResponse<SessionRecord>>("/patient/sessions", { method: "GET" });
  return unwrapPaginatedResponse(response);
};

export const fetchPatientDocuments = async () => {
  const response = await clinicalApiClient.request<PaginatedResponse<ClinicalDocumentRecord>>("/patient/documents", { method: "GET" });
  return unwrapPaginatedResponse(response);
};

export const fetchPatientDocumentDetail = (documentId: string) =>
  clinicalApiClient.request<DocumentDetailResponse>(`/patient/documents/${documentId}`, { method: "GET" });

export const confirmPatientSessionPresence = (sessionId: string) =>
  clinicalApiClient.request<SessionRecord>(`/patient/sessions/${sessionId}/confirm`, { method: "POST" });
