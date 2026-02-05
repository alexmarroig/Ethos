import { getDb } from '../db';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { Session } from '@ethos/shared';

export const privacyService = {
  purgeAll: (): void => {
    const db = getDb();

    // Delete all files in vault except the DB itself?
    // Actually, it's safer to delete records and then files.

    db.prepare('DELETE FROM transcripts').run();
    db.prepare('DELETE FROM clinical_notes').run();
    db.prepare('DELETE FROM sessions').run();
    db.prepare('DELETE FROM patients').run();
    db.prepare('DELETE FROM transcription_jobs').run();

    const vaultPath = path.join(app.getPath('userData'), 'vault');
    const files = fs.readdirSync(vaultPath);
    for (const file of files) {
      if (file !== 'ethos.db') {
        fs.unlinkSync(path.join(vaultPath, file));
      }
    }
  },

  setRetentionPolicy: (days: number): void => {
    const db = getDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    const oldSessions = db.prepare("SELECT * FROM sessions WHERE scheduledAt < ? AND audioId IS NOT NULL").all(cutoffStr) as Session[];

    for (const session of oldSessions) {
        if (session.audioId) {
            if (fs.existsSync(session.audioId)) {
                fs.unlinkSync(session.audioId);
            }
            db.prepare("UPDATE sessions SET audioId = NULL WHERE id = ?").run(session.id);
        }
    }
  }
};
