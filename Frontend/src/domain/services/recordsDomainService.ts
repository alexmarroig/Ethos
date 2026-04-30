import { getRecordsRepository } from "@/domain/repositories/recordsRepository";
import type { ClinicalNoteContent } from "@/services/clinicalNoteService";

export const recordsDomainService = {
  create: (sessionId: string, content: ClinicalNoteContent) => getRecordsRepository().create(sessionId, content),
  listBySession: (sessionId: string) => getRecordsRepository().listBySession(sessionId),
  getById: (noteId: string) => getRecordsRepository().getById(noteId),
  validate: (noteId: string) => getRecordsRepository().validate(noteId),
};
