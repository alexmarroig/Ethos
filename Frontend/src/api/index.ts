// ETHOS API — barrel export

// Typed SDK for endpoints not in legacy services
export {
  contractsApi,
  documentsApi,
  notificationsApi,
  retentionApi,
  casesApi,
  privateCommentsApi,
  exportApi,
  adminLocalApi,
  webhooksApi,
  localEntitlementsApi,
  jobsApi,
} from "./clinical";

// All types
export type * from "./types";

// Re-export existing services for convenience
export { authService } from "@/services/authService";
export { sessionService } from "@/services/sessionService";
export { patientService } from "@/services/patientService";
export { clinicalNoteService } from "@/services/clinicalNoteService";
export { audioService } from "@/services/audioService";
export { exportService } from "@/services/exportService";
export { reportService } from "@/services/reportService";
export { scaleService } from "@/services/scaleService";
export { formService } from "@/services/formService";
export { anamnesisService } from "@/services/anamnesisService";
export { financeService } from "@/services/financeService";
export { backupService } from "@/services/backupService";
export { aiService } from "@/services/aiService";
export { patientPortalService } from "@/services/patientPortalService";
