// apps/ethos-desktop/electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";

/**
 * Tipos “de borda” (preload <-> renderer).
 * A ideia é: o renderer só enxerga isso. Tudo fora disso fica inacessível.
 */
type Unsubscribe = () => void;

type EthosModelId = "ptbr-fast" | "ptbr-accurate" | (string & {}); // permite expansão sem quebrar

type SaveAudioPayload = {
  data: ArrayBuffer;
  mimeType: string; // ex: "audio/webm"
};

type EnqueueTranscriptionPayload =
  | {
      sessionId: string;
      audioPath: string; // caminho de arquivo já existente
      model: EthosModelId;
    }
  | {
      sessionId: string;
      audioData: ArrayBuffer; // gravação no app
      mimeType: string;
      model: EthosModelId;
    };

// Mensagens do worker podem ser JSON (objeto) ou logs em texto.
// No seu main melhorado você envia objeto estruturado em ambos casos.
type WorkerMessage = unknown;

type ModelsProgressEvent = { id: string; progress: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>;
}

/**
 * Registra um listener e devolve um unsubscribe para evitar leaks.
 */
function on<T = unknown>(channel: string, handler: (payload: T) => void): Unsubscribe {
  const listener = (_event: unknown, payload: T) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

/**
 * Versão "once" (útil para evitar múltiplos listeners acidentais).
 */
function once<T = unknown>(channel: string, handler: (payload: T) => void): void {
  ipcRenderer.once(channel, (_event: unknown, payload: T) => handler(payload));
}

/**
 * Validações mínimas (baratas) para evitar payloads absurdos.
 * Não substitui validação do main, mas evita bugs no renderer.
 */
function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid ${label}`);
  }
}

function assertArrayBuffer(value: unknown, label: string): asserts value is ArrayBuffer {
  if (!(value instanceof ArrayBuffer)) {
    throw new Error(`Invalid ${label} (expected ArrayBuffer)`);
  }
}

function assertMimeType(value: unknown): asserts value is string {
  assertString(value, "mimeType");
  // validação leve: "type/subtype"
  if (!value.includes("/")) throw new Error("Invalid mimeType format");
}

function assertMaxBytes(byteLength: number, maxBytes: number, label: string) {
  if (byteLength > maxBytes) {
    throw new Error(`${label} excede o limite permitido (${Math.floor(maxBytes / (1024 * 1024))}MB).`);
  }
}

function validateEnqueuePayload(payload: EnqueueTranscriptionPayload) {
  assertString(payload.sessionId, "sessionId");
  assertString(payload.model, "model");

  if ("audioPath" in payload) {
    assertString(payload.audioPath, "audioPath");
    return;
  }

  assertArrayBuffer(payload.audioData, "audioData");
  assertMimeType(payload.mimeType);
}

// ---------------------------------------------------------------------------
// API pública exposta no window.ethos
// ---------------------------------------------------------------------------

const ethosApi = Object.freeze({
  // ------------------------
  // App / Safe Mode
  // ------------------------
  app: Object.freeze({
    isSafeMode: () => invoke<boolean>("app:isSafeMode"),
  }),

  // ------------------------
  // Auth
  // ------------------------
  auth: Object.freeze({
    login: (payload: any) => invoke("auth:login", payload),
    encryptToken: (token: string) => invoke("auth:encryptToken", token),
    decryptToken: (encrypted: string) => invoke("auth:decryptToken", encrypted),
  }),

  // ------------------------
  // Patients
  // ------------------------
  patients: Object.freeze({
    getAll: () => invoke("patients:getAll"),
    getById: (id: string) => invoke("patients:getById", id),
    create: (p: unknown) => invoke("patients:create", p),
    update: (id: string, updates: any) => invoke("patients:update", id, updates),
    delete: (id: string) => invoke("patients:delete", id),
  }),

  // ------------------------
  // Sessions
  // ------------------------
  sessions: Object.freeze({
    getAll: () => invoke("sessions:getAll"),
    getByPatient: (id: string) => invoke("sessions:getByPatient", id),
    create: (s: unknown) => invoke("sessions:create", s),
  }),

  // ------------------------
  // Notes
  // ------------------------
  notes: Object.freeze({
    getBySession: (id: string) => invoke("notes:getBySession", id),
    generate: (sessionId: string, transcript: unknown) => invoke("notes:generate", sessionId, transcript),
    upsertDraft: (sessionId: string, text: string) => invoke("notes:upsertDraft", sessionId, text),
    updateDraft: (id: string, text: string) => invoke("notes:updateDraft", id, text),
    validate: (id: string, by: string) => invoke("notes:validate", id, by),
  }),

  // ------------------------
  // Audio & Transcription
  // ------------------------
  audio: Object.freeze({
    openDialog: () => invoke<string | null>("dialog:openAudio"),

    save: (payload: SaveAudioPayload) => {
      assertArrayBuffer(payload.data, "data");
      assertMimeType(payload.mimeType);

      // limite pragmático no renderer (evita travar o front por acidente)
      // Ajuste conforme sua estratégia. Para 2h, ideal é streaming incremental.
      const MAX_BYTES = 150 * 1024 * 1024;
      assertMaxBytes(payload.data.byteLength, MAX_BYTES, "Áudio");

      return invoke<{ filePath: string; mimeType: string }>("audio:save", payload);
    },
  }),

  transcription: Object.freeze({
    enqueue: (payload: EnqueueTranscriptionPayload) => {
      validateEnqueuePayload(payload);
      return invoke<string>("transcription:enqueue", payload);
    },

    onMessage: (handler: (message: WorkerMessage) => void): Unsubscribe =>
      on<WorkerMessage>("transcription:message", handler),

    onError: (handler: (message: string) => void): Unsubscribe =>
      on<string>("transcription:stderr", handler),

    // opcional: ouvir uma mensagem só (debug / UX)
    onceMessage: (handler: (message: WorkerMessage) => void) => once<WorkerMessage>("transcription:message", handler),
  }),

  // ------------------------
  // Privacy
  // ------------------------
  privacy: Object.freeze({
    purgeAll: () => invoke("privacy:purge"),
  }),

  // ------------------------
  // Financial (V1)
  // ------------------------
  financial: Object.freeze({
    getAll: () => invoke("financial:getAll"),
    getByPatient: (patientId: string) => invoke("financial:getByPatient", patientId),
    create: (entry: any) => invoke("financial:create", entry),
  }),

  // ------------------------
  // Forms (V1)
  // ------------------------
  forms: Object.freeze({
    getTemplates: () => invoke("forms:getTemplates"),
    getResponses: (patientId: string) => invoke("forms:getResponses", patientId),
    submitResponse: (response: any) => invoke("forms:submitResponse", response),
  }),

  // ------------------------
  // GenAI (V1)
  // ------------------------
  genai: Object.freeze({
    transformNote: (payload: any) => invoke("genai:transformNote", payload),
    generateRecibo: (payload: any) => invoke("genai:generateRecibo", payload),
  }),

  // ------------------------
  // Backup (V1)
  // ------------------------
  backup: Object.freeze({
    create: (password: string) => invoke("backup:create", password),
    restore: (password: string) => invoke("backup:restore", password),
  }),

  // ------------------------
  // Export
  // ------------------------
  export: Object.freeze({
    docx: (text: string, patientName: string) => invoke<boolean>("export:docx", text, patientName),
    pdf: (text: string, patientName: string) => invoke<boolean>("export:pdf", text, patientName),
  }),

  // ------------------------
  // Models
  // ------------------------
  models: Object.freeze({
    getAvailable: () => invoke("models:getAvailable"),
    getStatus: (id: string) => invoke("models:getStatus", id),
    download: (id: string) => invoke("models:download", id),

    onProgress: (handler: (data: ModelsProgressEvent) => void): Unsubscribe =>
      on<ModelsProgressEvent>("models:progress", handler),
  }),

  // -----------------------------------------------------------------------
  // Compat LEGADO (para não quebrar hooks/renderer antigo)
  // -----------------------------------------------------------------------
  // Estes nomes imitam a “adição proposta”, mas sem perder as boas práticas.
  openAudioDialog: () => invoke<string | null>("dialog:openAudio"),

  // compat com o hook antigo: window.ethos.saveAudio(...)
  saveAudio: (payload: SaveAudioPayload) => ethosApi.audio.save(payload),

  // compat com assinatura antiga (só audioPath). Se quiser audioData, use ethosApi.transcription.enqueue.
  enqueueTranscription: (payload: { sessionId: string; audioPath: string; model: "ptbr-fast" | "ptbr-accurate" }) => {
    assertString(payload.sessionId, "sessionId");
    assertString(payload.audioPath, "audioPath");
    assertString(payload.model, "model");
    return invoke<string>("transcription:enqueue", payload);
  },

  // compat: registra listener e devolve unsubscribe (melhor que o proposto)
  onTranscriptionMessage: (handler: (message: WorkerMessage) => void): Unsubscribe =>
    on<WorkerMessage>("transcription:message", handler),

  onTranscriptionError: (handler: (message: string) => void): Unsubscribe =>
    on<string>("transcription:stderr", handler),
});

// Expor API com nome estável
contextBridge.exposeInMainWorld("ethos", ethosApi);
