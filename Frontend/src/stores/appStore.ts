import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session } from "@/services/sessionService";

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

  // Privacy mode
  privacyMode: boolean;
  togglePrivacyMode: () => void;

  // Sessions global cache (shared across pages for instant sync)
  sessionCache: Session[];
  sessionCacheAt: number; // timestamp of last full fetch
  setSessionCache: (sessions: Session[]) => void;
  upsertSession: (session: Session) => void;
  removeSession: (id: string) => void;
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

      // Privacy mode
      privacyMode: false,
      togglePrivacyMode: () => set((s) => ({ privacyMode: !s.privacyMode })),

      // Sessions global cache
      sessionCache: [],
      sessionCacheAt: 0,
      setSessionCache: (sessions) =>
        set({ sessionCache: sessions, sessionCacheAt: Date.now() }),
      upsertSession: (session) =>
        set((s) => {
          const exists = s.sessionCache.some((x) => x.id === session.id);
          return {
            sessionCache: exists
              ? s.sessionCache.map((x) => (x.id === session.id ? session : x))
              : [...s.sessionCache, session],
          };
        }),
      removeSession: (id) =>
        set((s) => ({ sessionCache: s.sessionCache.filter((x) => x.id !== id) })),
    }),
    {
      name: "ethos-app-store",
      partialize: (state) => ({
        pendingJobs: state.pendingJobs,
        selectedPatientId: state.selectedPatientId,
        selectedSessionId: state.selectedSessionId,
        privacyMode: state.privacyMode,
        // sessionCache is intentionally NOT persisted — always fresh from API
      }),
    }
  )
);

// Re-hydrate pending jobs using the new job manager
export { rehydrateJobs as rehydratePendingJobs } from "@/jobs/jobManager";
