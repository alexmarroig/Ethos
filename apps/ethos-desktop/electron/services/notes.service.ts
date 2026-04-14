import { getDb } from '../db';
import type { ClinicalNote } from '../../../../packages/shared/src';
import { v4 as uuidv4 } from 'uuid';
import { sessionsService } from './sessions.service';
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';

function encrypt(text: string, key: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

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

function decrypt(payload: string, key: Buffer) {
  try {
    const parsed = JSON.parse(payload);

    if (!parsed.iv) return payload; // fallback legacy

    const decipher = crypto.createDecipheriv(
      ALGO,
      key,
      Buffer.from(parsed.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(parsed.tag, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(parsed.data, 'hex')),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch {
    return payload; // fallback legacy
  }
}

let encryptionKey: Buffer | null = null;

export const notesService = {
  setEncryptionKey: (key: Buffer) => {
    encryptionKey = key;
  },

  getById: (id: string): ClinicalNote | undefined => {
    const db = getDb();
    const note = db.prepare('SELECT * FROM clinical_notes WHERE id = ?')
      .get(id) as ClinicalNote | undefined;

    if (!note) return undefined;

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

  getBySessionId: (sessionId: string): ClinicalNote | undefined => {
    const db = getDb();
    const note = db.prepare(`
      SELECT * FROM clinical_notes 
      WHERE sessionId = ? 
      ORDER BY version DESC 
      LIMIT 1
    `).get(sessionId) as ClinicalNote | undefined;

    if (!note) return undefined;

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

  createDraft: (sessionId: string, generatedText: string): ClinicalNote => {
    const db = getDb();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const existing = notesService.getBySessionId(sessionId);
    const version = existing ? existing.version + 1 : 1;

    const encryptedText = encryptionKey
      ? encrypt(generatedText, encryptionKey)
      : generatedText;

    const note: ClinicalNote = {
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

    sessionsService.update(sessionId, { noteId: id });

    return note;
  },

  upsertDraft: (sessionId: string, text: string): ClinicalNote => {
    const existing = notesService.getBySessionId(sessionId);

    if (existing) {
      if (existing.status === 'validated') {
        throw new Error('Cannot update a validated note');
      }

      notesService.updateDraft(existing.id, text);

      return { ...existing, editedText: text };
    } else {
      return notesService.createDraft(sessionId, text);
    }
  },

  updateDraft: (id: string, editedText: string): void => {
    const db = getDb();
    const note = notesService.getById(id);

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

  validate: (id: string, validatedBy: string): void => {
    const db = getDb();
    const note = notesService.getById(id);

    if (!note) throw new Error('Note not found');
    if (note.status === 'validated') return;

    const validatedAt = new Date().toISOString();

    db.prepare(`
      UPDATE clinical_notes
      SET status = 'validated', validatedAt = ?, validatedBy = ?
      WHERE id = ?
    `).run(validatedAt, validatedBy, id);

    sessionsService.update(note.sessionId, { status: 'completed' });
  }
};