<<<<<<< HEAD:apps/ethos-mobile/src/services/api/sessions.ts
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
=======
// ethos-mobile/src/services/api/sessions.ts
import { createHttpClient } from './httpClient';
import type { Session, Patient } from '../../types/shared';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

const sessionContract = {
    '/sessions': ['get', 'post'],
    '/sessions/{id}': ['get'],
    '/sessions/{id}/status': ['patch'],
    '/sessions/{id}/audio': ['post'],
    '/sessions/{id}/transcribe': ['post'],
    '/sessions/{id}/clinical-note': ['post'],
    '/clinical-notes/{id}/validate': ['post'],
    '/patients': ['get'], // Assuming patients are at this endpoint from openapi
} as const;

const apiClient = createHttpClient({
    name: 'MobileClinicalAPI',
    baseUrl: API_BASE_URL,
    contract: sessionContract,
    offline: {
        enabled: true,
        cacheNamespace: 'ethos_mobile_clinical_cache',
>>>>>>> 97f19340c110e556bf5c1ebe71a5b625f605e9e4:apps/ethos-mobile/src/shared/services/api/sessions.ts
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
