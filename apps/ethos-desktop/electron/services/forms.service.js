"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formsService = void 0;
const db_1 = require("../db");
const uuid_1 = require("uuid");
exports.formsService = {
    getAllTemplates: () => {
        const db = (0, db_1.getDb)();
        return db.prepare('SELECT * FROM forms').all();
    },
    getResponsesByPatient: (patientId) => {
        const db = (0, db_1.getDb)();
        return db.prepare(`
      SELECT fr.*, f.title as formTitle
      FROM form_responses fr
      JOIN forms f ON fr.formId = f.id
      WHERE fr.patientId = ?
      ORDER BY fr.createdAt DESC
    `).all(patientId);
    },
    submitResponse: (payload) => {
        const db = (0, db_1.getDb)();
        const id = (0, uuid_1.v4)();
        const createdAt = new Date().toISOString();
        db.prepare(`
      INSERT INTO form_responses (id, formId, patientId, answers, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, payload.formId, payload.patientId, JSON.stringify(payload.answers), createdAt);
        return { id, createdAt };
    }
};
