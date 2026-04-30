import type { ApiRequestOptions, ApiResult } from "@/services/apiClient";
import type {
  CalendarSuggestion,
  PaginatedData,
  RecurrenceRule,
  Session,
  SessionFilters,
  SessionTranscript,
} from "@/services/sessionService";
import type { Patient } from "@/services/patientService";

export interface SessionsRepository {
  listPage(filters?: SessionFilters, patients?: Patient[], requestOptions?: ApiRequestOptions): Promise<ApiResult<PaginatedData<Session>>>;
  list(filters?: SessionFilters, patients?: Patient[], requestOptions?: ApiRequestOptions): Promise<ApiResult<Session[]>>;
  getById(id: string): Promise<ApiResult<Session>>;
  create(data: {
    patient_id: string;
    scheduled_at: string;
    duration_minutes?: number;
    recurrence?: RecurrenceRule;
    event_type?: "session" | "block" | "other";
    block_title?: string;
    location_type?: "remote" | "presencial";
  }): Promise<ApiResult<Session>>;
  updateStatus(id: string, status: Session["status"]): Promise<ApiResult<Session>>;
  update(id: string, data: Partial<{
    patient_id: string;
    scheduled_at: string;
    duration_minutes?: number;
    location_type?: "remote" | "presencial";
  }>): Promise<ApiResult<Session>>;
  getTranscript(id: string): Promise<ApiResult<SessionTranscript>>;
  getSuggestions(weekStart: string, requestOptions?: ApiRequestOptions): Promise<ApiResult<CalendarSuggestion[]>>;
  cancelSeries(seriesId: string): Promise<ApiResult<{ cancelled: number }>>;
  updateSeries(seriesId: string, data: {
    time?: string;
    duration_minutes?: number;
    location_type?: "remote" | "presencial";
  }): Promise<ApiResult<{ updated: number }>>;
  delete(id: string): Promise<ApiResult<{ deleted: boolean }>>;
}
