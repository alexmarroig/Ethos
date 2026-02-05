import { getDb } from '../db';
import { TranscriptionJob } from '@ethos/shared';

export const transcriptionJobsService = {
  create: (job: TranscriptionJob): void => {
    const db = getDb();
    db.prepare(`
      INSERT INTO transcription_jobs (id, sessionId, audioPath, model, status, progress, error, createdAt, updatedAt)
      VALUES (@id, @sessionId, @audioPath, @model, @status, @progress, @error, @createdAt, @updatedAt)
    `).run(job);
  },

  update: (id: string, updates: Partial<TranscriptionJob>): void => {
    const db = getDb();
    const keys = Object.keys(updates);
    if (keys.length === 0) return;

    updates.updatedAt = new Date().toISOString();
    const setClause = keys.map(key => `${key} = @${key}`).join(', ');
    db.prepare(`UPDATE transcription_jobs SET ${setClause}, updatedAt = @updatedAt WHERE id = @id`).run({ ...updates, id });
  },

  getPending: (): TranscriptionJob[] => {
    const db = getDb();
    return db.prepare("SELECT * FROM transcription_jobs WHERE status IN ('queued', 'running', 'interrupted')").all() as TranscriptionJob[];
  }
};
