import { getDb } from '../db';
import { Session } from '@ethos/shared';
import { v4 as uuidv4 } from 'uuid';

const shouldAutoCharge = (patient: { isProBono?: number; isExempt?: number; sessionPrice?: number }) => {
  if (patient.isProBono || patient.isExempt) return false;
  return Boolean(patient.sessionPrice && patient.sessionPrice > 0);
};

const consumePackageCredit = (patientId: string): boolean => {
  const db = getDb();
  const pkg = db
    .prepare(
      `SELECT id, totalCredits, usedCredits
       FROM session_packages
       WHERE patientId = ?
         AND usedCredits < totalCredits
         AND (expiresAt IS NULL OR expiresAt >= ?)
       ORDER BY createdAt ASC
       LIMIT 1`
    )
    .get(patientId, new Date().toISOString()) as
    | { id: string; totalCredits: number; usedCredits: number }
    | undefined;

  if (!pkg) return false;

  db.prepare('UPDATE session_packages SET usedCredits = usedCredits + 1 WHERE id = ?').run(pkg.id);
  return true;
};

const maybeCreateSessionCharge = (session: Session) => {
  const db = getDb();
  const patient = db
    .prepare('SELECT id, sessionPrice, isProBono, isExempt FROM patients WHERE id = ?')
    .get(session.patientId) as { id: string; sessionPrice?: number; isProBono?: number; isExempt?: number } | undefined;

  if (!patient || !shouldAutoCharge(patient)) return;
  if (consumePackageCredit(session.patientId)) return;

  db.prepare(`
      INSERT INTO financial_entries (
        id, patientId, sessionId, amount, type, category, status, method, date, notes, createdAt
      ) VALUES (
        @id, @patientId, @sessionId, @amount, 'charge', 'session', 'pending', NULL, @date, @notes, @createdAt
      )
    `).run({
    id: uuidv4(),
    patientId: session.patientId,
    sessionId: session.id,
    amount: patient.sessionPrice,
    date: session.scheduledAt,
    notes: 'Cobrança automática da sessão',
    createdAt: new Date().toISOString(),
  });
};

export const sessionsService = {
  getAll: (): Session[] => {
    const db = getDb();
    return db.prepare('SELECT * FROM sessions ORDER BY scheduledAt DESC').all() as Session[];
  },

  getByPatientId: (patientId: string): Session[] => {
    const db = getDb();
    return db.prepare('SELECT * FROM sessions WHERE patientId = ? ORDER BY scheduledAt DESC').all(patientId) as Session[];
  },

  create: (session: Omit<Session, 'id'>): Session => {
    const db = getDb();
    const id = uuidv4();
    const newSession = { ...session, id };

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO sessions (id, patientId, scheduledAt, status, audioId, transcriptId, noteId)
        VALUES (@id, @patientId, @scheduledAt, @status, @audioId, @transcriptId, @noteId)
      `).run(newSession);

      maybeCreateSessionCharge(newSession);
    });

    tx();

    return newSession;
  },

  update: (id: string, updates: Partial<Session>): void => {
    const db = getDb();
    const allowedKeys = ['status', 'scheduledAt', 'audioId', 'transcriptId', 'noteId'];
    const keys = Object.keys(updates).filter((k) => allowedKeys.includes(k));

    if (keys.length === 0) return;

    const setClause = keys.map((key) => `${key} = @${key}`).join(', ');
    db.prepare(`UPDATE sessions SET ${setClause} WHERE id = @id`).run({ ...updates, id });
  },

  delete: (id: string): void => {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  },
};
