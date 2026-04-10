import { api, ApiResult } from "./apiClient";

type ReportAiPayload = {
  psychologist_name: string;
  crp?: string;
  patient_name?: string;
  date_label?: string;
  attendance_type?: string;
  text: string;
};

export const aiService = {
  improveManualReport: (payload: ReportAiPayload): Promise<ApiResult<{ organized_text: string }>> =>
    api.post<{ organized_text: string }>("/ai/organize", {
      kind: "report_manual",
      ...payload,
    }),

  improveTranscriptReport: (payload: ReportAiPayload): Promise<ApiResult<{ organized_text: string }>> =>
    api.post<{ organized_text: string }>("/ai/organize", {
      kind: "report_transcript",
      ...payload,
    }),
};
