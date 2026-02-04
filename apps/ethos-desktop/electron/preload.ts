import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ethos", {
  openAudioDialog: () => ipcRenderer.invoke("dialog:openAudio"),
  enqueueTranscription: (payload: { sessionId: string; audioPath: string; model: "ptbr-fast" | "ptbr-accurate" }) =>
    ipcRenderer.invoke("transcription:enqueue", payload),
  onTranscriptionMessage: (handler: (message: string) => void) =>
    ipcRenderer.on("transcription:message", (_event, message) => handler(message)),
  onTranscriptionError: (handler: (message: string) => void) =>
    ipcRenderer.on("transcription:stderr", (_event, message) => handler(message)),
});
