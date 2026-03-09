import { api, type ApiResult } from "./apiClient";

export interface TranscriptionJob {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  transcription?: string;
  error?: string;
}

export const audioService = {
  upload: (sessionId: string, audioBlob: Blob): Promise<ApiResult<{ audio_id: string }>> => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "session-audio.webm");

    return api.post<{ audio_id: string }>(`/sessions/${sessionId}/audio`, formData);
  },

  transcribe: (sessionId: string): Promise<ApiResult<{ job_id: string }>> =>
    api.post<{ job_id: string }>(`/sessions/${sessionId}/transcribe`),

  getJob: (jobId: string): Promise<ApiResult<TranscriptionJob>> =>
    api.get<TranscriptionJob>(`/jobs/${jobId}`),
};
