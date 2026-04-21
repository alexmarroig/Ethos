import { TranscriptionJob } from "@ethos/shared";
import { promises as fs } from "node:fs";
import { EventEmitter } from "node:events";

// These are provided by the transcriber runtime or defined elsewhere
declare const jobEmitter: EventEmitter;
declare function respond(msg: any): void;
declare function convertToWav(audioPath: string): Promise<string>;
declare function runFasterWhisper(job: TranscriptionJob, wavPath: string): Promise<any>;

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
    // limpa wav temporário
    if (wavPath) {
      await fs.unlink(wavPath).catch(() => {});
    }

    // limpa arquivo original
    await fs.unlink(job.audioPath).catch(() => {});

    jobEmitter.emit("next");
  }
};
