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
    '/jobs/{id}': ['get'],
    '/clinical-notes': ['post'],
} as const;

const apiClient = createHttpClient({
    name: 'MobileClinicalAPI',
    baseUrl: API_BASE_URL,
    contract: sessionContract,
    offline: {
        enabled: true,
        cacheNamespace: 'ethos_mobile_clinical_cache',
    },
});

export const fetchSessions = async (): Promise<Session[]> => {
    return apiClient.request<Session[]>('/sessions', { method: 'GET' });
};

export const fetchPatients = async (): Promise<Patient[]> => {
    return apiClient.request<Patient[]>('/patients', { method: 'GET' });
};

export const createSession = async (patientId: string, scheduledAt: string): Promise<Session> => {
    return apiClient.request<Session>('/sessions', {
        method: 'POST',
        body: { patient_id: patientId, scheduled_at: scheduledAt }
    });
};

export const startTranscriptionJob = async (sessionId: string, rawText?: string): Promise<{ job_id: string }> => {
    return apiClient.request<{ job_id: string }>(`/sessions/${sessionId}/transcribe`, {
        method: 'POST',
        body: { raw_text: rawText }
    });
};

export const saveClinicalNote = async (sessionId: string, text: string): Promise<any> => {
    return apiClient.request<any>(`/sessions/${sessionId}/clinical-note`, {
        method: 'POST',
        body: { text }
    });
};

export const updateSessionStatus = async (sessionId: string, status: Session['status']) => {
    return apiClient.request<any>(`/sessions/${sessionId}/status`, {
        method: 'PATCH',
        body: { status }
    });
};

export const pollJob = async (jobId: string): Promise<{ status: string; document?: any; transcript?: string }> => {
    const res = await apiClient.request<{ status: string; document?: any; transcript?: string }>(`/jobs/${encodeURIComponent(jobId)}` as any, {
        method: 'GET',
    });
    return res;
};

export const postAudioToSession = async (sessionId: string, fileUri: string): Promise<void> => {
    await apiClient.request(`/sessions/${sessionId}/audio` as any, {
        method: 'POST',
        body: { file_path: fileUri },
    });
};

export const triggerTranscription = async (sessionId: string): Promise<string> => {
    const res = await apiClient.request<{ job_id: string }>(`/sessions/${sessionId}/transcribe` as any, {
        method: 'POST',
    });
    return (res as any)?.job_id ?? '';
};
