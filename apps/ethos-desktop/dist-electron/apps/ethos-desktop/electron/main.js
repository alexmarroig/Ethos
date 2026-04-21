"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importStar(require("node:crypto"));
let userEncryptionKey = null;
function setUserKey(key) {
    userEncryptionKey = key;
}
function getUserKey() {
    if (!userEncryptionKey) {
        throw new Error("User encryption key not set");
    }
    return userEncryptionKey;
}
function encryptText(text, key) {
    const iv = node_crypto_1.default.randomBytes(12);
    const cipher = node_crypto_1.default.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
        iv: iv.toString("hex"),
        data: encrypted.toString("hex"),
        tag: tag.toString("hex")
    });
}
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = require("node:fs");
const node_child_process_1 = require("node:child_process");
const db_1 = require("./db");
const security_1 = require("./security");
const patients_service_1 = require("./services/patients.service");
const sessions_service_1 = require("./services/sessions.service");
const notes_service_1 = require("./services/notes.service");
const audio_service_1 = require("./services/audio.service");
const privacy_service_1 = require("./services/privacy.service");
const model_service_1 = require("./services/model.service");
const generation_service_1 = require("./services/generation.service");
const export_service_1 = require("./services/export.service");
const transcription_jobs_service_1 = require("./services/transcription-jobs.service");
const integrity_service_1 = require("./services/integrity.service");
const financial_service_1 = require("./services/financial.service");
const backup_service_1 = require("./services/backup.service");
const auth_service_1 = require("./services/auth.service");
const genai_service_1 = require("./services/genai.service");
const forms_service_1 = require("./services/forms.service");
let mainWindow = null;
let isSafeMode = false;
// ---------------------
// Worker management
// ---------------------
let workerProcess = null;
let workerStdoutBuffer = "";
let workerRestartAttempts = 0;
let workerRestartTimer = null;
const WORKER_CHANNEL_MESSAGE = "transcription:message";
const WORKER_CHANNEL_STDERR = "transcription:stderr";
const WORKER_PATH = () => node_path_1.default.resolve(__dirname, "../../ethos-transcriber/dist/index.js");
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: node_path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            // mantém compat do safe-mode no renderer
            additionalArguments: isSafeMode ? ["--safe-mode"] : [],
        },
    });
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        mainWindow.loadFile(node_path_1.default.join(__dirname, "../dist/index.html"));
    }
}
function sendToRenderer(channel, payload) {
    try {
        mainWindow?.webContents.send(channel, payload);
    }
    catch {
        // janela pode não estar pronta; ignore
    }
}
/**
 * Worker stdout pode chegar:
 * - em pedaços (chunked)
 * - com várias mensagens no mesmo chunk
 * Então: buffer + split por \n + JSON.parse por linha.
 */
function handleWorkerStdoutChunk(chunk) {
    workerStdoutBuffer += chunk.toString("utf8");
    // Limite de segurança (evitar buffer infinito se algo ficar sem \n)
    if (workerStdoutBuffer.length > 2_000_000) {
        workerStdoutBuffer = workerStdoutBuffer.slice(-200_000);
        sendToRenderer(WORKER_CHANNEL_STDERR, "[main] stdout buffer truncated (missing newlines?)");
    }
    const lines = workerStdoutBuffer.split("\n");
    workerStdoutBuffer = lines.pop() ?? "";
    for (const raw of lines) {
        const line = raw.trim();
        if (!line)
            continue;
        try {
            const msg = JSON.parse(line);
            // Persist job update (tenta, mas não derruba em safe mode)
            if (msg?.type === "job_update" && msg?.payload?.id) {
                try {
                    let updates = {
                        status: msg.payload.status,
                        progress: msg.payload.progress,
                        error: msg.payload.error,
                    };
                    // 🔐 criptografar transcript
                    if (msg.payload.transcript) {
                        try {
                            const key = getUserKey();
                            updates.transcript = encryptText(msg.payload.transcript, key);
                        }
                        catch {
                            // fallback silencioso
                        }
                    }
                    transcription_jobs_service_1.transcriptionJobsService.update(msg.payload.id, updates);
                }
                catch {
                    // ignore
                }
            }
            sendToRenderer(WORKER_CHANNEL_MESSAGE, msg);
        }
        catch {
            // Se não for JSON, manda como log
            sendToRenderer(WORKER_CHANNEL_MESSAGE, { type: "worker_log", payload: { line } });
        }
    }
}
function stopWorker() {
    if (workerRestartTimer) {
        clearTimeout(workerRestartTimer);
        workerRestartTimer = null;
    }
    workerRestartAttempts = 0;
    if (!workerProcess)
        return;
    try {
        workerProcess.removeAllListeners();
        workerProcess.stdout?.removeAllListeners();
        workerProcess.stderr?.removeAllListeners();
        // encerra gentilmente
        workerProcess.kill();
    }
    catch {
        // ignore
    }
    finally {
        workerProcess = null;
        workerStdoutBuffer = "";
    }
}
function scheduleWorkerRestart() {
    if (workerRestartTimer)
        return;
    workerRestartAttempts += 1;
    // Backoff progressivo com teto.
    const delay = Math.min(2000 * workerRestartAttempts, 15000);
    sendToRenderer(WORKER_CHANNEL_STDERR, `[main] Worker exited. Restarting in ${delay}ms…`);
    workerRestartTimer = setTimeout(() => {
        workerRestartTimer = null;
        startWorker();
    }, delay);
}
function startWorker() {
    if (workerProcess)
        return;
    const workerPath = WORKER_PATH();
    workerStdoutBuffer = "";
    workerProcess = (0, node_child_process_1.spawn)(process.execPath, [workerPath], {
        stdio: ["pipe", "pipe", "pipe"],
    });
    workerProcess.stdout?.on("data", handleWorkerStdoutChunk);
    workerProcess.stderr?.on("data", (data) => {
        sendToRenderer(WORKER_CHANNEL_STDERR, data.toString("utf8"));
    });
    workerProcess.on("exit", () => {
        workerProcess = null;
        scheduleWorkerRestart();
    });
    workerProcess.on("error", (err) => {
        sendToRenderer(WORKER_CHANNEL_STDERR, `[main] Worker spawn error: ${String(err)}`);
        workerProcess = null;
        scheduleWorkerRestart();
    });
    sendToRenderer(WORKER_CHANNEL_STDERR, "[main] Worker started.");
}
// ---------------------
// Boot / lifecycle
// ---------------------
async function boot() {
    const key = (0, security_1.getVaultKey)();
    try {
        (0, db_1.initDb)(key);
        const integrity = await integrity_service_1.integrityService.check();
        if (!integrity.ok)
            throw new Error(integrity.error);
        // Recover jobs: running -> interrupted
        const db = (0, db_1.getDb)();
        db.prepare("UPDATE transcription_jobs SET status = 'interrupted' WHERE status = 'running'").run();
        startWorker();
    }
    catch (e) {
        console.error("Integrity check failed, entering Safe Mode", e);
        isSafeMode = true;
    }
    createWindow();
}
electron_1.app.whenReady().then(boot);
electron_1.app.on("activate", () => {
    // macOS: recriar janela quando clica no dock
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
electron_1.app.on("before-quit", () => {
    stopWorker();
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
// ---------------------
// Financial IPC
// ---------------------
electron_1.ipcMain.handle("financial:getAll", () => {
    requireNotSafeMode();
    return financial_service_1.financialService.getAll();
});
electron_1.ipcMain.handle("financial:getByPatient", (_e, id) => {
    requireNotSafeMode();
    return financial_service_1.financialService.getByPatientId(id);
});
electron_1.ipcMain.handle("financial:create", (_e, entry) => {
    requireNotSafeMode();
    return financial_service_1.financialService.create(entry);
});
electron_1.ipcMain.handle("financial:update", (_e, id, entry) => {
    requireNotSafeMode();
    return financial_service_1.financialService.update(id, entry);
});
electron_1.ipcMain.handle("financial:delete", (_e, id) => {
    requireNotSafeMode();
    return financial_service_1.financialService.delete(id);
});
// ---------------------
// Helpers (safety)
// ---------------------
function requireNotSafeMode() {
    if (isSafeMode)
        throw new Error("App em Safe Mode: funcionalidade indisponível.");
}
function assertMaxBytes(byteLength, maxBytes, label) {
    if (byteLength > maxBytes) {
        throw new Error(`${label} excede o limite permitido (${Math.floor(maxBytes / (1024 * 1024))}MB).`);
    }
}
function inferExtFromMime(mimeType) {
    const mime = (mimeType || "audio/webm").toLowerCase();
    const raw = (mime.split("/")[1] || "webm").replace(/[^\w]/g, "");
    // casos comuns
    if (raw.includes("ogg"))
        return "ogg";
    if (raw.includes("webm"))
        return "webm";
    if (raw.includes("wav"))
        return "wav";
    if (raw.includes("mpeg") || raw.includes("mp3"))
        return "mp3";
    if (raw.includes("mp4") || raw.includes("m4a"))
        return "m4a";
    return raw || "webm";
}
// ---------------------
// IPC
// ---------------------
electron_1.ipcMain.handle("app:isSafeMode", () => isSafeMode);
// Dialog: open audio file
electron_1.ipcMain.handle("dialog:openAudio", async () => {
    if (!mainWindow)
        return null;
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ["openFile"],
        filters: [{ name: "Audio", extensions: ["wav", "mp3", "m4a", "ogg", "flac", "webm"] }],
    });
    return result.canceled ? null : result.filePaths[0];
});
/**
 * Salvar áudio vindo do renderer.
 *
 * IMPORTANTE (clínico):
 * - NÃO deixe áudio em claro no disco por padrão.
 * - Aqui salvamos criptografado usando audioService.saveEncrypted.
 *
 * Retorno:
 *  - filePath: caminho do arquivo ENCRYPTED (consistente com transcrição)
 *  - mimeType
 */
electron_1.ipcMain.handle("audio:save", async (_event, payload) => {
    requireNotSafeMode();
    const mimeType = payload?.mimeType || "audio/webm";
    const ext = inferExtFromMime(mimeType);
    // limite pragmático de IPC (ajuste conforme estratégia):
    // 150MB cobre ~2h com folga na maioria dos formatos compactados,
    // mas ainda é grande para IPC; o ideal para 2h é streaming no bridge.
    const MAX_BYTES = 150 * 1024 * 1024;
    assertMaxBytes(payload?.data?.byteLength ?? 0, MAX_BYTES, "Áudio");
    const fileName = `ethos-audio-${Date.now()}-${(0, node_crypto_1.randomUUID)()}.${ext}`;
    const plainPath = node_path_1.default.join(electron_1.app.getPath("userData"), fileName);
    // escreve em claro *temporariamente*
    await node_fs_1.promises.writeFile(plainPath, Buffer.from(payload.data));
    try {
        const key = (0, security_1.getVaultKey)();
        const encryptedPath = await audio_service_1.audioService.saveEncrypted(plainPath, key);
        return { filePath: encryptedPath, mimeType };
    }
    finally {
        // tenta remover o arquivo em claro
        try {
            await node_fs_1.promises.unlink(plainPath);
        }
        catch {
            // ignore (em Windows pode falhar se algum handle estiver aberto)
        }
    }
});
// ---------------------
// Patients IPC
// ---------------------
electron_1.ipcMain.handle("patients:getAll", () => {
    if (isSafeMode)
        return [];
    return patients_service_1.patientsService.getAll();
});
electron_1.ipcMain.handle("patients:create", (_e, p) => {
    requireNotSafeMode();
    return patients_service_1.patientsService.create(p);
});
electron_1.ipcMain.handle("patients:update", (_e, id, p) => {
    requireNotSafeMode();
    return patients_service_1.patientsService.update(id, p);
});
electron_1.ipcMain.handle("patients:delete", (_e, id) => {
    requireNotSafeMode();
    return patients_service_1.patientsService.delete(id);
});
// ---------------------
// Sessions IPC
// ---------------------
electron_1.ipcMain.handle("sessions:getAll", () => {
    requireNotSafeMode();
    return sessions_service_1.sessionsService.getAll();
});
electron_1.ipcMain.handle("sessions:getByPatient", (_e, id) => {
    requireNotSafeMode();
    return sessions_service_1.sessionsService.getByPatientId(id);
});
electron_1.ipcMain.handle("sessions:create", (_e, s) => {
    requireNotSafeMode();
    return sessions_service_1.sessionsService.create(s);
});
// ---------------------
// Notes IPC
// ---------------------
electron_1.ipcMain.handle("notes:getBySession", (_e, id) => {
    requireNotSafeMode();
    return notes_service_1.notesService.getBySessionId(id);
});
electron_1.ipcMain.handle("notes:generate", (_e, sessionId, transcript) => {
    requireNotSafeMode();
    const session = sessions_service_1.sessionsService.getAll().find((s) => s.id === sessionId);
    if (!session)
        throw new Error("Session not found");
    const patient = patients_service_1.patientsService.getById(session.patientId);
    if (!patient)
        throw new Error("Patient not found");
    const text = generation_service_1.generationService.generateProntuario(transcript, patient, session);
    return notes_service_1.notesService.upsertDraft(sessionId, text);
});
electron_1.ipcMain.handle("notes:upsertDraft", (_e, sessionId, text) => {
    requireNotSafeMode();
    return notes_service_1.notesService.upsertDraft(sessionId, text);
});
electron_1.ipcMain.handle("notes:updateDraft", (_e, id, text) => {
    requireNotSafeMode();
    return notes_service_1.notesService.updateDraft(id, text);
});
electron_1.ipcMain.handle("notes:validate", (_e, id, by) => {
    requireNotSafeMode();
    return notes_service_1.notesService.validate(id, by);
});
// ---------------------
// Transcription IPC
// ---------------------
/**
 * Mantém compatibilidade com payload atual:
 *  payload: { sessionId, audioPath, model, ... }
 *
 * E suporta opcionalmente áudio “gravado”:
 *  payload: { sessionId, audioData, mimeType, model, ... }
 *
 * Observação:
 *  Para áudios longos (40min–2h), mandar o arquivo inteiro por IPC não é ideal.
 *  O próximo passo “enterprise” é streaming incremental.
 */
electron_1.ipcMain.handle("transcription:enqueue", async (_event, payload) => {
    requireNotSafeMode();
    if (!workerProcess)
        startWorker();
    const key = (0, security_1.getVaultKey)();
    // 1) Determina áudio de entrada
    let inputAudioPath = payload?.audioPath ?? null;
    // Se veio audioData, escrevemos temporário, criptografamos e apagamos o temporário
    if (!inputAudioPath && payload?.audioData) {
        const mimeType = payload?.mimeType || "audio/webm";
        const ext = inferExtFromMime(mimeType);
        // limite de segurança do payload (ajuste)
        const byteLength = payload.audioData instanceof ArrayBuffer
            ? payload.audioData.byteLength
            : Buffer.isBuffer(payload.audioData)
                ? payload.audioData.length
                : undefined;
        if (typeof byteLength === "number") {
            const MAX_BYTES = 150 * 1024 * 1024;
            assertMaxBytes(byteLength, MAX_BYTES, "Áudio");
        }
        const fileName = `ethos-rec-${Date.now()}-${(0, node_crypto_1.randomUUID)()}.${ext}`;
        const plainPath = node_path_1.default.join(electron_1.app.getPath("userData"), fileName);
        const buf = payload.audioData instanceof ArrayBuffer
            ? Buffer.from(payload.audioData)
            : Buffer.isBuffer(payload.audioData)
                ? payload.audioData
                : Buffer.from(payload.audioData);
        await node_fs_1.promises.writeFile(plainPath, buf);
        try {
            inputAudioPath = plainPath;
        }
        catch (e) {
            // se algo der errado, tenta apagar e re-throw
            try {
                await node_fs_1.promises.unlink(plainPath);
            }
            catch { }
            throw e;
        }
    }
    if (!inputAudioPath) {
        throw new Error("Missing audioPath/audioData in transcription:enqueue payload.");
    }
    // 2) Pipeline de privacidade: salva criptografado e cria temp para worker
    const encryptedPath = await audio_service_1.audioService.saveEncrypted(inputAudioPath, key);
    // se input era temporário em claro criado aqui, tenta remover
    if (!payload?.audioPath && inputAudioPath.includes(electron_1.app.getPath("userData"))) {
        try {
            await node_fs_1.promises.unlink(inputAudioPath);
        }
        catch {
            // ignore
        }
    }
    const tempPath = await audio_service_1.audioService.decryptToTemp(encryptedPath, key);
    // 3) Cria job no DB
    const jobId = (0, node_crypto_1.randomUUID)();
    const nowIso = new Date().toISOString();
    const job = {
        id: jobId,
        sessionId: payload.sessionId,
        audioPath: encryptedPath, // store encrypted path
        model: payload.model,
        status: "queued",
        progress: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
    };
    transcription_jobs_service_1.transcriptionJobsService.create(job);
    // 4) Enfileira no worker (passa tempPath para processamento)
    if (workerProcess?.stdin) {
        workerProcess.stdin.write(`${JSON.stringify({
            type: "enqueue",
            payload: {
                ...payload,
                audioPath: tempPath,
                jobId,
            },
        })}\n`);
    }
    return jobId;
});
// Privacy / purge
electron_1.ipcMain.handle("privacy:purge", () => {
    requireNotSafeMode();
    return privacy_service_1.privacyService.purgeAll();
});
// ---------------------
// Export IPC
// ---------------------
electron_1.ipcMain.handle("export:docx", async (_e, text, patientName) => {
    requireNotSafeMode();
    const { filePath } = await electron_1.dialog.showSaveDialog({
        defaultPath: `Prontuario-${patientName}.docx`,
        filters: [{ name: "Word Document", extensions: ["docx"] }],
    });
    if (filePath)
        await export_service_1.exportService.exportToDocx(text, filePath);
    return !!filePath;
});
electron_1.ipcMain.handle("export:pdf", async (_e, text, patientName) => {
    requireNotSafeMode();
    const { filePath } = await electron_1.dialog.showSaveDialog({
        defaultPath: `Prontuario-${patientName}.pdf`,
        filters: [{ name: "PDF Document", extensions: ["pdf"] }],
    });
    if (filePath)
        await export_service_1.exportService.exportToPdf(text, filePath);
    return !!filePath;
});
// ---------------------
// Models IPC
// ---------------------
electron_1.ipcMain.handle("models:getAvailable", () => {
    requireNotSafeMode();
    return model_service_1.modelService.getAvailableModels();
});
electron_1.ipcMain.handle("models:getStatus", (_e, id) => {
    requireNotSafeMode();
    return model_service_1.modelService.getModelStatus(id);
});
electron_1.ipcMain.handle("models:download", async (event, id) => {
    requireNotSafeMode();
    await model_service_1.modelService.downloadModel(id, (progress) => {
        event.sender.send("models:progress", { id, progress });
    });
    return true;
});
// ---------------------
// Auth IPC
// ---------------------
electron_1.ipcMain.handle("auth:login", (_e, { email, password }) => {
    const result = auth_service_1.authService.login(email, password);
    if (result.success && result.encryptionKey) {
        const key = result.encryptionKey;
        // 🔐 guarda chave da sessão
        setUserKey(key);
        // 🔐 injeta nos services
        notes_service_1.notesService.setEncryptionKey(key);
    }
    return result;
});
electron_1.ipcMain.handle("auth:encryptToken", (_e, token) => {
    return auth_service_1.authService.encryptToken(token);
});
electron_1.ipcMain.handle("auth:decryptToken", (_e, encrypted) => {
    return auth_service_1.authService.decryptToken(encrypted);
});
electron_1.ipcMain.handle("auth:decryptToken", (_e, encrypted) => {
    return auth_service_1.authService.decryptToken(encrypted);
});
// 🔐 Transcript decrypt (ESSENCIAL)
electron_1.ipcMain.handle("crypto:decrypt", (_e, encrypted) => {
    try {
        const key = getUserKey();
        const parsed = JSON.parse(encrypted);
        const decipher = node_crypto_1.default.createDecipheriv("aes-256-gcm", key, Buffer.from(parsed.iv, "hex"));
        decipher.setAuthTag(Buffer.from(parsed.tag, "hex"));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(parsed.data, "hex")),
            decipher.final()
        ]);
        return decrypted.toString("utf8");
    }
    catch {
        return encrypted;
    }
});
// ---------------------
// GenAI IPC
// ---------------------
electron_1.ipcMain.handle("genai:transformNote", async (_e, { transcriptText, sessionId, templateType }) => {
    requireNotSafeMode();
    const session = sessions_service_1.sessionsService.getAll().find(s => s.id === sessionId);
    if (!session)
        throw new Error("Sessão não encontrada");
    const patient = patients_service_1.patientsService.getById(session.patientId);
    if (!patient)
        throw new Error("Paciente não encontrado");
    return genai_service_1.genaiService.transformToClinicalNote(transcriptText, patient, session, templateType);
});
electron_1.ipcMain.handle("genai:generateRecibo", (_e, { patientId, amount, date }) => {
    requireNotSafeMode();
    const patient = patients_service_1.patientsService.getById(patientId);
    if (!patient)
        throw new Error("Paciente não encontrado");
    return genai_service_1.genaiService.generateRecibo(patient, amount, date);
});
// ---------------------
// Forms IPC
// ---------------------
electron_1.ipcMain.handle("forms:getTemplates", () => {
    requireNotSafeMode();
    return forms_service_1.formsService.getAllTemplates();
});
electron_1.ipcMain.handle("forms:getResponses", (_e, patientId) => {
    requireNotSafeMode();
    return forms_service_1.formsService.getResponsesByPatient(patientId);
});
electron_1.ipcMain.handle("forms:submitResponse", (_e, payload) => {
    requireNotSafeMode();
    return forms_service_1.formsService.submitResponse(payload);
});
// ---------------------
// Backup IPC
// ---------------------
electron_1.ipcMain.handle("backup:create", async (_e, password) => {
    requireNotSafeMode();
    if (!mainWindow)
        return;
    const { filePath } = await electron_1.dialog.showSaveDialog(mainWindow, {
        defaultPath: `ethos-backup-${new Date().toISOString().split("T")[0]}.db`,
        filters: [{ name: "Ethos Backup", extensions: ["db"] }],
    });
    if (filePath) {
        await backup_service_1.backupService.create(password, filePath);
        return true;
    }
    return false;
});
electron_1.ipcMain.handle("backup:restore", async (_e, password) => {
    if (!mainWindow)
        return;
    const { filePaths } = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ["openFile"],
        filters: [{ name: "Ethos Backup", extensions: ["db"] }],
    });
    if (filePaths[0]) {
        await backup_service_1.backupService.restoreBackup(filePaths[0], password);
        return true;
    }
    return false;
});
