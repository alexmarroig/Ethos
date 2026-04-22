import { documentsApi } from "@/api/clinical";
import { api, type ApiResult } from "./apiClient";

export interface SendReceiptPayload {
  financial_entry_id: string;
  patient_id: string;
  session_id?: string;
  send_email: boolean;
  to_email?: string;
  subject: string;
  message?: string;
}

export interface ReceiptDeliveryResult {
  sent: boolean;
  sent_at?: string;
  channel?: "email" | "manual";
}

export const receiptDeliveryService = {
  sendReceipt: async (payload: SendReceiptPayload): Promise<ApiResult<ReceiptDeliveryResult>> => {
    return api.post<ReceiptDeliveryResult>(`/financial/entries/${payload.financial_entry_id}/receipt/send`, payload);
  },

  registerReceiptDocument: async (payload: {
    patient_id: string;
    financial_entry_id: string;
    session_id?: string;
    title: string;
    amount: number;
    paid_at?: string;
    sent_at?: string;
    destination_email?: string;
  }) => {
    const created = await documentsApi.create({
      patient_id: payload.patient_id,
      template_id: "payment-receipt",
      title: payload.title,
      status: "final",
    });

    if (!created.success) return created;

    await documentsApi.createVersion(
      created.data.id,
      `Recibo enviado em ${payload.sent_at ?? new Date().toISOString()}.`,
      {
        amount: String(payload.amount),
        attendance_date: payload.paid_at ? payload.paid_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        date_label: new Date().toLocaleDateString("pt-BR"),
        payment_method: "Não informado",
        service_type: "session",
        notes: payload.destination_email ? `Enviado para ${payload.destination_email}` : "Recibo enviado manualmente",
      },
    );

    return created;
  },
};
