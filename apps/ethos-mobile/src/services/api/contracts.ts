import { clinicalApiClient } from "./clinicalClient";

export const createContract = (payload: {
  patient_id: string;
  psychologist: { name: string; license: string; email: string; phone?: string };
  patient: { name: string; email: string; document: string };
  terms: { value: string; periodicity: string; absence_policy: string; payment_method: string };
}) =>
  clinicalApiClient.request<{ id: string; patient_id: string; status: string }>("/contracts", {
    method: "POST",
    body: payload,
  });

export const sendContract = (contractId: string) =>
  clinicalApiClient.request<{ portal_url?: string }>(`/contracts/${contractId}/send`, {
    method: "POST",
  });
