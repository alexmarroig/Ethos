import { clinicalApiClient } from "./clinicalClient";
import type { ClinicalNoteRecord, ClinicalNoteStructuredData } from "./types";

const buildNotesQuery = (filters: { patientId?: string; sessionId?: string }) => {
  const params = new URLSearchParams();
  if (filters.patientId) params.set("patient_id", filters.patientId);
  if (filters.sessionId) params.set("session_id", filters.sessionId);
  const query = params.toString();
  return query ? `/clinical-notes?${query}` : "/clinical-notes";
};

export const fetchClinicalNote = (noteId: string) =>
  clinicalApiClient.request<ClinicalNoteRecord>(`/clinical-notes/${noteId}`, { method: "GET" });

export const fetchClinicalNotes = (filters: { patientId?: string; sessionId?: string } = {}) =>
  clinicalApiClient.request<ClinicalNoteRecord[]>(buildNotesQuery(filters), { method: "GET" });

export const createClinicalNote = (payload: { sessionId: string; content?: string; structuredData?: ClinicalNoteStructuredData }) =>
  clinicalApiClient.request<ClinicalNoteRecord>("/clinical-notes", {
    method: "POST",
    body: {
      session_id: payload.sessionId,
      content: payload.content,
      structuredData: payload.structuredData,
    },
  });

export const updateClinicalNote = (noteId: string, payload: { content?: string; structuredData?: ClinicalNoteStructuredData }) =>
  clinicalApiClient.request<ClinicalNoteRecord>(`/clinical-notes/${noteId}`, {
    method: "PUT",
    body: {
      content: payload.content,
      structuredData: payload.structuredData,
    },
  });
