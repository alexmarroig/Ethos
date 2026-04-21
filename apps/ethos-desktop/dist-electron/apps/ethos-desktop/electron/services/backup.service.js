"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupService = void 0;
const db_1 = require("../db");
const security_1 = require("../security");
const better_sqlite3_multiple_ciphers_1 = __importDefault(require("better-sqlite3-multiple-ciphers"));
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
// Se você já tem isso em outro lugar, remova daqui.
function ensureDir(p) {
    if (!node_fs_1.default.existsSync(p))
        node_fs_1.default.mkdirSync(p, { recursive: true });
}
// Opcional: evita quebrar PRAGMA key quando precisar usar string.
// Ideal mesmo é evitar PRAGMA interpolado e preferir ATTACH ... KEY ?.
function escapeSqliteString(value) {
    return value.replace(/'/g, "''");
}
exports.backupService = {
    /**
     * Cria um arquivo de backup criptografado (SQLCipher).
     * Retorna o caminho do arquivo criado (melhor do que "true").
     */
    create: async (password, customPath) => {
        const db = (0, db_1.getDb)(); // DB original (aberto)
        const backupPath = customPath || node_path_1.default.join(electron_1.app.getPath('documents'), `ethos_backup_${Date.now()}.db`);
        // Garantir que não existe arquivo no caminho (raro, mas né)
        if (node_fs_1.default.existsSync(backupPath))
            node_fs_1.default.unlinkSync(backupPath);
        // IMPORTANTE: ATTACH deve rodar no DB original.
        // E o KEY idealmente vai via placeholder.
        try {
            db.prepare(`ATTACH DATABASE ? AS backup KEY ?`).run(backupPath, password);
            db.prepare(`SELECT sqlcipher_export('backup')`).run();
            db.prepare(`DETACH DATABASE backup`).run();
            return { ok: true, backupPath };
        }
        catch (err) {
            // Se falhar, limpa arquivo incompleto pra não deixar “lixo”
            try {
                if (node_fs_1.default.existsSync(backupPath))
                    node_fs_1.default.unlinkSync(backupPath);
            }
            catch { }
            throw err;
        }
    },
    /**
     * Restaura um backup (criptografado com "password") para o DB oficial (criptografado com vaultKey).
     * Faz backup do DB atual para ethos.db.bak antes.
     */
    restoreBackup: async (sourcePath, password) => {
        const userDataPath = electron_1.app.getPath('userData');
        const vaultPath = node_path_1.default.join(userDataPath, 'vault');
        const dbPath = node_path_1.default.join(vaultPath, 'ethos.db');
        ensureDir(vaultPath);
        // Move DB atual para .bak
        if (node_fs_1.default.existsSync(dbPath)) {
            const bak = `${dbPath}.bak`;
            // sobrescreve .bak antigo, se existir
            if (node_fs_1.default.existsSync(bak))
                node_fs_1.default.unlinkSync(bak);
            node_fs_1.default.renameSync(dbPath, bak);
        }
        const vaultKey = (0, security_1.getVaultKey)(); // você já tem isso no original
        const restoreDb = new better_sqlite3_multiple_ciphers_1.default(sourcePath);
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
        }
        catch (err) {
            // Se falhar, tenta reverter o .bak de volta
            try {
                const bak = `${dbPath}.bak`;
                if (!node_fs_1.default.existsSync(dbPath) && node_fs_1.default.existsSync(bak)) {
                    node_fs_1.default.renameSync(bak, dbPath);
                }
            }
            catch { }
            throw err;
        }
        finally {
            restoreDb.close();
        }
    }
};
