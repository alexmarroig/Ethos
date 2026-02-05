import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ethos", {
  // Patients
  patients: {
    getAll: () => ipcRenderer.invoke("patients:getAll"),
    create: (p: any) => ipcRenderer.invoke("patients:create", p),
    delete: (id: string) => ipcRenderer.invoke("patients:delete", id),
  },
  // Sessions
  sessions: {
    getAll: () => ipcRenderer.invoke("sessions:getAll"),
    getByPatient: (id: string) => ipcRenderer.invoke("sessions:getByPatient", id),
    create: (s: any) => ipcRenderer.invoke("sessions:create", s),
  },
  // Notes
  notes: {
    getBySession: (id: string) => ipcRenderer.invoke("notes:getBySession", id),
    generate: (sessionId: string, transcript: any) => ipcRenderer.invoke("notes:generate", sessionId, transcript),
    upsertDraft: (sessionId: string, text: string) => ipcRenderer.invoke("notes:upsertDraft", sessionId, text),
    updateDraft: (id: string, text: string) => ipcRenderer.invoke("notes:updateDraft", id, text),
    validate: (id: string, by: string) => ipcRenderer.invoke("notes:validate", id, by),
  },
  // Audio & Transcription
  openAudioDialog: () => ipcRenderer.invoke("dialog:openAudio"),
  enqueueTranscription: (payload: any) => ipcRenderer.invoke("transcription:enqueue", payload),
  onTranscriptionMessage: (handler: any) => {
    const listener = (_e: any, m: any) => handler(m);
    ipcRenderer.on("transcription:message", listener);
    return () => ipcRenderer.removeListener("transcription:message", listener);
  },
  onTranscriptionError: (handler: any) => {
    const listener = (_e: any, m: any) => handler(m);
    ipcRenderer.on("transcription:stderr", listener);
    return () => ipcRenderer.removeListener("transcription:stderr", listener);
  },
  // Privacy
  purgeAll: () => ipcRenderer.invoke("privacy:purge"),
  // Export
  export: {
    docx: (text: string, patientName: string) => ipcRenderer.invoke("export:docx", text, patientName),
    pdf: (text: string, patientName: string) => ipcRenderer.invoke("export:pdf", text, patientName),
  },
  // Models
  models: {
    getAvailable: () => ipcRenderer.invoke("models:getAvailable"),
    getStatus: (id: string) => ipcRenderer.invoke("models:getStatus", id),
    download: (id: string) => ipcRenderer.invoke("models:download", id),
    onProgress: (handler: (data: { id: string; progress: number }) => void) => {
      const listener = (_e: any, d: any) => handler(d);
      ipcRenderer.on("models:progress", listener);
      return () => ipcRenderer.removeListener("models:progress", listener);
    }
  }
});
