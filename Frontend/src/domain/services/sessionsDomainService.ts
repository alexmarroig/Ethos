import { getSessionsRepository } from "@/domain/repositories/sessionsRepository";
import type { ApiRequestOptions } from "@/services/apiClient";
import type { Patient } from "@/services/patientService";
import type { SessionFilters, Session } from "@/services/sessionService";

export const sessionsDomainService = {
  listPage: (filters?: SessionFilters, patients?: Patient[], requestOptions?: ApiRequestOptions) =>
    getSessionsRepository().listPage(filters, patients, requestOptions),
  list: (filters?: SessionFilters, patients?: Patient[], requestOptions?: ApiRequestOptions) =>
    getSessionsRepository().list(filters, patients, requestOptions),
  getById: (id: string) => getSessionsRepository().getById(id),
  create: (data: Parameters<ReturnType<typeof getSessionsRepository>["create"]>[0]) =>
    getSessionsRepository().create(data),
  updateStatus: (id: string, status: Session["status"]) => getSessionsRepository().updateStatus(id, status),
  update: (id: string, data: Parameters<ReturnType<typeof getSessionsRepository>["update"]>[1]) =>
    getSessionsRepository().update(id, data),
  getTranscript: (id: string) => getSessionsRepository().getTranscript(id),
  getSuggestions: (weekStart: string, requestOptions?: ApiRequestOptions) =>
    getSessionsRepository().getSuggestions(weekStart, requestOptions),
  cancelSeries: (seriesId: string) => getSessionsRepository().cancelSeries(seriesId),
  updateSeries: (seriesId: string, data: Parameters<ReturnType<typeof getSessionsRepository>["updateSeries"]>[1]) =>
    getSessionsRepository().updateSeries(seriesId, data),
  delete: (id: string) => getSessionsRepository().delete(id),
};
