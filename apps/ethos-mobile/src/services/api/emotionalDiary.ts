import { clinicalApiClient } from "./clinicalClient";
import type { EmotionalDiaryEntryRecord, PaginatedResponse } from "./types";
import { unwrapPaginatedResponse } from "./types";

export type EmotionalDiaryEntryPayload = {
  date?: string;
  mood: 1 | 2 | 3 | 4 | 5;
  intensity: number;
  description?: string;
  thoughts?: string;
  tags?: string[];
};

export const fetchPatientDiaryEntries = async () => {
  const response = await clinicalApiClient.request<PaginatedResponse<EmotionalDiaryEntryRecord>>("/patient/diary", {
    method: "GET",
  });
  return unwrapPaginatedResponse(response);
};

export const createPatientDiaryEntry = (payload: EmotionalDiaryEntryPayload) =>
  clinicalApiClient.request<EmotionalDiaryEntryRecord>("/patient/diary", {
    method: "POST",
    body: payload,
  });

export const fetchPsychologistPatientDiaryEntries = async (patientId: string) => {
  const response = await clinicalApiClient.request<PaginatedResponse<EmotionalDiaryEntryRecord>>(
    `/psychologist/patient/${patientId}/diary`,
    { method: "GET" },
  );
  return unwrapPaginatedResponse(response);
};
