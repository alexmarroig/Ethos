// ethos-mobile/src/services/api/sessions.ts
import { createHttpClient } from './httpClient';
import type { Session, Patient } from '@ethos/shared';

const API_BASE_URL = 'http://localhost:8787';

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

let currentToken: string | null = null;
export const setSessionToken = (token: string | null) => {
    currentToken = token;
};

const apiClient = createHttpClient({
    name: 'MobileClinicalAPI',
    baseUrl: API_BASE_URL,
    contract: sessionContract as any, // Bypass strict string literal checking for dynamic {id} paths for now
    getAuthToken: () => currentToken,
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
