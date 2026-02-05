import { createInterface } from "node:readline";
import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import type { TranscriptionJob, TranscriptSegment, IPCMessage } from "@ethos/shared";

const jobEmitter = new EventEmitter();
const queue: (TranscriptionJob & { audioPath: string })[] = [];
const runningJobs = new Map<string, ReturnType<typeof spawn>>();

const respond = (message: IPCMessage) => {
  process.stdout.write(`${JSON.stringify(message)}\n`);
};

const resolveFfmpegPath = () => {
  if (process.env.ETHOS_FFMPEG_PATH) return process.env.ETHOS_FFMPEG_PATH;
  // Fallback for Linux environment
  return process.platform === "win32"
    ? path.resolve(__dirname, "../bin/ffmpeg/ffmpeg.exe")
    : "ffmpeg";
};

const resolvePythonPath = () => process.env.ETHOS_PYTHON_PATH ?? "python3";

const resolveModelPath = (model: "ptbr-fast" | "ptbr-accurate") => {
  const modelsRoot = process.env.ETHOS_MODELS_PATH ?? path.resolve(__dirname, "../models");
  if (model === "ptbr-accurate") {
    return path.join(modelsRoot, "distil-whisper-large-v3-ptbr-ct2");
  }
  return path.join(modelsRoot, "large-v3-ct2");
};

const convertToWav = async (inputPath: string) => {
  const ffmpegPath = resolveFfmpegPath();
  const outputPath = path.join(os.tmpdir(), `ethos-${crypto.randomUUID()}.wav`);
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegPath, [
      "-y",
      "-i",
      inputPath,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-vn",
      outputPath,
    ]);
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failed with code ${code}`));
    });
  });
  return outputPath;
};

const runFasterWhisper = async (job: TranscriptionJob, audioPath: string) => {
  const pythonPath = resolvePythonPath();
  const modelPath = resolveModelPath(job.model);
  const scriptPath = path.resolve(__dirname, "../scripts/whisper_transcribe.py");
  const outputPath = path.join(os.tmpdir(), `ethos-transcript-${crypto.randomUUID()}.json`);

  const proc = spawn(pythonPath, [
    scriptPath,
    "--audio", audioPath,
    "--model", modelPath,
    "--output", outputPath
  ]);

  runningJobs.set(job.id, proc);

  return new Promise<{ language: string; full_text: string; segments: TranscriptSegment[] }>((resolve, reject) => {
    proc.on("error", reject);
    proc.stderr.on("data", (data) => {
      // Potentially parse progress from stderr
      process.stderr.write(data);
    });
    proc.on("close", async (code) => {
      runningJobs.delete(job.id);
      if (code === 0) {
        try {
          const raw = await fs.readFile(outputPath, "utf-8");
          await fs.unlink(outputPath);
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error(`faster-whisper failed with code ${code}`));
      }
    });
  });
};

const processJob = async (job: TranscriptionJob & { audioPath: string }) => {
  respond({ type: "job_update", payload: { ...job, status: "running", progress: 0.1 } });

  let wavPath: string | null = null;
  try {
    wavPath = await convertToWav(job.audioPath);
    respond({ type: "job_update", payload: { ...job, status: "running", progress: 0.3 } });

    const result = await runFasterWhisper(job, wavPath);

    respond({
      type: "job_result",
      payload: {
        jobId: job.id,
        transcript: {
          language: result.language,
          fullText: result.full_text,
          segments: result.segments,
        },
      },
    });

    respond({ type: "job_update", payload: { ...job, status: "completed", progress: 1 } });
  } catch (error: any) {
    if (error.message === "cancelled") {
        respond({ type: "job_update", payload: { ...job, status: "cancelled" } });
    } else {
        respond({ type: "job_update", payload: { ...job, status: "failed", error: error.message } });
    }
  } finally {
    if (wavPath && fs.stat(wavPath).then(() => true).catch(() => false)) {
        await fs.unlink(wavPath).catch(() => {});
    }
    // Delete the input temp audio file sent by main process
    await fs.unlink(job.audioPath).catch(() => {});

    jobEmitter.emit("next");
  }
};

const scheduleNext = () => {
  if (runningJobs.size > 0) return;
  const nextJob = queue.shift();
  if (nextJob) void processJob(nextJob);
};

jobEmitter.on("next", scheduleNext);

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  try {
    const message = JSON.parse(line);
    if (message.type === "enqueue") {
      const job: TranscriptionJob & { audioPath: string } = {
        ...message.payload,
        status: "queued",
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queue.push(job);
      respond({ type: "job_update", payload: job });
      scheduleNext();
    } else if (message.type === "cancel") {
      const jobId = message.payload.jobId;
      const running = runningJobs.get(jobId);
      if (running) {
        running.kill();
        runningJobs.delete(jobId);
      } else {
        const idx = queue.findIndex(j => j.id === jobId);
        if (idx !== -1) queue.splice(idx, 1);
      }
    }
  } catch (e) {
    console.error("Worker error parsing line", e);
  }
});
