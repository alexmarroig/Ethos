"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.privacyService = void 0;
const db_1 = require("../db");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
const getVaultPath = () => {
    return node_path_1.default.join(electron_1.app.getPath('userData'), 'vault');
};
const isSafePath = (base, target) => {
    const resolvedBase = node_path_1.default.resolve(base);
    const resolvedTarget = node_path_1.default.resolve(target);
    return resolvedTarget.startsWith(resolvedBase);
};
exports.privacyService = {
    purgeAll: () => {
        const db = (0, db_1.getDb)();
        const tx = db.transaction(() => {
            db.prepare('DELETE FROM transcripts').run();
            db.prepare('DELETE FROM clinical_notes').run();
            db.prepare('DELETE FROM sessions').run();
            db.prepare('DELETE FROM patients').run();
            db.prepare('DELETE FROM transcription_jobs').run();
        });
        tx();
        const vaultPath = getVaultPath();
        if (!node_fs_1.default.existsSync(vaultPath))
            return;
        const files = node_fs_1.default.readdirSync(vaultPath);
        for (const file of files) {
            // 🔐 nunca apagar o banco principal
            if (file === 'ethos.db')
                continue;
            const filePath = node_path_1.default.join(vaultPath, file);
            // 🔐 proteção contra path traversal
            if (!isSafePath(vaultPath, filePath))
                continue;
            try {
                node_fs_1.default.unlinkSync(filePath);
            }
            catch (err) {
                console.warn('[privacy] Failed to delete file:', filePath);
            }
        }
    },
    setRetentionPolicy: (days) => {
        const db = (0, db_1.getDb)();
        if (!days || days <= 0)
            return;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString();
        const vaultPath = getVaultPath();
        const oldSessions = db.prepare(`
      SELECT id, audioId 
      FROM sessions 
      WHERE scheduledAt < ? AND audioId IS NOT NULL
    `).all(cutoffStr);
        for (const session of oldSessions) {
            if (!session.audioId)
                continue;
            const filePath = session.audioId;
            try {
                if (node_fs_1.default.existsSync(filePath) &&
                    isSafePath(vaultPath, filePath)) {
                    node_fs_1.default.unlinkSync(filePath);
                }
            }
            catch (err) {
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
