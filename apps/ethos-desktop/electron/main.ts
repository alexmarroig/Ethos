import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

import { initDb, getDb } from "./db";
import { getVaultKey } from "./security";

import { authService } from "./services/auth.service";
import { patientsService } from "./services/patients.service";
import { sessionsService } from "./services/sessions.service";
import { notesService } from "./services/notes.service";
import { audioService } from "./services/audio.service";
import { privacyService } from "./services/privacy.service";
import { modelService } from "./services/model.service";
import { generationService } from "./services/generation.service";
import { exportService } from "./services/export.service";
import { transcriptionJobsService } from "./services/transcription-jobs.service";
import { integrityService } from "./services/integrity.service";

// Future V1 services (stubs for Part 1)
import { financialService } from "./services/financial.service";
import { formsService } from "./services/forms.service";
import { genaiService } from "./services/genai.service";
import { backupService } from "./services/backup.service";

let mainWindow: BrowserWindow | null = null;
let isSafeMode = false;

// ---------------------
// Worker management
// ---------------------
let workerProcess: ReturnType<typeof spawn> | null = null;
let workerStdoutBuffer = "";
let workerRestartAttempts = 0;
let workerRestartTimer: NodeJS.Timeout | null = null;

const WORKER_CHANNEL_MESSAGE = "transcription:message";
const WORKER_CHANNEL_STDERR = "transcription:stderr";

const WORKER_PATH = () => path.resolve(__dirname, "../../ethos-transcriber/dist/index.js");

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // mantém compat do safe-mode no renderer
      additionalArguments: isSafeMode ? ["--safe-mode"] : [],
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

function sendToRenderer(channel: string, payload: unknown) {
  try {
    mainWindow?.webContents.send(channel, payload);
  } catch {
    // janela pode não estar pronta; ignore
  }
}

/**
 * Worker stdout pode chegar:
 * - em pedaços (chunked)
 * - com várias mensagens no mesmo chunk
 * Então: buffer + split por \n + JSON.parse por linha.
 */
function handleWorkerStdoutChunk(chunk: Buffer) {
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
    if (!line) continue;

    try {
      const msg = JSON.parse(line);

      // Persist job update (tenta, mas não derruba em safe mode)
      if (msg?.type === "job_update" && msg?.payload?.id) {
        try {
          transcriptionJobsService.update(msg.payload.id, {
            status: msg.payload.status,
            progress: msg.payload.progress,
            error: msg.payload.error,
          });
        } catch {
          // ignore
        }
      }

      sendToRenderer(WORKER_CHANNEL_MESSAGE, msg);
    } catch {
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

  if (!workerProcess) return;

  try {
    workerProcess.removeAllListeners();
    workerProcess.stdout?.removeAllListeners();
    workerProcess.stderr?.removeAllListeners();

    // encerra gentilmente
    workerProcess.kill();
  } catch {
    // ignore
  } finally {
    workerProcess = null;
    workerStdoutBuffer = "";
  }
}

function scheduleWorkerRestart() {
  if (workerRestartTimer) return;

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
  if (workerProcess) return;

  const workerPath = WORKER_PATH();
  workerStdoutBuffer = "";

  workerProcess = spawn(process.execPath, [workerPath], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  workerProcess.stdout.on("data", handleWorkerStdoutChunk);

  workerProcess.stderr.on("data", (data) => {
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
  const key = getVaultKey();

  try {
    initDb(key);

    const integrity = await integrityService.check();
    if (!integrity.ok) throw new Error(integrity.error);

    // Recover jobs: running -> interrupted
    const db = getDb();
    db.prepare("UPDATE transcription_jobs SET status = 'interrupted' WHERE status = 'running'").run();

    startWorker();
  } catch (e) {
    console.error("Integrity check failed, entering Safe Mode", e);
    isSafeMode = true;
  }

  createWindow();
}

app.whenReady().then(boot);

app.on("activate", () => {
  // macOS: recriar janela quando clica no dock
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  stopWorker();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------------------
// Helpers (safety)
// ---------------------
function requireNotSafeMode() {
  if (isSafeMode) throw new Error("App em Safe Mode: funcionalidade indisponível.");
}

function assertMaxBytes(byteLength: number, maxBytes: number, label: string) {
  if (byteLength > maxBytes) {
    throw new Error(`${label} excede o limite permitido (${Math.floor(maxBytes / (1024 * 1024))}MB).`);
  }
}

function inferExtFromMime(mimeType: string) {
  const mime = (mimeType || "audio/webm").toLowerCase();
  const raw = (mime.split("/")[1] || "webm").replace(/[^\w]/g, "");
  // casos comuns
  if (raw.includes("ogg")) return "ogg";
  if (raw.includes("webm")) return "webm";
  if (raw.includes("wav")) return "wav";
  if (raw.includes("mpeg") || raw.includes("mp3")) return "mp3";
  if (raw.includes("mp4") || raw.includes("m4a")) return "m4a";
  return raw || "webm";
}

// ---------------------
// IPC
// ---------------------
ipcMain.handle("app:isSafeMode", () => isSafeMode);

// Auth IPC
ipcMain.handle("auth:login", (_e, { email, password }) => {
  return authService.login(email, password);
});
ipcMain.handle("auth:encryptToken", (_e, token) => authService.encryptToken(token));
ipcMain.handle("auth:decryptToken", (_e, encrypted) => authService.decryptToken(encrypted));

// Dialog: open audio file
ipcMain.handle("dialog:openAudio", async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
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
ipcMain.handle("audio:save", async (_event, payload: { data: ArrayBuffer; mimeType: string }) => {
  requireNotSafeMode();

  const mimeType = payload?.mimeType || "audio/webm";
  const ext = inferExtFromMime(mimeType);

  // limite pragmático de IPC (ajuste conforme estratégia):
  // 150MB cobre ~2h com folga na maioria dos formatos compactados,
  // mas ainda é grande para IPC; o ideal para 2h é streaming no bridge.
  const MAX_BYTES = 150 * 1024 * 1024;
  assertMaxBytes(payload?.data?.byteLength ?? 0, MAX_BYTES, "Áudio");

  const fileName = `ethos-audio-${Date.now()}-${randomUUID()}.${ext}`;
  const plainPath = path.join(app.getPath("userData"), fileName);

  // escreve em claro *temporariamente*
  await fs.writeFile(plainPath, Buffer.from(payload.data));

  try {
    const key = getVaultKey();
    const encryptedPath = await audioService.saveEncrypted(plainPath, key);
    return { filePath: encryptedPath, mimeType };
  } finally {
    // tenta remover o arquivo em claro
    try {
      await fs.unlink(plainPath);
    } catch {
      // ignore (em Windows pode falhar se algum handle estiver aberto)
    }
  }
});

// ---------------------
// Patients IPC
// ---------------------
ipcMain.handle("patients:getAll", () => {
  if (isSafeMode) return [];
  return patientsService.getAll();
});
ipcMain.handle("patients:getById", (_e, id) => {
  if (isSafeMode) return undefined;
  return patientsService.getById(id);
});
ipcMain.handle("patients:create", (_e, p) => {
  requireNotSafeMode();
  return patientsService.create(p);
});
ipcMain.handle("patients:update", (_e, id, updates) => {
  requireNotSafeMode();
  return patientsService.update(id, updates);
});
ipcMain.handle("patients:delete", (_e, id) => {
  requireNotSafeMode();
  return patientsService.delete(id);
});

// ---------------------
// Sessions IPC
// ---------------------
ipcMain.handle("sessions:getAll", () => {
  requireNotSafeMode();
  return sessionsService.getAll();
});
ipcMain.handle("sessions:getByPatient", (_e, id) => {
  requireNotSafeMode();
  return sessionsService.getByPatientId(id);
});
ipcMain.handle("sessions:create", (_e, s) => {
  requireNotSafeMode();
  return sessionsService.create(s);
});

// ---------------------
// Notes IPC
// ---------------------
ipcMain.handle("notes:getBySession", (_e, id) => {
  requireNotSafeMode();
  return notesService.getBySessionId(id);
});

ipcMain.handle("notes:generate", (_e, sessionId, transcript) => {
  requireNotSafeMode();

  const session = sessionsService.getAll().find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found");

  const patient = patientsService.getById(session.patientId);
  if (!patient) throw new Error("Patient not found");

  const text = generationService.generateProntuario(transcript, patient, session);
  return notesService.upsertDraft(sessionId, text);
});

ipcMain.handle("notes:upsertDraft", (_e, sessionId, text) => {
  requireNotSafeMode();
  return notesService.upsertDraft(sessionId, text);
});
ipcMain.handle("notes:updateDraft", (_e, id, text) => {
  requireNotSafeMode();
  return notesService.updateDraft(id, text);
});
ipcMain.handle("notes:validate", (_e, id, by) => {
  requireNotSafeMode();
  return notesService.validate(id, by);
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
ipcMain.handle("transcription:enqueue", async (_event, payload) => {
  requireNotSafeMode();
  if (!workerProcess) startWorker();

  const key = getVaultKey();

  // 1) Determina áudio de entrada
  let inputAudioPath: string | null = payload?.audioPath ?? null;

  // Se veio audioData, escrevemos temporário, criptografamos e apagamos o temporário
  if (!inputAudioPath && payload?.audioData) {
    const mimeType = payload?.mimeType || "audio/webm";
    const ext = inferExtFromMime(mimeType);

    // limite de segurança do payload (ajuste)
    const byteLength =
      payload.audioData instanceof ArrayBuffer
        ? payload.audioData.byteLength
        : Buffer.isBuffer(payload.audioData)
          ? payload.audioData.length
          : undefined;

    if (typeof byteLength === "number") {
      const MAX_BYTES = 150 * 1024 * 1024;
      assertMaxBytes(byteLength, MAX_BYTES, "Áudio");
    }

    const fileName = `ethos-rec-${Date.now()}-${randomUUID()}.${ext}`;
    const plainPath = path.join(app.getPath("userData"), fileName);

    const buf =
      payload.audioData instanceof ArrayBuffer
        ? Buffer.from(payload.audioData)
        : Buffer.isBuffer(payload.audioData)
          ? payload.audioData
          : Buffer.from(payload.audioData);

    await fs.writeFile(plainPath, buf);

    try {
      inputAudioPath = plainPath;
    } catch (e) {
      // se algo der errado, tenta apagar e re-throw
      try {
        await fs.unlink(plainPath);
      } catch {}
      throw e;
    }
  }

  if (!inputAudioPath) {
    throw new Error("Missing audioPath/audioData in transcription:enqueue payload.");
  }

  // 2) Pipeline de privacidade: salva criptografado e cria temp para worker
  const encryptedPath = await audioService.saveEncrypted(inputAudioPath, key);

  // se input era temporário em claro criado aqui, tenta remover
  if (!payload?.audioPath && inputAudioPath.includes(app.getPath("userData"))) {
    try {
      await fs.unlink(inputAudioPath);
    } catch {
      // ignore
    }
  }

  const tempPath = await audioService.decryptToTemp(encryptedPath, key);

  // 3) Cria job no DB
  const jobId = randomUUID();
  const nowIso = new Date().toISOString();

  const job = {
    id: jobId,
    sessionId: payload.sessionId,
    audioPath: encryptedPath, // store encrypted path
    model: payload.model,
    status: "queued" as const,
    progress: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  transcriptionJobsService.create(job);

  // 4) Enfileira no worker (passa tempPath para processamento)
  workerProcess?.stdin.write(
    `${JSON.stringify({
      type: "enqueue",
      payload: {
        ...payload,
        audioPath: tempPath,
        jobId,
      },
    })}\n`
  );

  return jobId;
});

// Privacy / purge
ipcMain.handle("privacy:purge", () => {
  requireNotSafeMode();
  return privacyService.purgeAll();
});

// ---------------------
// Financial IPC (V1)
// ---------------------
ipcMain.handle("financial:getAll", () => {
  requireNotSafeMode();
  return financialService.getAll();
});
ipcMain.handle("financial:getByPatient", (_e, patientId) => {
  requireNotSafeMode();
  return financialService.getByPatient(patientId);
});
ipcMain.handle("financial:create", (_e, entry) => {
  requireNotSafeMode();
  return financialService.create(entry);
});

// ---------------------
// Forms IPC (V1)
// ---------------------
ipcMain.handle("forms:getTemplates", () => {
  requireNotSafeMode();
  return formsService.getTemplates();
});
ipcMain.handle("forms:getResponses", (_e, patientId) => {
  requireNotSafeMode();
  return formsService.getResponses(patientId);
});
ipcMain.handle("forms:submitResponse", (_e, response) => {
  requireNotSafeMode();
  return formsService.submitResponse(response);
});

// ---------------------
// GenAI IPC (V1)
// ---------------------
ipcMain.handle("genai:transformNote", (_e, payload) => {
  requireNotSafeMode();
  return genaiService.transformNote(payload);
});
ipcMain.handle("genai:generateRecibo", (_e, payload) => {
  requireNotSafeMode();
  return genaiService.generateRecibo(payload);
});

// ---------------------
// Backup IPC (V1)
// ---------------------
ipcMain.handle("backup:create", (_e, password) => {
  requireNotSafeMode();
  return backupService.create(password);
});
ipcMain.handle("backup:restore", (_e, password) => {
  requireNotSafeMode();
  return backupService.restore(password);
});

// ---------------------
// Export IPC
// ---------------------
ipcMain.handle("export:docx", async (_e, text, patientName) => {
  requireNotSafeMode();

  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `Prontuario-${patientName}.docx`,
    filters: [{ name: "Word Document", extensions: ["docx"] }],
  });
  if (filePath) await exportService.exportToDocx(text, filePath);
  return !!filePath;
});

ipcMain.handle("export:pdf", async (_e, text, patientName) => {
  requireNotSafeMode();

  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `Prontuario-${patientName}.pdf`,
    filters: [{ name: "PDF Document", extensions: ["pdf"] }],
  });
  if (filePath) await exportService.exportToPdf(text, filePath);
  return !!filePath;
});

// ---------------------
// Models IPC
// ---------------------
ipcMain.handle("models:getAvailable", () => {
  requireNotSafeMode();
  return modelService.getAvailableModels();
});
ipcMain.handle("models:getStatus", (_e, id) => {
  requireNotSafeMode();
  return modelService.getModelStatus(id);
});
ipcMain.handle("models:download", async (event, id) => {
  requireNotSafeMode();
  await modelService.downloadModel(id, (progress) => {
    event.sender.send("models:progress", { id, progress });
  });
  return true;
});
