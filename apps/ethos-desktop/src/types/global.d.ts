export {};

interface EthosAPI {
  app: {
    isSafeMode(): Promise<boolean>;
  };
  auth: {
    login(credentials: any): Promise<any>;
    encryptToken(token: string): Promise<string>;
    decryptToken(encrypted: string): Promise<string | null>;
    logout?(): Promise<void>;
  };
  crypto: {
    decrypt(data: string): Promise<string>;
  };
  patients: {
    getAll(): Promise<any[]>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<void>;
    delete(id: string): Promise<void>;
  };
  sessions: {
    getAll(): Promise<any[]>;
    getByPatient(id: string): Promise<any[]>;
    create(data: any): Promise<any>;
  };
  financial: {
    getAll(): Promise<any[]>;
    getByPatient(id: string): Promise<any[]>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<void>;
    delete(id: string): Promise<void>;
  };
  notes: {
    getBySession(id: string): Promise<any>;
    generate(sessionId: string, transcript: unknown): Promise<any>;
    upsertDraft(sessionId: string, text: string): Promise<any>;
    updateDraft(id: string, text: string): Promise<any>;
    validate(id: string, by?: string): Promise<void>;
  };
  genai: {
    transformNote(payload: { transcriptText: string; sessionId: string; templateType: string }): Promise<string>;
    generateRecibo(payload: { patientId: string; amount: number; date: string }): Promise<string>;
  };
  forms: {
    getTemplates(): Promise<any[]>;
    getResponses(patientId: string): Promise<any[]>;
    submitResponse(data: any): Promise<any>;
  };
  audio: {
    openDialog(): Promise<string | null>;
    save(payload: { data: ArrayBuffer; mimeType: string }): Promise<{ filePath: string; mimeType?: string } | null>;
  };
  transcription: {
    enqueue(data: any): Promise<string>;
    onMessage(cb: (msg: unknown) => void): () => void;
    onError(cb: (err: string) => void): () => void;
    onceMessage(cb: (msg: unknown) => void): void;
  };
  privacy: {
    purgeAll(): Promise<void>;
  };
  backup: {
    create(password: string): Promise<boolean>;
    restore(password: string): Promise<boolean>;
  };
  export: {
    docx(text: string, patientName: string): Promise<boolean>;
    pdf(text: string, patientName: string): Promise<boolean>;
  };
  models: {
    getAvailable(): Promise<any>;
    getStatus(id: string): Promise<any>;
    download(id: string): Promise<any>;
    onProgress(handler: (data: { id: string; progress: number }) => void): () => void;
  };
  // compat legacy
  openAudioDialog(): Promise<string | null>;
  saveAudio(payload: { data: ArrayBuffer; mimeType: string }): Promise<{ filePath: string } | null>;
  enqueueTranscription(payload: { sessionId: string; audioPath: string; model: string }): Promise<string>;
  onTranscriptionMessage(handler: (message: unknown) => void): () => void;
  onTranscriptionError(handler: (message: string) => void): () => void;
}

declare global {
  interface Window {
    ethos: EthosAPI;
  }
}
