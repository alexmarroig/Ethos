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
// (No seu main melhorado eu mandei objetos estruturados.)
type WorkerMessage = unknown;

type ModelsProgressEvent = { id: string; progress: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wrapper seguro para invoke.
 * Centraliza o canal e reduz repetição.
 */
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

function validateEnqueuePayload(payload: EnqueueTranscriptionPayload) {
  assertString(payload.sessionId, "sessionId");
  assertString(payload.model, "model");

  // áudio via caminho
  if ("audioPath" in payload) {
    assertString(payload.audioPath, "audioPath");
    return;
  }

  // áudio via buffer
  assertArrayBuffer(payload.audioData, "audioData");
  assertMimeType(payload.mimeType);
}

// ---------------------------------------------------------------------------
// API pública exposta no window.ethos
// ---------------------------------------------------------------------------

const ethosApi = Object.freeze({
  // ------------------------
  // App / Safe Mode (se você já tem no main)
  // ------------------------
  app: Object.freeze({
    isSafeMode: () => invoke<boolean>("app:isSafeMode"),
  }),

  // ------------------------
  // Patients
  // ------------------------
  patients: Object.freeze({
    getAll: () => invoke("patients:getAll"),
    create: (p: unknown) => invoke("patients:create", p),
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
    /**
     * Abre um file picker nativo e retorna um caminho de arquivo.
     */
    openDialog: () => invoke<string | null>("dialog:openAudio"),

    /**
     * NOVO: salva áudio gravado no renderer (MediaRecorder) no lado do main.
     * Retorna { filePath, mimeType }.
     */
    save: (payload: SaveAudioPayload) => {
      assertArrayBuffer(payload.data, "data");
      assertMimeType(payload.mimeType);
      return invoke<{ filePath: string; mimeType: string }>("audio:save", payload);
    },
  }),

  transcription: Object.freeze({
    /**
     * Enfileira transcrição.
     * Pode receber audioPath (arquivo) ou audioData (buffer) + mimeType (gravado).
     */
    enqueue: (payload: EnqueueTranscriptionPayload) => {
      validateEnqueuePayload(payload);
      return invoke<string>("transcription:enqueue", payload);
    },

    /**
     * Escuta mensagens estruturadas do worker (progresso, logs, etc).
     * Retorna unsubscribe para evitar listeners duplicados no React.
     */
    onMessage: (handler: (message: WorkerMessage) => void): Unsubscribe =>
      on<WorkerMessage>("transcription:message", handler),

    /**
     * Escuta stderr / logs de erro do worker.
     */
    onError: (handler: (message: string) => void): Unsubscribe =>
      on<string>("transcription:stderr", handler),
  }),

  // ------------------------
  // Privacy
  // ------------------------
  privacy: Object.freeze({
    purgeAll: () => invoke("privacy:purge"),
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

    /**
     * Progresso de download de modelos (stream via ipcRenderer.on).
     * Retorna unsubscribe.
     */
    onProgress: (handler: (data: ModelsProgressEvent) => void): Unsubscribe =>
      on<ModelsProgressEvent>("models:progress", handler),
  }),
});

// Expor API com nome estável
contextBridge.exposeInMainWorld("ethos", ethosApi);

/**
 * Dica prática para o renderer (React):
 * useEffect(() => {
 *   const off1 = window.ethos.transcription.onMessage(...)
 *   const off2 = window.ethos.transcription.onError(...)
 *   return () => { off1(); off2(); }
 * }, [])
 */
