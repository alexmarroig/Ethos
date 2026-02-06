import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ethos", {
  openAudioDialog: () => ipcRenderer.invoke("dialog:openAudio"),
  enqueueTranscription: (payload: { sessionId: string; audioPath: string; model: "ptbr-fast" | "ptbr-accurate" }) =>
    ipcRenderer.invoke("transcription:enqueue", payload),
  audio: {
    startSession: (payload: { sessionId?: string; mimeType: string }) =>
      ipcRenderer.invoke("audio:startSession", payload),
    appendChunk: (payload: { recordingId: string; data: ArrayBuffer }) =>
      ipcRenderer.invoke("audio:appendChunk", payload),
    finishSession: (payload: { recordingId: string }) =>
      ipcRenderer.invoke("audio:finishSession", payload),
    abortSession: (payload: { recordingId: string }) =>
      ipcRenderer.invoke("audio:abortSession", payload),
    deleteRecording: (payload: { filePath: string }) =>
      ipcRenderer.invoke("audio:deleteRecording", payload),
    openRecording: (payload: { filePath: string }) =>
      ipcRenderer.invoke("audio:openRecording", payload),
    exportRecording: (payload: { filePath: string }) =>
      ipcRenderer.invoke("audio:exportRecording", payload),
  },
  onTranscriptionMessage: (handler: (message: string) => void) =>
    ipcRenderer.on("transcription:message", (_event, message) => handler(message)),
  onTranscriptionError: (handler: (message: string) => void) =>
    ipcRenderer.on("transcription:stderr", (_event, message) => handler(message)),
});
