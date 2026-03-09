import { api, ApiResult } from "./apiClient";

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  last_session?: string;
  total_sessions?: number;
  created_at?: string;
}

export const patientService = {
  list: (): Promise<ApiResult<Patient[]>> =>
    api.get<Patient[]>("/patients"),

  getById: (id: string): Promise<ApiResult<Patient>> =>
    api.get<Patient>(`/patients/${id}`),

  create: (data: Partial<Patient>): Promise<ApiResult<Patient>> =>
    api.post<Patient>("/patients", data),

  grantAccess: (patientId: string): Promise<ApiResult<{ credentials: string }>> =>
    api.post<{ credentials: string }>("/patients/access", { patient_id: patientId }),
};
