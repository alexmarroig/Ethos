// ETHOS Job Manager
// Centralized lifecycle for async jobs (transcribe, export, backup, etc.)

import { useAppStore, type PendingJob } from "@/stores/appStore";
import { jobsApi } from "@/api/clinical";

export type JobType = PendingJob["type"];

interface StartJobOptions {
  type: JobType;
  sessionId?: string;
  label?: string;
}

/**
 * Start an async job: call startFn to get a job_id, persist it, and begin polling.
 */
export async function startJob(
  opts: StartJobOptions,
  startFn: () => Promise<{ success: boolean; data?: { job_id?: string }; error?: { message: string } }>
): Promise<string | null> {
  const result = await startFn();
  if (!result.success || !result.data?.job_id) {
    return null;
  }

  const jobId = result.data.job_id;

  const job: PendingJob = {
    id: jobId,
    type: opts.type,
    status: "pending",
    sessionId: opts.sessionId || "",
  };

  useAppStore.getState().addJob(job);
  beginPolling(jobId);
  return jobId;
}

/**
 * Begin polling a job until it reaches a terminal state.
 */
export function beginPolling(jobId: string) {
  const { updateJob } = useAppStore.getState();

  const check = async () => {
    const res = await jobsApi.get(jobId);
    if (!res.success) {
      updateJob(jobId, { status: "failed", error: res.error.message });
      return;
    }

    const job = res.data;
    const normalizedStatus = normalizeStatus(job.status);

    if (normalizedStatus === "completed") {
      updateJob(jobId, {
        status: "completed",
        result: typeof job.result === "string" ? job.result : JSON.stringify(job.result || ""),
      });
    } else if (normalizedStatus === "failed") {
      updateJob(jobId, { status: "failed", error: job.error || "Falha no processamento" });
    } else {
      updateJob(jobId, { status: normalizedStatus as PendingJob["status"] });
      setTimeout(check, 2500);
    }
  };

  setTimeout(check, 1500);
}

/**
 * Re-hydrate all pending/processing jobs on app boot (continue polling).
 */
export function rehydrateJobs() {
  const { pendingJobs } = useAppStore.getState();
  const active = pendingJobs.filter(
    (j) => j.status !== "completed" && j.status !== "failed"
  );
  for (const job of active) {
    beginPolling(job.id);
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function normalizeStatus(
  s: string
): "pending" | "processing" | "completed" | "failed" {
  switch (s) {
    case "queued":
    case "pending":
      return "pending";
    case "running":
    case "processing":
      return "processing";
    case "succeeded":
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "processing";
  }
}
