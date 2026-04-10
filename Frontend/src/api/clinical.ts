// ETHOS Clinical Plane SDK — endpoints NOT already covered by existing services
// Existing services (sessionService, patientService, etc.) remain canonical.
// This module adds contracts, documents, notifications, retention, cases,
// private comments, export extras, admin local, webhooks, and local entitlements.

import { api, type ApiResult } from "@/services/apiClient";
import type {
  Contract,
  Document,
  DocumentTemplate,
  DocumentVersion,
  Notification,
  RetentionPolicy,
  AnonymizedCase,
  CaseCloseData,
  PrivateComment,
  Job,
  Entitlements,
  AdminMetrics,
  AuditEntry,
  ObservabilityAlert,
} from "./types";

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

const unwrapList = <T>(value: PaginatedResponse<T> | T[]) =>
  Array.isArray(value) ? value : value.items;

const mapTemplate = (template: DocumentTemplate): DocumentTemplate => ({
  ...template,
  name: template.name ?? template.title ?? "Template",
  template_body: template.template_body ?? template.html,
});

/* ------------------------------------------------------------------ */
/*  Contracts                                                          */
/* ------------------------------------------------------------------ */

export const contractsApi = {
  list: (): Promise<ApiResult<Contract[]>> =>
    api.get<Contract[]>("/contracts"),

  create: (data: Partial<Contract>): Promise<ApiResult<Contract>> =>
    api.post<Contract>("/contracts", data),

  send: (id: string): Promise<ApiResult<{ contract: Contract; portal_url: string | null }>> =>
    api.post<{ contract: Contract; portal_url: string | null }>(`/contracts/${id}/send`),

  exportContract: (id: string, format: "pdf" | "docx" = "pdf"): Promise<ApiResult<{ url: string }>> =>
    api.get<{ url: string }>(`/contracts/${id}/export?format=${format}`),

  // Portal (public — no auth needed)
  getPortal: (token: string): Promise<ApiResult<Contract>> =>
    api.get<Contract>(`/portal/contracts/${token}`),

  acceptPortal: (token: string, acceptedBy: string): Promise<ApiResult<Contract>> =>
    api.post<Contract>(`/portal/contracts/${token}/accept`, { accepted_by: acceptedBy }),
};

/* ------------------------------------------------------------------ */
/*  Documents & Templates                                              */
/* ------------------------------------------------------------------ */

export const documentsApi = {
  list: async (caseId?: string): Promise<ApiResult<Document[]>> => {
    const qs = caseId ? `?case_id=${caseId}` : "";
    const result = await api.get<PaginatedResponse<Document> | Document[]>(`/documents${qs}`);
    if (!result.success) return result;
    return {
      ...result,
      data: unwrapList(result.data),
    };
  },

  create: (data: Partial<Document>): Promise<ApiResult<Document>> =>
    api.post<Document>("/documents", data),

  listTemplates: async (): Promise<ApiResult<DocumentTemplate[]>> => {
    const result = await api.get<DocumentTemplate[]>("/document-templates");
    if (!result.success) return result;
    return {
      ...result,
      data: result.data.map(mapTemplate),
    };
  },

  createVersion: (
    docId: string,
    content: string,
    globalValues: Record<string, string> = {}
  ): Promise<ApiResult<DocumentVersion>> =>
    api.post<DocumentVersion>(`/documents/${docId}/versions`, { content, global_values: globalValues }),

  listVersions: (docId: string): Promise<ApiResult<DocumentVersion[]>> =>
    api.get<DocumentVersion[]>(`/documents/${docId}/versions`),

  renderTemplate: (templateId: string, variables: Record<string, string>): Promise<ApiResult<{ rendered: string }>> =>
    api.post<{ rendered: string }>("/templates/render", { template_id: templateId, variables }),
};

/* ------------------------------------------------------------------ */
/*  Notifications                                                      */
/* ------------------------------------------------------------------ */

export const notificationsApi = {
  list: (): Promise<ApiResult<Notification[]>> =>
    api.get<Notification[]>("/notifications"),

  markRead: (id: string): Promise<ApiResult<void>> =>
    api.patch<void>(`/notifications/${id}/read`),
};

/* ------------------------------------------------------------------ */
/*  Retention Policy                                                   */
/* ------------------------------------------------------------------ */

export const retentionApi = {
  get: (): Promise<ApiResult<RetentionPolicy>> =>
    api.get<RetentionPolicy>("/retention-policy"),

  update: (data: Partial<RetentionPolicy>): Promise<ApiResult<RetentionPolicy>> =>
    api.patch<RetentionPolicy>("/retention-policy", data),
};

/* ------------------------------------------------------------------ */
/*  Cases                                                              */
/* ------------------------------------------------------------------ */

export const casesApi = {
  close: (data: CaseCloseData): Promise<ApiResult<{ closed: boolean }>> =>
    api.post<{ closed: boolean }>("/cases/close", data),

  listAnonymized: (): Promise<ApiResult<AnonymizedCase[]>> =>
    api.get<AnonymizedCase[]>("/cases/anonymized"),

  createAnonymized: (data: { summary: string; tags?: string[] }): Promise<ApiResult<AnonymizedCase>> =>
    api.post<AnonymizedCase>("/cases/anonymized", data),
};

/* ------------------------------------------------------------------ */
/*  Private Comments (on Clinical Notes)                               */
/* ------------------------------------------------------------------ */

export const privateCommentsApi = {
  list: (noteId: string): Promise<ApiResult<PrivateComment[]>> =>
    api.get<PrivateComment[]>(`/clinical-notes/${noteId}/private-comments`),

  create: (noteId: string, content: string): Promise<ApiResult<PrivateComment>> =>
    api.post<PrivateComment>(`/clinical-notes/${noteId}/private-comments`, { content }),
};

/* ------------------------------------------------------------------ */
/*  Export extras                                                       */
/* ------------------------------------------------------------------ */

export const exportApi = {
  exportFull: (): Promise<ApiResult<Job>> =>
    api.post<Job>("/export/full"),

  exportCase: (caseId: string): Promise<ApiResult<Job>> =>
    api.post<Job>("/export/case", { case_id: caseId }),
};

/* ------------------------------------------------------------------ */
/*  Admin Local (metrics, audit, observability)                        */
/* ------------------------------------------------------------------ */

export const adminLocalApi = {
  getMetrics: (): Promise<ApiResult<AdminMetrics>> =>
    api.get<AdminMetrics>("/admin/metrics/overview"),

  getAudit: (): Promise<ApiResult<AuditEntry[]>> =>
    api.get<AuditEntry[]>("/admin/audit"),

  postPerformanceSamples: (data: unknown): Promise<ApiResult<void>> =>
    api.post<void>("/admin/observability/performance-samples", data),

  postErrorLogs: (data: unknown): Promise<ApiResult<void>> =>
    api.post<void>("/admin/observability/error-logs", data),

  postEvaluate: (data: unknown): Promise<ApiResult<void>> =>
    api.post<void>("/admin/observability/evaluate", data),

  getAlerts: (): Promise<ApiResult<ObservabilityAlert[]>> =>
    api.get<ObservabilityAlert[]>("/admin/observability/alerts"),
};

/* ------------------------------------------------------------------ */
/*  Webhooks                                                           */
/* ------------------------------------------------------------------ */

export const webhooksApi = {
  post: (data: unknown): Promise<ApiResult<void>> =>
    api.post<void>("/api/webhook", data),

  postTranscriber: (data: unknown): Promise<ApiResult<void>> =>
    api.post<void>("/webhooks/transcriber", data),
};

/* ------------------------------------------------------------------ */
/*  Local Entitlements                                                 */
/* ------------------------------------------------------------------ */

export const localEntitlementsApi = {
  get: (): Promise<ApiResult<Entitlements>> =>
    api.get<Entitlements>("/local/entitlements"),
};

/* ------------------------------------------------------------------ */
/*  Jobs (generic)                                                     */
/* ------------------------------------------------------------------ */

export const jobsApi = {
  get: (jobId: string): Promise<ApiResult<Job>> =>
    api.get<Job>(`/jobs/${jobId}`),
};
