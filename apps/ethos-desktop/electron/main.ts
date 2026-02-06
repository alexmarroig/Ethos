import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

type RecordingSession = {
  filePath: string;
  stream: fs.WriteStream;
  mimeType: string;
};

let mainWindow: BrowserWindow | null = null;
let workerProcess: ReturnType<typeof spawn> | null = null;
const recordingSessions = new Map<string, RecordingSession>();

const getRecordingExtension = (mimeType: string) => {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "bin";
};

const waitForDrain = (stream: fs.WriteStream) =>
  new Promise<void>((resolve, reject) => {
    stream.once("drain", resolve);
    stream.once("error", reject);
  });

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../src/index.html"));
};

const startWorker = () => {
  if (workerProcess) {
    return;
  }
  const workerPath = path.resolve(__dirname, "../../ethos-transcriber/dist/index.js");
  workerProcess = spawn(process.execPath, [workerPath]);
  workerProcess.stdout.on("data", (data) => {
    mainWindow?.webContents.send("transcription:message", data.toString());
  });
  workerProcess.stderr.on("data", (data) => {
    mainWindow?.webContents.send("transcription:stderr", data.toString());
  });
};

app.whenReady().then(() => {
  createWindow();
  startWorker();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("dialog:openAudio", async () => {
  if (!mainWindow) {
    return null;
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "Audio", extensions: ["wav", "mp3", "m4a", "ogg"] }],
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle("transcription:enqueue", async (_event, payload) => {
  if (!workerProcess) {
    startWorker();
  }
  const jobId = randomUUID();
  workerProcess?.stdin.write(
    `${JSON.stringify({ type: "enqueue", payload: { ...payload, jobId } })}\n`
  );
  return jobId;
});

ipcMain.handle("audio:startSession", async (_event, payload: { sessionId?: string; mimeType: string }) => {
  const recordingId = randomUUID();
  const recordingsDir = path.join(app.getPath("userData"), "recordings");
  await fs.promises.mkdir(recordingsDir, { recursive: true });
  const extension = getRecordingExtension(payload.mimeType);
  const filePath = path.join(recordingsDir, `${payload.sessionId ?? recordingId}.${extension}`);
  const stream = fs.createWriteStream(filePath, { flags: "w" });
  recordingSessions.set(recordingId, { filePath, stream, mimeType: payload.mimeType });
  return { recordingId, filePath };
});

ipcMain.handle("audio:appendChunk", async (_event, payload: { recordingId: string; data: ArrayBuffer }) => {
  const session = recordingSessions.get(payload.recordingId);
  if (!session) {
    throw new Error("Recording session not found");
  }
  const buffer = Buffer.from(new Uint8Array(payload.data));
  if (!session.stream.write(buffer)) {
    await waitForDrain(session.stream);
  }
  return { ok: true };
});

ipcMain.handle("audio:finishSession", async (_event, payload: { recordingId: string }) => {
  const session = recordingSessions.get(payload.recordingId);
  if (!session) {
    throw new Error("Recording session not found");
  }
  await new Promise<void>((resolve, reject) => {
    session.stream.end(() => resolve());
    session.stream.once("error", reject);
  });
  recordingSessions.delete(payload.recordingId);
  return { filePath: session.filePath };
});

ipcMain.handle("audio:abortSession", async (_event, payload: { recordingId: string }) => {
  const session = recordingSessions.get(payload.recordingId);
  if (!session) {
    return { ok: false };
  }
  session.stream.destroy();
  await fs.promises.unlink(session.filePath).catch(() => undefined);
  recordingSessions.delete(payload.recordingId);
  return { ok: true };
});
