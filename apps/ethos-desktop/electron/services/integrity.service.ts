import { getDb } from './db';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export const integrityService = {
  check: async () => {
    try {
      const db = getDb();
      // PRAGMA integrity_check
      const result = db.prepare('PRAGMA integrity_check').get() as any;
      if (result.integrity_check !== 'ok') {
        return { ok: false, error: 'Database corruption detected' };
      }

      // Check vault folders
      const userDataPath = app.getPath('userData');
      const vaultPath = path.join(userDataPath, 'vault');
      const audioPath = path.join(vaultPath, 'audio');

      if (!fs.existsSync(vaultPath)) fs.mkdirSync(vaultPath);
      if (!fs.existsSync(audioPath)) fs.mkdirSync(audioPath);

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }
};
