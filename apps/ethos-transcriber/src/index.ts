import { createInterface } from "node:readline";
import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import type { TranscriptionJob, TranscriptSegment } from "@ethos/shared";

type JobMessage =
  | { type: "enqueue"; payload: { sessionId: string; audioPath: string; model: "ptbr-fast" | "ptbr-accurate" } }
  | { type: "cancel"; payload: { jobId: string } }
  | { type: "status"; payload: { jobId: string } };

type JobUpdate = {
  type: "job_update";
  payload: TranscriptionJob;
};

type JobResult = {
  type: "job_result";
  payload: {
    jobId: string;
    transcript: {
      language: string;
      fullText: string;
      segments: TranscriptSegment[];
    };
  };
};

type JobError = {
  type: "job_error";
  payload: { jobId: string; error: string };
};

const jobEmitter = new EventEmitter();
const queue: TranscriptionJob[] = [];
const runningJobs = new Map<string, TranscriptionJob>();

const respond = (message: JobUpdate | JobResult | JobError) => {
  process.stdout.write(`${JSON.stringify(message)}\n`);
};

const generateId = () => crypto.randomUUID();

const resolveFfmpegPath = () => {
  if (process.env.ETHOS_FFMPEG_PATH) {
    return process.env.ETHOS_FFMPEG_PATH;
  }
  const localPath = path.resolve(__dirname, "../bin/ffmpeg/ffmpeg.exe");
  return localPath;
};

const resolvePythonPath = () => process.env.ETHOS_PYTHON_PATH ?? "python";

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
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed with code ${code}`));
      }
    });
  });
  return outputPath;
};

const runFasterWhisper = async (audioPath: string, model: "ptbr-fast" | "ptbr-accurate") => {
  const pythonPath = resolvePythonPath();
  const modelPath = resolveModelPath(model);
  const scriptPath = path.resolve(__dirname, "../scripts/whisper_transcribe.py");
  const outputPath = path.join(os.tmpdir(), `ethos-transcript-${crypto.randomUUID()}.json`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(pythonPath, [scriptPath, "--audio", audioPath, "--model", modelPath, "--output", outputPath]);
    proc.on("error", reject);
    proc.stderr.on("data", (data) => {
      process.stderr.write(data);
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`faster-whisper failed with code ${code}`));
      }
    });
  });

  const raw = await fs.readFile(outputPath, "utf-8");
  await fs.unlink(outputPath);
  return JSON.parse(raw) as { language: string; full_text: string; segments: TranscriptSegment[] };
};

const processJob = async (job: TranscriptionJob) => {
  runningJobs.set(job.id, job);
  respond({ type: "job_update", payload: job });

  try {
    job.status = "running";
    job.progress = 0.1;
    respond({ type: "job_update", payload: job });

    const wavPath = await convertToWav(job.audioPath);
    job.progress = 0.4;
    respond({ type: "job_update", payload: job });

    const result = await runFasterWhisper(wavPath, job.model);
    await fs.unlink(wavPath);

    job.status = "completed";
    job.progress = 1;
    respond({ type: "job_update", payload: job });
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
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Erro desconhecido";
    respond({ type: "job_update", payload: job });
    respond({
      type: "job_error",
      payload: { jobId: job.id, error: job.error ?? "Erro desconhecido" },
    });
  } finally {
    runningJobs.delete(job.id);
    jobEmitter.emit("next");
  }
};

const scheduleNext = () => {
  if (runningJobs.size > 0) {
    return;
  }
  const nextJob = queue.shift();
  if (!nextJob) {
    return;
  }
  void processJob(nextJob);
};

jobEmitter.on("next", scheduleNext);

const enqueueJob = (payload: JobMessage["payload"] & { sessionId: string; audioPath: string; model: "ptbr-fast" | "ptbr-accurate" }) => {
  const job: TranscriptionJob = {
    id: generateId(),
    sessionId: payload.sessionId,
    audioPath: payload.audioPath,
    model: payload.model,
    status: "queued",
    progress: 0,
  };
  queue.push(job);
  respond({ type: "job_update", payload: job });
  scheduleNext();
};

const cancelJob = (jobId: string) => {
  const queuedIndex = queue.findIndex((item) => item.id === jobId);
  if (queuedIndex >= 0) {
    const [job] = queue.splice(queuedIndex, 1);
    job.status = "cancelled";
    respond({ type: "job_update", payload: job });
    return;
  }
  const running = runningJobs.get(jobId);
  if (running) {
    running.status = "cancelled";
    respond({ type: "job_update", payload: running });
  }
};

const reportStatus = (jobId: string) => {
  const queued = queue.find((item) => item.id === jobId);
  if (queued) {
    respond({ type: "job_update", payload: queued });
    return;
  }
  const running = runningJobs.get(jobId);
  if (running) {
    respond({ type: "job_update", payload: running });
    return;
  }
  respond({ type: "job_error", payload: { jobId, error: "Job não encontrado" } });
};

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) {
    return;
  }
  try {
    const message = JSON.parse(line) as JobMessage;
    if (message.type === "enqueue") {
      enqueueJob(message.payload);
    } else if (message.type === "cancel") {
      cancelJob(message.payload.jobId);
    } else if (message.type === "status") {
      reportStatus(message.payload.jobId);
    }
  } catch (error) {
    process.stderr.write(`Invalid message: ${line}\n`);
    process.stderr.write(`${error}\n`);
  }
});
