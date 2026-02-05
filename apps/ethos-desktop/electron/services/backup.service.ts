import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';
import Database from 'better-sqlite3-multiple-ciphers';
import { getVaultKey } from '../security';

export const backupService = {
  createBackup: async (targetPath: string, password: string): Promise<void> => {
    const userDataPath = app.getPath('userData');
    const vaultPath = path.join(userDataPath, 'vault');
    const dbPath = path.join(vaultPath, 'ethos.db');

    const vaultKey = getVaultKey();
    const backupDb = new Database(dbPath);
    backupDb.pragma(`key = '${vaultKey}'`);

    backupDb.prepare(`ATTACH DATABASE ? AS backup KEY ?`).run(targetPath, password);
    backupDb.prepare(`SELECT sqlcipher_export('backup')`).run();
    backupDb.prepare(`DETACH DATABASE backup`).run();
    backupDb.close();
  },

  restoreBackup: async (sourcePath: string, password: string): Promise<void> => {
    const userDataPath = app.getPath('userData');
    const vaultPath = path.join(userDataPath, 'vault');
    const dbPath = path.join(vaultPath, 'ethos.db');

    // Move current DB to backup
    if (fs.existsSync(dbPath)) {
        fs.renameSync(dbPath, `${dbPath}.bak`);
    }

    const vaultKey = getVaultKey();
    const restoreDb = new Database(sourcePath);
    restoreDb.pragma(`key = '${password}'`);

    restoreDb.prepare(`ATTACH DATABASE ? AS original KEY ?`).run(dbPath, vaultKey);
    restoreDb.prepare(`SELECT sqlcipher_export('original')`).run();
    restoreDb.prepare(`DETACH DATABASE original`).run();
    restoreDb.close();
  }
};
