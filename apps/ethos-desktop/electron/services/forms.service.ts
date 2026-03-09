import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const formsService = {
  getAllTemplates: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM forms').all();
  },

  getResponsesByPatient: (patientId: string) => {
    const db = getDb();
    return db.prepare(`
      SELECT fr.*, f.title as formTitle
      FROM form_responses fr
      JOIN forms f ON fr.formId = f.id
      WHERE fr.patientId = ?
      ORDER BY fr.createdAt DESC
    `).all(patientId);
  },

  submitResponse: (payload: { formId: string; patientId: string; answers: any }) => {
    const db = getDb();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO form_responses (id, formId, patientId, answers, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, payload.formId, payload.patientId, JSON.stringify(payload.answers), createdAt);

    return { id, createdAt };
  }
};
