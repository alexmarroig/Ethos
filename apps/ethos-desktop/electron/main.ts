import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

import { initDb, getDb } from "./db";
import { getVaultKey } from "./security";

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

let mainWindow: BrowserWindow | null = null;
let isSafeMode = false;

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

    // tenta JSON; se falhar, manda texto cru mas marcado
    try {
      const msg = JSON.parse(line);

      // Persist job update (mantém sua lógica)
      if (msg?.type === "job_update" && msg?.payload?.id) {
        try {
          transcriptionJobsService.update(msg.payload.id, {
            status: msg.payload.status,
            progress: msg.payload.progress,
            error: msg.payload.error,
          });
        } catch (e) {
          // DB pode estar em safe mode; não derruba o app
        }
      }

      sendToRenderer(WORKER_CHANNEL_MESSAGE, msg);
    } catch {
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

async function boot() {
  const key = getVaultKey();

  try {
    initDb(key);

    const integrity = await integrityService.check();
    if (!integrity.ok) throw new Error(integrity.error);

    // Recover jobs “running” -> “interrupted”
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

app.on("before-quit", () => {
  stopWorker();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("app:isSafeMode", () => isSafeMode);

// =========================
// Dialog / Audio helpers
// =========================
ipcMain.handle("dialog:openAudio", async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "Audio", extensions: ["wav", "mp3", "m4a", "ogg", "flac", "webm"] }],
  });

  return result.canceled ? null : result.filePaths[0];
});

/**
 * NOVO (do seu Código 1): salvar áudio vindo do renderer (gravação).
 * Isso devolve um filePath local (no userData).
 *
 * payload:
 *  - data: ArrayBuffer
 *  - mimeType: "audio/webm" etc
 */
ipcMain.handle("audio:save", async (_event, payload: { data: ArrayBuffer; mimeType: string }) => {
  if (!mainWindow) return null;

  const mime = payload.mimeType || "audio/webm";
  const ext = (mime.split("/")[1] || "webm").replace(/[^\w]/g, "") || "webm";

  const fileName = `ethos-audio-${Date.now()}-${randomUUID()}.${ext}`;
  const filePath = path.join(app.getPath("userData"), fileName);

  const buffer = Buffer.from(payload.data);
  await fs.writeFile(filePath, buffer);

  return { filePath, mimeType: mime };
});

// =========================
// Patients IPC
// =========================
ipcMain.handle("patients:getAll", () => {
  if (isSafeMode) return [];
  return patientsService.getAll();
});
ipcMain.handle("patients:create", (_e, p) => patientsService.create(p));
ipcMain.handle("patients:delete", (_e, id) => patientsService.delete(id));

// =========================
// Sessions IPC
// =========================
ipcMain.handle("sessions:getAll", () => sessionsService.getAll());
ipcMain.handle("sessions:getByPatient", (_e, id) => sessionsService.getByPatientId(id));
ipcMain.handle("sessions:create", (_e, s) => sessionsService.create(s));

// =========================
// Notes IPC
// =========================
ipcMain.handle("notes:getBySession", (_e, id) => notesService.getBySessionId(id));

ipcMain.handle("notes:generate", (_e, sessionId, transcript) => {
  const session = sessionsService.getAll().find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found");

  const patient = patientsService.getById(session.patientId);
  if (!patient) throw new Error("Patient not found");

  const text = generationService.generateProntuario(transcript, patient, session);
  return notesService.upsertDraft(sessionId, text);
});

ipcMain.handle("notes:upsertDraft", (_e, sessionId, text) => notesService.upsertDraft(sessionId, text));
ipcMain.handle("notes:updateDraft", (_e, id, text) => notesService.updateDraft(id, text));
ipcMain.handle("notes:validate", (_e, id, by) => notesService.validate(id, by));

// =========================
// Audio & Transcription IPC
// =========================
/**
 * Mantém compatibilidade com seu payload atual:
 *  payload: { sessionId, audioPath, model, ... }
 *
 * E adiciona suporte opcional para áudio “gravado”:
 *  payload: { sessionId, audioData, mimeType, model, ... }
 * Onde audioData é ArrayBuffer (ou Buffer-like vindo do preload)
 */
ipcMain.handle("transcription:enqueue", async (_event, payload) => {
  if (!workerProcess) startWorker();

  const key = getVaultKey();

  // 1) Determina o áudio de entrada:
  // - se vier audioPath: usa ele
  // - se vier audioData: salva para arquivo e usa esse path
  let inputAudioPath: string | null = payload?.audioPath ?? null;

  if (!inputAudioPath && payload?.audioData) {
    const mime = payload?.mimeType || "audio/webm";
    const ext = (mime.split("/")[1] || "webm").replace(/[^\w]/g, "") || "webm";
    const fileName = `ethos-rec-${Date.now()}-${randomUUID()}.${ext}`;
    const filePath = path.join(app.getPath("userData"), fileName);

    // suporta ArrayBuffer ou Buffer
    const buf =
      payload.audioData instanceof ArrayBuffer
        ? Buffer.from(payload.audioData)
        : Buffer.isBuffer(payload.audioData)
          ? payload.audioData
          : Buffer.from(payload.audioData);

    await fs.writeFile(filePath, buf);
    inputAudioPath = filePath;
  }

  if (!inputAudioPath) {
    throw new Error("Missing audioPath/audioData in transcription:enqueue payload.");
  }

  // 2) Pipeline de privacidade: salva criptografado e cria temp para worker
  const encryptedPath = await audioService.saveEncrypted(inputAudioPath, key);
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
ipcMain.handle("privacy:purge", () => privacyService.purgeAll());

// =========================
// Export IPC
// =========================
ipcMain.handle("export:docx", async (_e, text, patientName) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `Prontuario-${patientName}.docx`,
    filters: [{ name: "Word Document", extensions: ["docx"] }],
  });
  if (filePath) await exportService.exportToDocx(text, filePath);
  return !!filePath;
});

ipcMain.handle("export:pdf", async (_e, text, patientName) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `Prontuario-${patientName}.pdf`,
    filters: [{ name: "PDF Document", extensions: ["pdf"] }],
  });
  if (filePath) await exportService.exportToPdf(text, filePath);
  return !!filePath;
});

// =========================
// Models IPC
// =========================
ipcMain.handle("models:getAvailable", () => modelService.getAvailableModels());
ipcMain.handle("models:getStatus", (_e, id) => modelService.getModelStatus(id));

ipcMain.handle("models:download", async (event, id) => {
  await modelService.downloadModel(id, (progress) => {
    event.sender.send("models:progress", { id, progress });
  });
  return true;
});
