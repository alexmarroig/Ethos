import { getDb } from '../db';
import Database from 'better-sqlite3-multiple-ciphers';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

// Se você já tem isso em outro lugar, remova daqui.
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// Opcional: evita quebrar PRAGMA key quando precisar usar string.
// Ideal mesmo é evitar PRAGMA interpolado e preferir ATTACH ... KEY ?.
function escapeSqliteString(value: string) {
  return value.replace(/'/g, "''");
}

export const backupService = {
  /**
   * Cria um arquivo de backup criptografado (SQLCipher) em Documents.
   * Retorna o caminho do arquivo criado (melhor do que "true").
   */
  create: async (password: string): Promise<{ ok: true; backupPath: string }> => {
    const db = getDb(); // DB original (aberto)
    const backupPath = path.join(
      app.getPath('documents'),
      `ethos_backup_${Date.now()}.db`
    );

    // Garantir que não existe arquivo no caminho (raro, mas né)
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);

    // IMPORTANTE: ATTACH deve rodar no DB original.
    // E o KEY idealmente vai via placeholder.
    try {
      db.prepare(`ATTACH DATABASE ? AS backup KEY ?`).run(backupPath, password);
      db.prepare(`SELECT sqlcipher_export('backup')`).run();
      db.prepare(`DETACH DATABASE backup`).run();
      return { ok: true, backupPath };
    } catch (err) {
      // Se falhar, limpa arquivo incompleto pra não deixar “lixo”
      try {
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
      } catch {}
      throw err;
    }
  },

  /**
   * Restaura um backup (criptografado com "password") para o DB oficial (criptografado com vaultKey).
   * Faz backup do DB atual para ethos.db.bak antes.
   */
  restoreBackup: async (sourcePath: string, password: string): Promise<void> => {
    const userDataPath = app.getPath('userData');
    const vaultPath = path.join(userDataPath, 'vault');
    const dbPath = path.join(vaultPath, 'ethos.db');
    ensureDir(vaultPath);

    // Move DB atual para .bak
    if (fs.existsSync(dbPath)) {
      const bak = `${dbPath}.bak`;
      // sobrescreve .bak antigo, se existir
      if (fs.existsSync(bak)) fs.unlinkSync(bak);
      fs.renameSync(dbPath, bak);
    }

    const vaultKey = getVaultKey(); // você já tem isso no original

    const restoreDb = new Database(sourcePath);
    try {
      // Aqui PRAGMA key normalmente precisa ser string. Se não aceitar placeholder:
      restoreDb.pragma(`key = '${escapeSqliteString(password)}'`);

      // Opcional: valida que a senha abriu mesmo o DB
      // (se a senha estiver errada, muitas vezes o erro estoura num SELECT simples)
      restoreDb.prepare('SELECT count(*) FROM sqlite_master').get();

      // Anexa o DB de destino (novo ethos.db) com a vaultKey do app
      restoreDb.prepare(`ATTACH DATABASE ? AS original KEY ?`).run(dbPath, vaultKey);
      restoreDb.prepare(`SELECT sqlcipher_export('original')`).run();
      restoreDb.prepare(`DETACH DATABASE original`).run();
    } catch (err) {
      // Se falhar, tenta reverter o .bak de volta
      try {
        const bak = `${dbPath}.bak`;
        if (!fs.existsSync(dbPath) && fs.existsSync(bak)) {
          fs.renameSync(bak, dbPath);
        }
      } catch {}
      throw err;
    } finally {
      restoreDb.close();
    }
  }
};
