import type { RecordsRepository } from "@/domain/contracts/recordsRepository";
import { clinicalNoteService } from "@/services/clinicalNoteService";

export const httpRecordsRepository: RecordsRepository = {
  create: (sessionId, content) => clinicalNoteService.create(sessionId, content),
  listBySession: (sessionId) => clinicalNoteService.listBySession(sessionId),
  getById: (noteId) => clinicalNoteService.getById(noteId),
  validate: (noteId) => clinicalNoteService.validate(noteId),
};
