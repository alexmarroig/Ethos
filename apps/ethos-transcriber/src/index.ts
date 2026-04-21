import { TranscriptionJob } from "@ethos/shared";
import { respond, jobEmitter } from "./events";
import { convertToWav, runFasterWhisper } from "./whisper";
import * as fs from "fs";

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
      await fs.promises.unlink(wavPath).catch(() => {});
    }

    // limpa arquivo original
    await fs.promises.unlink(job.audioPath).catch(() => {});

    jobEmitter.emit("next");
  }
};