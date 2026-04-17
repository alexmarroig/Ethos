"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAudioRecorder = void 0;
// apps/ethos-desktop/src/hooks/useAudioRecorder.ts
const react_1 = require("react");
const audioService_1 = require("../services/audioService");
const formatElapsed = (seconds) => {
    const minutes = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
    const remaining = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remaining}`;
};
function pickBestMimeType() {
    // Ordem: mais comum/boa para áudio no Electron/Chromium.
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
    for (const c of candidates) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c))
            return c;
    }
    return ""; // deixa o browser escolher
}
function getBridgeSaver() {
    const ethos = window.ethos;
    const fn = ethos?.audio?.save ?? ethos?.saveAudio;
    if (!fn) {
        throw new Error("Bridge do Electron não disponível: window.ethos.audio.save / window.ethos.saveAudio.");
    }
    // Normaliza o retorno (legado não tem mimeType)
    return async (payload) => {
        const res = await fn(payload);
        if (!res)
            return null;
        return res;
    };
}
const useAudioRecorder = ({ sessionId }) => {
    const recorderRef = (0, react_1.useRef)(null);
    const chunksRef = (0, react_1.useRef)([]);
    const streamRef = (0, react_1.useRef)(null);
    const timerRef = (0, react_1.useRef)(null);
    const mountedRef = (0, react_1.useRef)(true);
    const lastUrlRef = (0, react_1.useRef)(null);
    // Evita corrida de stop/save/reset
    const stoppingRef = (0, react_1.useRef)(false);
    const savingRef = (0, react_1.useRef)(false);
    const [status, setStatus] = (0, react_1.useState)("idle");
    const [elapsedSeconds, setElapsedSeconds] = (0, react_1.useState)(0);
    const [audioUrl, setAudioUrl] = (0, react_1.useState)(null);
    const [audioFilePath, setAudioFilePath] = (0, react_1.useState)(null);
    const [mimeType, setMimeType] = (0, react_1.useState)(null);
    const [errorMessage, setErrorMessage] = (0, react_1.useState)(null);
    const elapsedLabel = (0, react_1.useMemo)(() => formatElapsed(elapsedSeconds), [elapsedSeconds]);
    const clearTimer = (0, react_1.useCallback)(() => {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);
    const revokeLastUrl = (0, react_1.useCallback)(() => {
        if (lastUrlRef.current) {
            URL.revokeObjectURL(lastUrlRef.current);
            lastUrlRef.current = null;
        }
    }, []);
    const stopStream = (0, react_1.useCallback)(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);
    const hardStopRecorder = (0, react_1.useCallback)(() => {
        // tenta parar sem explodir
        const recorder = recorderRef.current;
        if (!recorder)
            return;
        try {
            if (recorder.state !== "inactive")
                recorder.stop();
        }
        catch {
            // ignore
        }
    }, []);
    const stopRecording = (0, react_1.useCallback)(() => {
        const recorder = recorderRef.current;
        if (!recorder)
            return;
        if (recorder.state === "inactive")
            return;
        if (stoppingRef.current)
            return;
        stoppingRef.current = true;
        try {
            recorder.stop();
        }
        catch {
            // ignore
        }
    }, []);
    const resetRecording = (0, react_1.useCallback)(() => {
        // Se estiver gravando, para antes de limpar estado
        stopRecording();
        hardStopRecorder();
        clearTimer();
        stopStream();
        chunksRef.current = [];
        stoppingRef.current = false;
        savingRef.current = false;
        revokeLastUrl();
        setAudioUrl(null);
        setAudioFilePath(null);
        setMimeType(null);
        setElapsedSeconds(0);
        setErrorMessage(null);
        setStatus("idle");
    }, [clearTimer, hardStopRecorder, revokeLastUrl, stopRecording, stopStream]);
    const startRecording = (0, react_1.useCallback)(async () => {
        if (status === "recording" || status === "saving")
            return;
        setErrorMessage(null);
        setAudioFilePath(null);
        setMimeType(null);
        chunksRef.current = [];
        stoppingRef.current = false;
        savingRef.current = false;
        // revoga preview anterior pra não vazar memória
        revokeLastUrl();
        setAudioUrl(null);
        try {
            if (!navigator?.mediaDevices?.getUserMedia) {
                throw new Error("Captura de áudio não suportada neste ambiente.");
            }
            if (typeof MediaRecorder === "undefined") {
                throw new Error("MediaRecorder não suportado neste ambiente.");
            }
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
                if (!mountedRef.current)
                    return;
                setStatus("error");
                setErrorMessage("Falha no gravador de áudio.");
                clearTimer();
                stopStream();
                stoppingRef.current = false;
                savingRef.current = false;
            };
            recorder.onstop = async () => {
                clearTimer();
                stopStream();
                // onstop pode disparar depois do unmount/reset
                if (!mountedRef.current)
                    return;
                // Evita salvar duas vezes se houver corrida estranha
                if (savingRef.current)
                    return;
                savingRef.current = true;
                setStatus("saving");
                try {
                    const mt = recorder.mimeType || chosenMime || "audio/webm";
                    setMimeType(mt);
                    const blob = new Blob(chunksRef.current, { type: mt });
                    const buffer = await blob.arrayBuffer();
                    const save = getBridgeSaver();
                    const response = await save({ data: buffer, mimeType: mt });
                    if (!mountedRef.current)
                        return;
                    if (response?.filePath) {
                        // attach pode falhar; não derruba a gravação
                        try {
                            const audioAsset = audioService_1.audioService.attach(sessionId, response.filePath);
                            setAudioFilePath(audioAsset.filePath);
                        }
                        catch {
                            setAudioFilePath(response.filePath);
                        }
                    }
                    const url = URL.createObjectURL(blob);
                    revokeLastUrl();
                    lastUrlRef.current = url;
                    setAudioUrl(url);
                    setStatus("idle");
                }
                catch (error) {
                    if (!mountedRef.current)
                        return;
                    setStatus("error");
                    setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar o áudio.");
                }
                finally {
                    stoppingRef.current = false;
                    savingRef.current = false;
                }
            };
            // timeslice: gera chunks periodicamente (melhor para gravações longas)
            recorder.start(1000);
            setStatus("recording");
            setElapsedSeconds(0);
            timerRef.current = window.setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        }
        catch (error) {
            if (!mountedRef.current)
                return;
            setStatus("error");
            setErrorMessage(error instanceof Error ? error.message : "Permissão de microfone negada.");
            clearTimer();
            stopStream();
            stoppingRef.current = false;
            savingRef.current = false;
        }
    }, [clearTimer, revokeLastUrl, sessionId, status, stopStream]);
    (0, react_1.useEffect)(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            clearTimer();
            stopStream();
            revokeLastUrl();
            // Garantir que o recorder pare se o componente desmontar
            try {
                if (recorderRef.current && recorderRef.current.state !== "inactive")
                    recorderRef.current.stop();
            }
            catch {
                // ignore
            }
            stoppingRef.current = false;
            savingRef.current = false;
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
exports.useAudioRecorder = useAudioRecorder;
