import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

let mainWindow: BrowserWindow | null = null;
let workerProcess: ReturnType<typeof spawn> | null = null;

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
