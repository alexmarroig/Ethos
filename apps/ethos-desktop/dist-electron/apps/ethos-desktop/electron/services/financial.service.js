"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financialService = void 0;
const db_1 = require("../db");
const uuid_1 = require("uuid");
exports.financialService = {
    getAll: () => {
        const db = (0, db_1.getDb)();
        return db.prepare('SELECT * FROM financial_entries ORDER BY date DESC').all();
    },
    getByPatientId: (patientId) => {
        const db = (0, db_1.getDb)();
        return db.prepare('SELECT * FROM financial_entries WHERE patientId = ? ORDER BY date DESC').all(patientId);
    },
    create: (entry) => {
        const db = (0, db_1.getDb)();
        const id = (0, uuid_1.v4)();
        const createdAt = new Date().toISOString();
        const newEntry = { ...entry, id, createdAt };
        db.prepare(`
      INSERT INTO financial_entries (id, patientId, sessionId, amount, type, category, status, method, date, notes, createdAt)
      VALUES (@id, @patientId, @sessionId, @amount, @type, @category, @status, @method, @date, @notes, @createdAt)
    `).run(newEntry);
        return newEntry;
    },
    createSessionPackage: (payload) => {
        const db = (0, db_1.getDb)();
        const pkg = {
            ...payload,
            id: (0, uuid_1.v4)(),
            usedCredits: 0,
            createdAt: new Date().toISOString(),
        };
        db.prepare(`
      INSERT INTO session_packages (id, patientId, totalCredits, usedCredits, expiresAt, notes, createdAt)
      VALUES (@id, @patientId, @totalCredits, @usedCredits, @expiresAt, @notes, @createdAt)
    `).run(pkg);
        return pkg;
    },
    getPackagesByPatientId: (patientId) => {
        const db = (0, db_1.getDb)();
        return db
            .prepare('SELECT * FROM session_packages WHERE patientId = ? ORDER BY createdAt DESC')
            .all(patientId);
    },
    update: (id, updates) => {
        const db = (0, db_1.getDb)();
        const allowedKeys = ['amount', 'type', 'category', 'status', 'method', 'date', 'notes'];
        const keys = Object.keys(updates).filter((k) => allowedKeys.includes(k));
        if (keys.length === 0)
            return;
        const setClause = keys.map((key) => `${key} = @${key}`).join(', ');
        db.prepare(`UPDATE financial_entries SET ${setClause} WHERE id = @id`).run({ ...updates, id });
    },
    delete: (id) => {
        const db = (0, db_1.getDb)();
        db.prepare('DELETE FROM financial_entries WHERE id = ?').run(id);
    },
};
