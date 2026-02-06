import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { audioService } from "../services/audioService";

declare global {
  interface Window {
    ethos?: {
      saveAudio: (payload: { data: ArrayBuffer; mimeType: string }) => Promise<{ filePath: string } | null>;
    };
  }
}

type RecorderStatus = "idle" | "recording" | "saving" | "error";

type UseAudioRecorderParams = {
  sessionId: string;
};

type UseAudioRecorderReturn = {
  status: RecorderStatus;
  elapsedSeconds: number;
  audioUrl: string | null;
  audioFilePath: string | null;
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
};

const formatElapsed = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
};

export const useAudioRecorder = ({ sessionId }: UseAudioRecorderParams): UseAudioRecorderReturn & { elapsedLabel: string } => {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFilePath, setAudioFilePath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const elapsedLabel = useMemo(() => formatElapsed(elapsedSeconds), [elapsedSeconds]);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetRecording = useCallback(() => {
    clearTimer();
    setElapsedSeconds(0);
    setAudioUrl(null);
    setAudioFilePath(null);
    setStatus("idle");
    setErrorMessage(null);
    chunksRef.current = [];
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (status === "recording" || status === "saving") {
      return;
    }

    setErrorMessage(null);
    setAudioUrl(null);
    setAudioFilePath(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearTimer();
        stopStream();
        setStatus("saving");

        try {
          const mimeType = recorder.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const buffer = await blob.arrayBuffer();
          const response = await window.ethos?.saveAudio({ data: buffer, mimeType });

          if (response?.filePath) {
            const audioAsset = audioService.attach(sessionId, response.filePath);
            setAudioFilePath(audioAsset.filePath);
          }

          setAudioUrl(URL.createObjectURL(blob));
          setStatus("idle");
        } catch (error) {
          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar o áudio.");
        }
      };

      recorder.start();
      setStatus("recording");
      setElapsedSeconds(0);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Permissão de microfone negada.");
      stopStream();
    }
  }, [sessionId, status, stopStream]);

  useEffect(() => () => {
    clearTimer();
    stopStream();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl, stopStream]);

  return {
    status,
    elapsedSeconds,
    elapsedLabel,
    audioUrl,
    audioFilePath,
    errorMessage,
    startRecording,
    stopRecording,
    resetRecording,
  };
};
