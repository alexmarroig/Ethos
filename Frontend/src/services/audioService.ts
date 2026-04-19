import { api, type ApiResult } from "./apiClient";

export interface TranscriptionJob {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  transcription?: string;
  error?: string;
}

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

export const audioService = {
  upload: async (sessionId: string, audioBlob: Blob): Promise<ApiResult<{ audio_id: string }>> => {
    const base64 = arrayBufferToBase64(await audioBlob.arrayBuffer());
    return api.post<{ audio_id: string }>(`/sessions/${sessionId}/audio`, {
      consent_confirmed: true,
      audio_base64: base64,
      file_name: "session-audio.webm",
      mime_type: audioBlob.type || "audio/webm",
    });
  },

  transcribe: (sessionId: string): Promise<ApiResult<{ job_id: string }>> =>
    api.post<{ job_id: string }>(`/sessions/${sessionId}/transcribe`, {}),

  getJob: (jobId: string): Promise<ApiResult<TranscriptionJob>> =>
    api.get<TranscriptionJob>(`/jobs/${jobId}`),
};
