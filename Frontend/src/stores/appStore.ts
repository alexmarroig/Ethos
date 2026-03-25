import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ------------------------------------------------------------------ */
/*  Service connectivity                                               */
/* ------------------------------------------------------------------ */

export type ServiceStatus =
  | "checking"
  | "waking"
  | "online"
  | "cors_blocked"
  | "error"
  | "offline";

/* ------------------------------------------------------------------ */
/*  Jobs                                                               */
/* ------------------------------------------------------------------ */

export interface PendingJob {
  id: string;
  type: "transcription" | "export_pdf" | "export_docx" | "backup";
  status: "pending" | "processing" | "completed" | "failed";
  sessionId: string;
  result?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface AppState {
  // Jobs
  pendingJobs: PendingJob[];
  addJob: (job: PendingJob) => void;
  updateJob: (id: string, update: Partial<PendingJob>) => void;
  removeJob: (id: string) => void;

  // Connectivity — rich status
  clinicalStatus: ServiceStatus;
  controlStatus: ServiceStatus;
  setClinicalStatus: (s: ServiceStatus) => void;
  setControlStatus: (s: ServiceStatus) => void;

  // Connectivity — derived booleans (backward compat)
  clinicalOnline: boolean;
  controlOnline: boolean;
  setClinicalOnline: (v: boolean) => void;
  setControlOnline: (v: boolean) => void;

  // Selection
  selectedPatientId: string | null;
  selectedSessionId: string | null;
  setSelectedPatient: (id: string | null) => void;
  setSelectedSession: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Jobs
      pendingJobs: [],
      addJob: (job) =>
        set((s) => ({ pendingJobs: [...s.pendingJobs, job] })),
      updateJob: (id, update) =>
        set((s) => ({
          pendingJobs: s.pendingJobs.map((j) =>
            j.id === id ? { ...j, ...update } : j
          ),
        })),
      removeJob: (id) =>
        set((s) => ({
          pendingJobs: s.pendingJobs.filter((j) => j.id !== id),
        })),

      // Connectivity — rich status (initial = checking)
      clinicalStatus: "checking" as ServiceStatus,
      controlStatus: "checking" as ServiceStatus,
      setClinicalStatus: (s) =>
        set({ clinicalStatus: s, clinicalOnline: s === "online" }),
      setControlStatus: (s) =>
        set({ controlStatus: s, controlOnline: s === "online" }),

      // Connectivity — derived booleans kept for backward compat
      clinicalOnline: false,
      controlOnline: false,
      setClinicalOnline: (v) =>
        set({ clinicalOnline: v, clinicalStatus: v ? "online" : "error" }),
      setControlOnline: (v) =>
        set({ controlOnline: v, controlStatus: v ? "online" : "error" }),

      // Selection
      selectedPatientId: null,
      selectedSessionId: null,
      setSelectedPatient: (id) => set({ selectedPatientId: id }),
      setSelectedSession: (id) => set({ selectedSessionId: id }),
    }),
    {
      name: "ethos-app-store",
      partialize: (state) => ({
        pendingJobs: state.pendingJobs,
        selectedPatientId: state.selectedPatientId,
        selectedSessionId: state.selectedSessionId,
      }),
    }
  )
);

// Re-hydrate pending jobs using the new job manager
export { rehydrateJobs as rehydratePendingJobs } from "@/jobs/jobManager";
