import type { SessionsRepository } from "@/domain/contracts/sessionsRepository";
import { sessionService } from "@/services/sessionService";

export const httpSessionsRepository: SessionsRepository = {
  listPage: (filters, patients, requestOptions) => sessionService.listPage(filters, patients, requestOptions),
  list: (filters, patients, requestOptions) => sessionService.list(filters, patients, requestOptions),
  getById: (id) => sessionService.getById(id),
  create: (data) => sessionService.create(data),
  updateStatus: (id, status) => sessionService.updateStatus(id, status),
  update: (id, data) => sessionService.update(id, data),
  getTranscript: (id) => sessionService.getTranscript(id),
  getSuggestions: (weekStart, requestOptions) => sessionService.getSuggestions(weekStart, requestOptions),
  cancelSeries: (seriesId) => sessionService.cancelSeries(seriesId),
  updateSeries: (seriesId, data) => sessionService.updateSeries(seriesId, data),
  delete: (id) => sessionService.delete(id),
};
