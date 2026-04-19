"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrityService = void 0;
const db_1 = require("../db");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
exports.integrityService = {
    check: async () => {
        try {
            const db = (0, db_1.getDb)();
            // PRAGMA integrity_check
            const result = db.prepare('PRAGMA integrity_check').get();
            if (result.integrity_check !== 'ok') {
                return { ok: false, error: 'Database corruption detected' };
            }
            // Check vault folders
            const userDataPath = electron_1.app.getPath('userData');
            const vaultPath = node_path_1.default.join(userDataPath, 'vault');
            const audioPath = node_path_1.default.join(vaultPath, 'audio');
            if (!node_fs_1.default.existsSync(vaultPath))
                node_fs_1.default.mkdirSync(vaultPath);
            if (!node_fs_1.default.existsSync(audioPath))
                node_fs_1.default.mkdirSync(audioPath);
            return { ok: true };
        }
        catch (e) {
            return { ok: false, error: e.message };
        }
    }
};
