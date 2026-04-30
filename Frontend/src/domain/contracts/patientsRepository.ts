import type { ApiResult } from "@/services/apiClient";
import type { CreatePatientInput, Patient, PatientDetail, UpdatePatientInput } from "@/services/patientService";

export interface GrantPatientAccessInput {
  patient_id: string;
  patient_email: string;
  patient_name: string;
  patient_password?: string;
  reset_password?: boolean;
}

export interface PatientAccessResult {
  credentials: string;
  patient_user: {
    id: string;
    email: string;
    name: string;
  };
  access_id: string;
  email_delivery?: {
    status: "sent" | "skipped" | "failed";
    detail?: string;
  };
}

export interface PatientsRepository {
  list(): Promise<ApiResult<Patient[]>>;
  getById(id: string): Promise<ApiResult<PatientDetail>>;
  create(data: CreatePatientInput): Promise<ApiResult<Patient>>;
  update(id: string, data: UpdatePatientInput): Promise<ApiResult<Patient>>;
  grantAccess(input: GrantPatientAccessInput): Promise<ApiResult<PatientAccessResult>>;
}
