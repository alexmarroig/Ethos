import { getDb } from '../db';
import { ClinicalNote } from '@ethos/shared';
import { v4 as uuidv4 } from 'uuid';
import { sessionsService } from './sessions.service';

export const notesService = {
  getById: (id: string): ClinicalNote | undefined => {
    const db = getDb();
    return db.prepare('SELECT * FROM clinical_notes WHERE id = ?').get(id) as ClinicalNote | undefined;
  },

  getBySessionId: (sessionId: string): ClinicalNote | undefined => {
    const db = getDb();
    return db.prepare('SELECT * FROM clinical_notes WHERE sessionId = ? ORDER BY version DESC LIMIT 1').get(sessionId) as ClinicalNote | undefined;
  },

  createDraft: (sessionId: string, generatedText: string): ClinicalNote => {
    const db = getDb();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    // Check if there is already a note to increment version
    const existing = notesService.getBySessionId(sessionId);
    const version = existing ? existing.version + 1 : 1;

    const note: ClinicalNote = {
      id,
      sessionId,
      version,
      status: 'draft',
      generatedText,
      createdAt
    };

    db.prepare(`
      INSERT INTO clinical_notes (id, sessionId, version, status, generatedText, createdAt)
      VALUES (@id, @sessionId, @version, @status, @generatedText, @createdAt)
    `).run(note);

    // Update session with noteId
    sessionsService.update(sessionId, { noteId: id });

    return note;
  },

  upsertDraft: (sessionId: string, text: string): ClinicalNote => {
    const existing = notesService.getBySessionId(sessionId);
    if (existing) {
      if (existing.status === 'validated') {
        throw new Error('Cannot update a validated note');
      }
      notesService.updateDraft(existing.id, text);
      return { ...existing, editedText: text };
    } else {
      return notesService.createDraft(sessionId, text);
    }
  },

  updateDraft: (id: string, editedText: string): void => {
    const db = getDb();
    const note = notesService.getById(id);
    if (!note || note.status !== 'draft') {
      throw new Error('Only draft notes can be edited');
    }

    db.prepare('UPDATE clinical_notes SET editedText = ? WHERE id = ?').run(editedText, id);
  },

  validate: (id: string, validatedBy: string): void => {
    const db = getDb();
    const note = notesService.getById(id);
    if (!note) throw new Error('Note not found');
    if (note.status === 'validated') return;

    const validatedAt = new Date().toISOString();
    db.prepare(`
      UPDATE clinical_notes
      SET status = 'validated', validatedAt = ?, validatedBy = ?
      WHERE id = ?
    `).run(validatedAt, validatedBy, id);

    // Update session status to completed if not already
    sessionsService.update(note.sessionId, { status: 'completed' });
  }
};
