import { clinicalApiClient } from "./clinicalClient";
import type { ClinicalNoteRecord, JobRecord, PaginatedResponse, SessionRecord } from "./types";
import { unwrapPaginatedResponse } from "./types";

export const fetchSessions = async () => {
  const response = await clinicalApiClient.request<PaginatedResponse<SessionRecord>>("/sessions", { method: "GET" });
  return unwrapPaginatedResponse(response);
};

export const fetchSession = (sessionId: string) =>
  clinicalApiClient.request<SessionRecord>(`/sessions/${sessionId}`, { method: "GET" });

export const createSession = (payload: { patientId: string; scheduledAt: string; durationMinutes?: number }) =>
  clinicalApiClient.request<SessionRecord>("/sessions", {
    method: "POST",
    body: {
      patient_id: payload.patientId,
      scheduled_at: payload.scheduledAt,
      duration_minutes: payload.durationMinutes,
    },
  });

export const startTranscriptionJob = (sessionId: string, rawText?: string) =>
  clinicalApiClient.request<{ job_id: string; status: JobRecord["status"] }>(`/sessions/${sessionId}/transcribe`, {
    method: "POST",
    body: { raw_text: rawText },
  });

export const fetchJob = (jobId: string) =>
  clinicalApiClient.request<JobRecord>(`/jobs/${jobId}`, { method: "GET" });

export const saveClinicalNote = (sessionId: string, content: string) =>
  clinicalApiClient.request<ClinicalNoteRecord>(`/sessions/${sessionId}/clinical-note`, {
    method: "POST",
    body: { content },
  });

export const updateSessionStatus = (sessionId: string, status: SessionRecord["status"]) =>
  clinicalApiClient.request<SessionRecord>(`/sessions/${sessionId}/status`, {
    method: "PATCH",
    body: { status },
  });
