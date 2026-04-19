import { getDb } from '../db';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { Session } from '@ethos/shared';

const getVaultPath = () => {
  return path.join(app.getPath('userData'), 'vault');
};

const isSafePath = (base: string, target: string) => {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget.startsWith(resolvedBase);
};

export const privacyService = {
  purgeAll: (): void => {
    const db = getDb();

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM transcripts').run();
      db.prepare('DELETE FROM clinical_notes').run();
      db.prepare('DELETE FROM sessions').run();
      db.prepare('DELETE FROM patients').run();
      db.prepare('DELETE FROM transcription_jobs').run();
    });

    tx();

    const vaultPath = getVaultPath();

    if (!fs.existsSync(vaultPath)) return;

    const files = fs.readdirSync(vaultPath);

    for (const file of files) {
      // 🔐 nunca apagar o banco principal
      if (file === 'ethos.db') continue;

      const filePath = path.join(vaultPath, file);

      // 🔐 proteção contra path traversal
      if (!isSafePath(vaultPath, filePath)) continue;

      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('[privacy] Failed to delete file:', filePath);
      }
    }
  },

  setRetentionPolicy: (days: number): void => {
    const db = getDb();

    if (!days || days <= 0) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    const vaultPath = getVaultPath();

    const oldSessions = db.prepare(`
      SELECT id, audioId 
      FROM sessions 
      WHERE scheduledAt < ? AND audioId IS NOT NULL
    `).all(cutoffStr) as Pick<Session, 'id' | 'audioId'>[];

    for (const session of oldSessions) {
      if (!session.audioId) continue;

      const filePath = session.audioId;

      try {
        if (
          fs.existsSync(filePath) &&
          isSafePath(vaultPath, filePath)
        ) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.warn('[privacy] Failed to delete audio:', filePath);
      }

      db.prepare(`
        UPDATE sessions 
        SET audioId = NULL 
        WHERE id = ?
      `).run(session.id);
    }
  }
};