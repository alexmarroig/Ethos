import { clinicalApiClient } from "./clinicalClient";
import type { PatientDetailResponse, PatientRecord } from "./types";

export const fetchPatients = () => clinicalApiClient.request<PatientRecord[]>("/patients", { method: "GET" });

export const fetchPatientDetail = (patientId: string) =>
  clinicalApiClient.request<PatientDetailResponse>(`/patients/${patientId}`, { method: "GET" });

export const createPatient = (payload: {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
}) =>
  clinicalApiClient.request<PatientRecord>("/patients", {
    method: "POST",
    body: payload,
  });

export const updatePatient = (
  patientId: string,
  payload: Partial<{
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    birth_date?: string;
    address?: string;
    cpf?: string;
    main_complaint?: string;
    psychiatric_medications?: string;
    has_psychiatric_followup?: boolean;
    psychiatrist_name?: string;
    psychiatrist_contact?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    billing?: {
      mode: "per_session" | "package";
      weekly_frequency?: 1 | 2 | 3 | 4 | 5;
      session_price?: number;
      package_total_price?: number;
      package_session_count?: number;
    };
    notes?: string;
  }>,
) =>
  clinicalApiClient.request<PatientRecord>(`/patients/${patientId}`, {
    method: "PATCH",
    body: payload,
  });
