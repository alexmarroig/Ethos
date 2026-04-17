"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notesService = void 0;
const db_1 = require("../db");
const uuid_1 = require("uuid");
const sessions_service_1 = require("./sessions.service");
const node_crypto_1 = __importDefault(require("node:crypto"));
const ALGO = 'aes-256-gcm';
function encrypt(text, key) {
    const iv = node_crypto_1.default.randomBytes(12);
    const cipher = node_crypto_1.default.createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
        iv: iv.toString('hex'),
        data: encrypted.toString('hex'),
        tag: tag.toString('hex')
    });
}
function decrypt(payload, key) {
    try {
        const parsed = JSON.parse(payload);
        if (!parsed.iv)
            return payload; // fallback legacy
        const decipher = node_crypto_1.default.createDecipheriv(ALGO, key, Buffer.from(parsed.iv, 'hex'));
        decipher.setAuthTag(Buffer.from(parsed.tag, 'hex'));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(parsed.data, 'hex')),
            decipher.final()
        ]);
        return decrypted.toString('utf8');
    }
    catch {
        return payload; // fallback legacy
    }
}
let encryptionKey = null;
exports.notesService = {
    setEncryptionKey: (key) => {
        encryptionKey = key;
    },
    getById: (id) => {
        const db = (0, db_1.getDb)();
        const note = db.prepare('SELECT * FROM clinical_notes WHERE id = ?')
            .get(id);
        if (!note)
            return undefined;
        return {
            ...note,
            generatedText: encryptionKey
                ? decrypt(note.generatedText, encryptionKey)
                : note.generatedText,
            editedText: note.editedText && encryptionKey
                ? decrypt(note.editedText, encryptionKey)
                : note.editedText
        };
    },
    getBySessionId: (sessionId) => {
        const db = (0, db_1.getDb)();
        const note = db.prepare(`
      SELECT * FROM clinical_notes 
      WHERE sessionId = ? 
      ORDER BY version DESC 
      LIMIT 1
    `).get(sessionId);
        if (!note)
            return undefined;
        return {
            ...note,
            generatedText: encryptionKey
                ? decrypt(note.generatedText, encryptionKey)
                : note.generatedText,
            editedText: note.editedText && encryptionKey
                ? decrypt(note.editedText, encryptionKey)
                : note.editedText
        };
    },
    createDraft: (sessionId, generatedText) => {
        const db = (0, db_1.getDb)();
        const id = (0, uuid_1.v4)();
        const createdAt = new Date().toISOString();
        const existing = exports.notesService.getBySessionId(sessionId);
        const version = existing ? existing.version + 1 : 1;
        const encryptedText = encryptionKey
            ? encrypt(generatedText, encryptionKey)
            : generatedText;
        const note = {
            id,
            sessionId,
            version,
            status: 'draft',
            generatedText: encryptedText,
            createdAt
        };
        db.prepare(`
      INSERT INTO clinical_notes 
      (id, sessionId, version, status, generatedText, createdAt)
      VALUES (@id, @sessionId, @version, @status, @generatedText, @createdAt)
    `).run(note);
        sessions_service_1.sessionsService.update(sessionId, { noteId: id });
        return note;
    },
    upsertDraft: (sessionId, text) => {
        const existing = exports.notesService.getBySessionId(sessionId);
        if (existing) {
            if (existing.status === 'validated') {
                throw new Error('Cannot update a validated note');
            }
            exports.notesService.updateDraft(existing.id, text);
            return { ...existing, editedText: text };
        }
        else {
            return exports.notesService.createDraft(sessionId, text);
        }
    },
    updateDraft: (id, editedText) => {
        const db = (0, db_1.getDb)();
        const note = exports.notesService.getById(id);
        if (!note || note.status !== 'draft') {
            throw new Error('Only draft notes can be edited');
        }
        const encryptedText = encryptionKey
            ? encrypt(editedText, encryptionKey)
            : editedText;
        db.prepare(`
      UPDATE clinical_notes 
      SET editedText = ? 
      WHERE id = ?
    `).run(encryptedText, id);
    },
    validate: (id, validatedBy) => {
        const db = (0, db_1.getDb)();
        const note = exports.notesService.getById(id);
        if (!note)
            throw new Error('Note not found');
        if (note.status === 'validated')
            return;
        const validatedAt = new Date().toISOString();
        db.prepare(`
      UPDATE clinical_notes
      SET status = 'validated', validatedAt = ?, validatedBy = ?
      WHERE id = ?
    `).run(validatedAt, validatedBy, id);
        sessions_service_1.sessionsService.update(note.sessionId, { status: 'completed' });
    }
};
