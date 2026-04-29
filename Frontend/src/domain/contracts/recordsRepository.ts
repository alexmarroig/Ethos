import type { ApiResult } from "@/services/apiClient";
import type { ClinicalNote, ClinicalNoteContent } from "@/services/clinicalNoteService";

export interface RecordsRepository {
  create(sessionId: string, content: ClinicalNoteContent): Promise<ApiResult<ClinicalNote>>;
  listBySession(sessionId: string): Promise<ApiResult<ClinicalNote[]>>;
  getById(noteId: string): Promise<ApiResult<ClinicalNote>>;
  validate(noteId: string): Promise<ApiResult<ClinicalNote>>;
}
