import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { initDb } from "./db";
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

const createWindow = () => {
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
};

const startWorker = () => {
  if (workerProcess) {
    return;
  }
  const workerPath = path.resolve(__dirname, "../../ethos-transcriber/dist/index.js");
  workerProcess = spawn(process.execPath, [workerPath]);

  workerProcess.stdout.on("data", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "job_update") {
          transcriptionJobsService.update(msg.payload.id, {
              status: msg.payload.status,
              progress: msg.payload.progress,
              error: msg.payload.error
          });
      }

      mainWindow?.webContents.send("transcription:message", msg);
    } catch (e) {
      console.error("Failed to parse worker message", data.toString());
    }
  });

  workerProcess.stderr.on("data", (data) => {
    mainWindow?.webContents.send("transcription:stderr", data.toString());
  });

  workerProcess.on("exit", () => {
    workerProcess = null;
    console.log("Worker exited, restarting...");
    setTimeout(startWorker, 2000);
  });
};

app.whenReady().then(async () => {
  const key = getVaultKey();

  try {
    initDb(key);
    const integrity = await integrityService.check();
    if (!integrity.ok) throw new Error(integrity.error);

    // Recover jobs
    const db = getDb();
    db.prepare("UPDATE transcription_jobs SET status = 'interrupted' WHERE status = 'running'").run();

    startWorker();
  } catch (e) {
    console.error("Integrity check failed, entering Safe Mode", e);
    isSafeMode = true;
  }

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("app:isSafeMode", () => isSafeMode);

// Patients IPC
ipcMain.handle("patients:getAll", () => {
  if (isSafeMode) return [];
  return patientsService.getAll();
});
ipcMain.handle("patients:create", (_e, p) => patientsService.create(p));
ipcMain.handle("patients:delete", (_e, id) => patientsService.delete(id));

// Sessions IPC
ipcMain.handle("sessions:getAll", () => sessionsService.getAll());
ipcMain.handle("sessions:getByPatient", (_e, id) => sessionsService.getByPatientId(id));
ipcMain.handle("sessions:create", (_e, s) => sessionsService.create(s));

// Notes IPC
ipcMain.handle("notes:getBySession", (_e, id) => notesService.getBySessionId(id));
ipcMain.handle("notes:generate", (_e, sessionId, transcript) => {
    const session = sessionsService.getAll().find(s => s.id === sessionId);
    if (!session) throw new Error("Session not found");
    const patient = patientsService.getById(session.patientId);
    if (!patient) throw new Error("Patient not found");

    const text = generationService.generateProntuario(transcript, patient, session);
    return notesService.upsertDraft(sessionId, text);
});
ipcMain.handle("notes:upsertDraft", (_e, sessionId, text) => notesService.upsertDraft(sessionId, text));
ipcMain.handle("notes:updateDraft", (_e, id, text) => notesService.updateDraft(id, text));
ipcMain.handle("notes:validate", (_e, id, by) => notesService.validate(id, by));

// Audio & Transcription IPC
ipcMain.handle("dialog:openAudio", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "Audio", extensions: ["wav", "mp3", "m4a", "ogg", "flac"] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("transcription:enqueue", async (_event, payload) => {
  if (!workerProcess) startWorker();

  const key = getVaultKey();
  const encryptedPath = await audioService.saveEncrypted(payload.audioPath, key);
  const tempPath = await audioService.decryptToTemp(encryptedPath, key);

  const jobId = randomUUID();
  const job = {
    id: jobId,
    sessionId: payload.sessionId,
    audioPath: encryptedPath, // Store the ENCRYPTED path in DB
    model: payload.model,
    status: "queued" as const,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  transcriptionJobsService.create(job);

  workerProcess?.stdin.write(
    `${JSON.stringify({
      type: "enqueue",
      payload: { ...payload, audioPath: tempPath, jobId }
    })}\n`
  );
  return jobId;
});

ipcMain.handle("privacy:purge", () => privacyService.purgeAll());

// Export IPC
ipcMain.handle("export:docx", async (_e, text, patientName) => {
    const { filePath } = await dialog.showSaveDialog({
        defaultPath: `Prontuario-${patientName}.docx`,
        filters: [{ name: "Word Document", extensions: ["docx"] }]
    });
    if (filePath) await exportService.exportToDocx(text, filePath);
    return !!filePath;
});

ipcMain.handle("export:pdf", async (_e, text, patientName) => {
    const { filePath } = await dialog.showSaveDialog({
        defaultPath: `Prontuario-${patientName}.pdf`,
        filters: [{ name: "PDF Document", extensions: ["pdf"] }]
    });
    if (filePath) await exportService.exportToPdf(text, filePath);
    return !!filePath;
});

// Models IPC
ipcMain.handle("models:getAvailable", () => modelService.getAvailableModels());
ipcMain.handle("models:getStatus", (_e, id) => modelService.getModelStatus(id));
ipcMain.handle("models:download", async (event, id) => {
  await modelService.downloadModel(id, (progress) => {
    event.sender.send("models:progress", { id, progress });
  });
  return true;
});
