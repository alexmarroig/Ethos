import { clinicalApiClient } from './clinicalClient';
import type {
  ClinicalNoteRecord,
  JobRecord,
  PaginatedResponse,
  SessionRecord,
} from './types';
import { unwrapPaginatedResponse } from './types';

// 🔹 Fetch all sessions (paginated → normalized)
export const fetchSessions = async (params?: { from?: string; to?: string }) => {
  let path = '/sessions';
  if (params?.from || params?.to) {
    const qs = new URLSearchParams();
    if (params.from) qs.append('from', params.from);
    if (params.to) qs.append('to', params.to);
    path = `/sessions?${qs.toString()}`;
  }

  const response = await clinicalApiClient.request<PaginatedResponse<SessionRecord>>(
    path,
    {
      method: 'GET',
    }
  );

  return unwrapPaginatedResponse(response);
};

// 🔹 Fetch single session
export const fetchSession = (sessionId: string) =>
  clinicalApiClient.request<SessionRecord>(`/sessions/${sessionId}`, {
    method: 'GET',
  });

// 🔹 Create session
export const createSession = (payload: {
  patientId: string;
  scheduledAt: string;
  durationMinutes?: number;
}) =>
  clinicalApiClient.request<SessionRecord>('/sessions', {
    method: 'POST',
    body: {
      patient_id: payload.patientId,
      scheduled_at: payload.scheduledAt,
      duration_minutes: payload.durationMinutes ?? undefined,
    },
  });

// 🔹 Start transcription job
export const startTranscriptionJob = (sessionId: string, rawText?: string) =>
  clinicalApiClient.request<{ job_id: string; status: JobRecord['status'] }>(
    `/sessions/${sessionId}/transcribe`,
    {
      method: 'POST',
      body: rawText ? { raw_text: rawText } : undefined,
    }
  );

// 🔹 Fetch job status
export const fetchJob = (jobId: string) =>
  clinicalApiClient.request<JobRecord>(`/jobs/${jobId}`, {
    method: 'GET',
  });

// 🔹 Save clinical note
export const saveClinicalNote = (sessionId: string, content: string) =>
  clinicalApiClient.request<ClinicalNoteRecord>(
    `/sessions/${sessionId}/clinical-note`,
    {
      method: 'POST',
      body: { content },
    }
  );

// 🔹 Update session status
export const updateSessionStatus = (
  sessionId: string,
  status: SessionRecord['status']
) =>
  clinicalApiClient.request<SessionRecord>(
    `/sessions/${sessionId}/status`,
    {
      method: 'PATCH',
      body: { status },
    }
  );