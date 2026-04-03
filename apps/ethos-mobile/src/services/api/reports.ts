import { clinicalApiClient } from "./clinicalClient";

export const createReport = (payload: {
  patient_id: string;
  purpose: string;
  content: string;
}) =>
  clinicalApiClient.request<{ id: string; patient_id: string; purpose: string; content?: string }>("/reports", {
    method: "POST",
    body: payload,
  });
