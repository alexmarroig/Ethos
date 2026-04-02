import { clinicalApiClient } from "./clinicalClient";
import type { PatientDetailResponse, PatientRecord } from "./types";

export const fetchPatients = () => clinicalApiClient.request<PatientRecord[]>("/patients", { method: "GET" });

export const fetchPatientDetail = (patientId: string) =>
  clinicalApiClient.request<PatientDetailResponse>(`/patients/${patientId}`, { method: "GET" });

export const createPatient = (payload: { name: string; email?: string; phone?: string; notes?: string }) =>
  clinicalApiClient.request<PatientRecord>("/patients", {
    method: "POST",
    body: payload,
  });
