import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ethos", {
  openAudioDialog: () => ipcRenderer.invoke("dialog:openAudio"),
  saveAudio: (payload: { data: ArrayBuffer; mimeType: string }) => ipcRenderer.invoke("audio:save", payload),
  enqueueTranscription: (payload: { sessionId: string; audioPath: string; model: "ptbr-fast" | "ptbr-accurate" }) =>
    ipcRenderer.invoke("transcription:enqueue", payload),
  onTranscriptionMessage: (handler: (message: string) => void) =>
    ipcRenderer.on("transcription:message", (_event, message) => handler(message)),
  onTranscriptionError: (handler: (message: string) => void) =>
    ipcRenderer.on("transcription:stderr", (_event, message) => handler(message)),
});
