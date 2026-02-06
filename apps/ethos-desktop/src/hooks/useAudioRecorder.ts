import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audioService } from "../services/audioService";

declare global {
  interface Window {
    ethos?: {
      // compat antigo
      saveAudio?: (payload: { data: ArrayBuffer; mimeType: string }) => Promise<{ filePath: string } | null>;
      // compat novo (recomendado)
      audio?: {
        save?: (payload: { data: ArrayBuffer; mimeType: string }) => Promise<{ filePath: string; mimeType?: string } | null>;
      };
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
  elapsedLabel: string;
  audioUrl: string | null;
  audioFilePath: string | null;
  mimeType: string | null;
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

function pickBestMimeType(): string {
  // Ordem: mais comum/boa para áudio no Electron/Chromium.
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return ""; // deixa o browser escolher
}

async function saveAudioBridge(payload: { data: ArrayBuffer; mimeType: string }) {
  const ethos = window.ethos;

  const fn =
    ethos?.audio?.save ??
    ethos?.saveAudio;

  if (!fn) {
    throw new Error("Bridge do Electron não disponível: window.ethos.audio.save / window.ethos.saveAudio.");
  }

  return fn(payload);
}

export const useAudioRecorder = ({ sessionId }: UseAudioRecorderParams): UseAudioRecorderReturn => {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const mountedRef = useRef(true);
  const lastUrlRef = useRef<string | null>(null);
  const stoppingRef = useRef(false);

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFilePath, setAudioFilePath] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const elapsedLabel = useMemo(() => formatElapsed(elapsedSeconds), [elapsedSeconds]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const revokeLastUrl = useCallback(() => {
    if (lastUrlRef.current) {
      URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    if (recorder.state === "inactive") return;
    if (stoppingRef.current) return;

    stoppingRef.current = true;
    try {
      recorder.stop();
    } catch {
      // ignore
    }
  }, []);

  const resetRecording = useCallback(() => {
    // Se estiver gravando, para antes de limpar estado
    stopRecording();
    clearTimer();
    stopStream();

    chunksRef.current = [];
    stoppingRef.current = false;

    revokeLastUrl();
    setAudioUrl(null);
    setAudioFilePath(null);
    setMimeType(null);
    setElapsedSeconds(0);
    setErrorMessage(null);
    setStatus("idle");
  }, [clearTimer, revokeLastUrl, stopRecording, stopStream]);

  const startRecording = useCallback(async () => {
    if (status === "recording" || status === "saving") return;

    setErrorMessage(null);
    setAudioFilePath(null);
    setMimeType(null);
    chunksRef.current = [];
    stoppingRef.current = false;

    // revoga preview anterior pra não vazar memória
    revokeLastUrl();
    setAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const chosenMime = pickBestMimeType();

      const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        if (!mountedRef.current) return;
        setStatus("error");
        setErrorMessage("Falha no MediaRecorder.");
        clearTimer();
        stopStream();
      };

      recorder.onstop = async () => {
        clearTimer();
        stopStream();

        // onstop pode disparar depois do unmount
        if (!mountedRef.current) return;

        setStatus("saving");

        try {
          const mt = recorder.mimeType || chosenMime || "audio/webm";
          setMimeType(mt);

          const blob = new Blob(chunksRef.current, { type: mt });
          const buffer = await blob.arrayBuffer();

          const response = await saveAudioBridge({ data: buffer, mimeType: mt });

          if (!mountedRef.current) return;

          if (response?.filePath) {
            try {
              const audioAsset = audioService.attach(sessionId, response.filePath);
              setAudioFilePath(audioAsset.filePath);
            } catch {
              // não deixa o attach derrubar a gravação
              setAudioFilePath(response.filePath);
            }
          }

          const url = URL.createObjectURL(blob);
          lastUrlRef.current = url;
          setAudioUrl(url);

          setStatus("idle");
        } catch (error) {
          if (!mountedRef.current) return;
          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar o áudio.");
        } finally {
          stoppingRef.current = false;
        }
      };

      // timeslice: gera chunks periodicamente (melhor para gravações longas)
      recorder.start(1000);

      setStatus("recording");
      setElapsedSeconds(0);

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      if (!mountedRef.current) return;
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Permissão de microfone negada.");
      clearTimer();
      stopStream();
    }
  }, [clearTimer, revokeLastUrl, sessionId, status, stopStream]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
      stopStream();
      revokeLastUrl();
      // Garantir que o recorder pare se o componente desmontar
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      } catch {
        // ignore
      }
    };
  }, [clearTimer, revokeLastUrl, stopStream]);

  return {
    status,
    elapsedSeconds,
    elapsedLabel,
    audioUrl,
    audioFilePath,
    mimeType,
    errorMessage,
    startRecording,
    stopRecording,
    resetRecording,
  };
};
