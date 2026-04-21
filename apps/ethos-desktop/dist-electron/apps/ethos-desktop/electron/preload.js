"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/ethos-desktop/electron/preload.ts
const electron_1 = require("electron");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function invoke(channel, ...args) {
    return electron_1.ipcRenderer.invoke(channel, ...args);
}
/**
 * Registra um listener e devolve um unsubscribe para evitar leaks.
 */
function on(channel, handler) {
    const listener = (_event, payload) => handler(payload);
    electron_1.ipcRenderer.on(channel, listener);
    return () => electron_1.ipcRenderer.removeListener(channel, listener);
}
/**
 * Versão "once" (útil para evitar múltiplos listeners acidentais).
 */
function once(channel, handler) {
    electron_1.ipcRenderer.once(channel, (_event, payload) => handler(payload));
}
/**
 * Validações mínimas (baratas) para evitar payloads absurdos.
 * Não substitui validação do main, mas evita bugs no renderer.
 */
function assertString(value, label) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`Invalid ${label}`);
    }
}
function assertArrayBuffer(value, label) {
    if (!(value instanceof ArrayBuffer)) {
        throw new Error(`Invalid ${label} (expected ArrayBuffer)`);
    }
}
function assertMimeType(value) {
    assertString(value, "mimeType");
    // validação leve: "type/subtype"
    if (!value.includes("/"))
        throw new Error("Invalid mimeType format");
}
function assertMaxBytes(byteLength, maxBytes, label) {
    if (byteLength > maxBytes) {
        throw new Error(`${label} excede o limite permitido (${Math.floor(maxBytes / (1024 * 1024))}MB).`);
    }
}
function validateEnqueuePayload(payload) {
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
        isSafeMode: () => invoke("app:isSafeMode"),
    }),
    // ------------------------
    // Auth
    // ------------------------
    auth: Object.freeze({
        login: (credentials) => invoke("auth:login", credentials),
        encryptToken: (token) => invoke("auth:encryptToken", token),
        decryptToken: (encrypted) => invoke("auth:decryptToken", encrypted),
    }),
    crypto: Object.freeze({
        decrypt: (data) => invoke("crypto:decrypt", data),
    }),
    // ------------------------
    // Patients
    // ------------------------
    patients: Object.freeze({
        getAll: () => invoke("patients:getAll"),
        create: (p) => invoke("patients:create", p),
        update: (id, p) => invoke("patients:update", id, p),
        delete: (id) => invoke("patients:delete", id),
    }),
    // ------------------------
    // Sessions
    // ------------------------
    sessions: Object.freeze({
        getAll: () => invoke("sessions:getAll"),
        getByPatient: (id) => invoke("sessions:getByPatient", id),
        create: (s) => invoke("sessions:create", s),
    }),
    // ------------------------
    // Financial
    // ------------------------
    financial: Object.freeze({
        getAll: () => invoke("financial:getAll"),
        getByPatient: (id) => invoke("financial:getByPatient", id),
        create: (e) => invoke("financial:create", e),
        update: (id, e) => invoke("financial:update", id, e),
        delete: (id) => invoke("financial:delete", id),
    }),
    // ------------------------
    // Notes
    // ------------------------
    notes: Object.freeze({
        getBySession: (id) => invoke("notes:getBySession", id),
        generate: (sessionId, transcript) => invoke("notes:generate", sessionId, transcript),
        upsertDraft: (sessionId, text) => invoke("notes:upsertDraft", sessionId, text),
        updateDraft: (id, text) => invoke("notes:updateDraft", id, text),
        validate: (id, by) => invoke("notes:validate", id, by),
    }),
    // ------------------------
    // GenAI
    // ------------------------
    genai: Object.freeze({
        transformNote: (payload) => invoke("genai:transformNote", payload),
        generateRecibo: (payload) => invoke("genai:generateRecibo", payload),
    }),
    // ------------------------
    // Forms
    // ------------------------
    forms: Object.freeze({
        getTemplates: () => invoke("forms:getTemplates"),
        getResponses: (patientId) => invoke("forms:getResponses", patientId),
        submitResponse: (payload) => invoke("forms:submitResponse", payload),
    }),
    // ------------------------
    // Audio & Transcription
    // ------------------------
    audio: Object.freeze({
        openDialog: () => invoke("dialog:openAudio"),
        save: (payload) => {
            assertArrayBuffer(payload.data, "data");
            assertMimeType(payload.mimeType);
            // limite pragmático no renderer (evita travar o front por acidente)
            // Ajuste conforme sua estratégia. Para 2h, ideal é streaming incremental.
            const MAX_BYTES = 150 * 1024 * 1024;
            assertMaxBytes(payload.data.byteLength, MAX_BYTES, "Áudio");
            return invoke("audio:save", payload);
        },
    }),
    transcription: Object.freeze({
        enqueue: (payload) => {
            validateEnqueuePayload(payload);
            return invoke("transcription:enqueue", payload);
        },
        onMessage: (handler) => on("transcription:message", handler),
        onError: (handler) => on("transcription:stderr", handler),
        // opcional: ouvir uma mensagem só (debug / UX)
        onceMessage: (handler) => once("transcription:message", handler),
    }),
    // ------------------------
    // Privacy
    // ------------------------
    privacy: Object.freeze({
        purgeAll: () => invoke("privacy:purge"),
    }),
    // ------------------------
    // Backup
    // ------------------------
    backup: Object.freeze({
        create: (password) => invoke("backup:create", password),
        restore: (password) => invoke("backup:restore", password),
    }),
    // ------------------------
    // Export
    // ------------------------
    export: Object.freeze({
        docx: (text, patientName) => invoke("export:docx", text, patientName),
        pdf: (text, patientName) => invoke("export:pdf", text, patientName),
    }),
    // ------------------------
    // Models
    // ------------------------
    models: Object.freeze({
        getAvailable: () => invoke("models:getAvailable"),
        getStatus: (id) => invoke("models:getStatus", id),
        download: (id) => invoke("models:download", id),
        onProgress: (handler) => on("models:progress", handler),
    }),
    // -----------------------------------------------------------------------
    // Compat LEGADO (para não quebrar hooks/renderer antigo)
    // -----------------------------------------------------------------------
    // Estes nomes imitam a “adição proposta”, mas sem perder as boas práticas.
    openAudioDialog: () => invoke("dialog:openAudio"),
    // compat com o hook antigo: window.ethos.saveAudio(...)
    saveAudio: (payload) => ethosApi.audio.save(payload),
    // compat com assinatura antiga (só audioPath). Se quiser audioData, use ethosApi.transcription.enqueue.
    enqueueTranscription: (payload) => {
        assertString(payload.sessionId, "sessionId");
        assertString(payload.audioPath, "audioPath");
        assertString(payload.model, "model");
        return invoke("transcription:enqueue", payload);
    },
    // compat: registra listener e devolve unsubscribe (melhor que o proposto)
    onTranscriptionMessage: (handler) => on("transcription:message", handler),
    onTranscriptionError: (handler) => on("transcription:stderr", handler),
});
// Expor API com nome estável
electron_1.contextBridge.exposeInMainWorld("ethos", ethosApi);
