import { getDb } from '../db';
import { Session } from '@ethos/shared';
import { v4 as uuidv4 } from 'uuid';

export const sessionsService = {
  getAll: (): Session[] => {
    const db = getDb();
    return db.prepare('SELECT * FROM sessions ORDER BY scheduledAt DESC').all() as Session[];
  },

  getByPatientId: (patientId: string): Session[] => {
    const db = getDb();
    return db.prepare('SELECT * FROM sessions WHERE patientId = ? ORDER BY scheduledAt DESC').all(patientId) as Session[];
  },

  create: (session: Omit<Session, 'id'>): Session => {
    const db = getDb();
    const id = uuidv4();
    const newSession = { ...session, id };

    db.prepare(`
      INSERT INTO sessions (id, patientId, scheduledAt, status, audioId, transcriptId, noteId)
      VALUES (@id, @patientId, @scheduledAt, @status, @audioId, @transcriptId, @noteId)
    `).run(newSession);

    return newSession;
  },

  update: (id: string, updates: Partial<Session>): void => {
    const db = getDb();
    const keys = Object.keys(updates);
    if (keys.length === 0) return;

    const setClause = keys.map(key => `${key} = @${key}`).join(', ');
    db.prepare(`UPDATE sessions SET ${setClause} WHERE id = @id`).run({ ...updates, id });
  },

  delete: (id: string): void => {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }
};
