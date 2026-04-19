"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionsService = void 0;
const db_1 = require("../db");
const uuid_1 = require("uuid");
const shouldAutoCharge = (patient) => {
    if (patient.isProBono || patient.isExempt)
        return false;
    return Boolean(patient.sessionPrice && patient.sessionPrice > 0);
};
const consumePackageCredit = (patientId) => {
    const db = (0, db_1.getDb)();
    const pkg = db
        .prepare(`
      SELECT id, totalCredits, usedCredits
      FROM session_packages
      WHERE patientId = ?
        AND usedCredits < totalCredits
        AND (expiresAt IS NULL OR expiresAt >= ?)
      ORDER BY createdAt ASC
      LIMIT 1
    `)
        .get(patientId, new Date().toISOString());
    if (!pkg)
        return false;
    db.prepare(`
    UPDATE session_packages 
    SET usedCredits = usedCredits + 1 
    WHERE id = ?
  `).run(pkg.id);
    return true;
};
const maybeCreateSessionCharge = (session) => {
    const db = (0, db_1.getDb)();
    const patient = db
        .prepare(`
      SELECT id, sessionPrice, isProBono, isExempt 
      FROM patients 
      WHERE id = ?
    `)
        .get(session.patientId);
    if (!patient || !shouldAutoCharge(patient))
        return;
    if (consumePackageCredit(session.patientId))
        return;
    db.prepare(`
    INSERT INTO financial_entries (
      id, patientId, sessionId, amount, type, category, status, method, date, notes, createdAt
    ) VALUES (
      @id, @patientId, @sessionId, @amount, 'charge', 'session', 'pending', NULL, @date, @notes, @createdAt
    )
  `).run({
        id: (0, uuid_1.v4)(),
        patientId: session.patientId,
        sessionId: session.id,
        amount: patient.sessionPrice,
        date: session.scheduledAt,
        notes: 'Cobrança automática da sessão',
        createdAt: new Date().toISOString(),
    });
};
exports.sessionsService = {
    getAll: () => {
        const db = (0, db_1.getDb)();
        return db
            .prepare('SELECT * FROM sessions ORDER BY scheduledAt DESC')
            .all();
    },
    getByPatientId: (patientId) => {
        if (!patientId)
            return [];
        const db = (0, db_1.getDb)();
        return db
            .prepare('SELECT * FROM sessions WHERE patientId = ? ORDER BY scheduledAt DESC')
            .all(patientId);
    },
    create: (session) => {
        if (!session.patientId || !session.scheduledAt) {
            throw new Error('Invalid session data');
        }
        const db = (0, db_1.getDb)();
        const id = (0, uuid_1.v4)();
        const newSession = {
            ...session,
            id,
        };
        const tx = db.transaction(() => {
            db.prepare(`
        INSERT INTO sessions (
          id, patientId, scheduledAt, status, audioId, transcriptId, noteId
        ) VALUES (
          @id, @patientId, @scheduledAt, @status, @audioId, @transcriptId, @noteId
        )
      `).run(newSession);
            maybeCreateSessionCharge(newSession);
        });
        tx();
        return newSession;
    },
    update: (id, updates) => {
        if (!id)
            return;
        const db = (0, db_1.getDb)();
        const allowedKeys = [
            'status',
            'scheduledAt',
            'audioId',
            'transcriptId',
            'noteId'
        ];
        const keys = Object.keys(updates).filter((k) => allowedKeys.includes(k));
        if (keys.length === 0)
            return;
        const setClause = keys.map((key) => `${key} = @${key}`).join(', ');
        db.prepare(`UPDATE sessions SET ${setClause} WHERE id = @id`)
            .run({ ...updates, id });
    },
    delete: (id) => {
        if (!id)
            return;
        const db = (0, db_1.getDb)();
        db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    },
};
