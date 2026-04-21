"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientsService = void 0;
const db_1 = require("../db");
const uuid_1 = require("uuid");
// 🔁 converte banco → domínio
const hydratePatient = (row) => ({
    ...row,
    isProBono: Boolean(row.isProBono),
    isExempt: Boolean(row.isExempt),
});
exports.patientsService = {
    getAll: () => {
        const db = (0, db_1.getDb)();
        const rows = db
            .prepare('SELECT * FROM patients ORDER BY fullName ASC')
            .all();
        return rows.map(hydratePatient);
    },
    getById: (id) => {
        const db = (0, db_1.getDb)();
        const row = db
            .prepare('SELECT * FROM patients WHERE id = ?')
            .get(id);
        return row ? hydratePatient(row) : undefined;
    },
    create: (patient) => {
        const db = (0, db_1.getDb)();
        const id = (0, uuid_1.v4)();
        const createdAt = new Date().toISOString();
        const newPatient = {
            ...patient,
            id,
            createdAt,
            isProBono: patient.isProBono ? 1 : 0,
            isExempt: patient.isExempt ? 1 : 0,
        };
        db.prepare(`
      INSERT INTO patients (
        id, fullName, phoneNumber, cpf, cep, address, supportNetwork,
        sessionPrice, isProBono, isExempt, birthDate, notes, createdAt
      )
      VALUES (
        @id, @fullName, @phoneNumber, @cpf, @cep, @address, @supportNetwork,
        @sessionPrice, @isProBono, @isExempt, @birthDate, @notes, @createdAt
      )
    `).run(newPatient);
        return {
            ...newPatient,
            isProBono: Boolean(newPatient.isProBono),
            isExempt: Boolean(newPatient.isExempt),
        };
    },
    update: (id, updates) => {
        if (!id)
            return;
        const db = (0, db_1.getDb)();
        const allowedKeys = [
            'fullName',
            'phoneNumber',
            'cpf',
            'cep',
            'address',
            'supportNetwork',
            'sessionPrice',
            'isProBono',
            'isExempt',
            'birthDate',
            'notes',
        ];
        const keys = Object.keys(updates).filter((k) => allowedKeys.includes(k));
        if (keys.length === 0)
            return;
        const normalizedUpdates = {
            ...updates,
            ...(typeof updates.isProBono === 'boolean' && {
                isProBono: updates.isProBono ? 1 : 0,
            }),
            ...(typeof updates.isExempt === 'boolean' && {
                isExempt: updates.isExempt ? 1 : 0,
            }),
        };
        const setClause = keys.map((key) => `${key} = @${key}`).join(', ');
        db.prepare(`
      UPDATE patients 
      SET ${setClause} 
      WHERE id = @id
    `).run({ ...normalizedUpdates, id });
    },
    delete: (id) => {
        if (!id)
            return;
        const db = (0, db_1.getDb)();
        db.prepare('DELETE FROM patients WHERE id = ?').run(id);
    },
};
