import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const formsService = {
  getTemplates: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM forms').all();
  },

  getResponses: (patientId: string) => {
    const db = getDb();
    return db.prepare(`
      SELECT fr.*, f.title as formTitle
      FROM form_responses fr
      JOIN forms f ON fr.formId = f.id
      WHERE fr.patientId = ?
      ORDER BY fr.createdAt DESC
    `).all(patientId);
  },

  submitResponse: (response: { formId: string; patientId: string; answers: any }) => {
    const db = getDb();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO form_responses (id, formId, patientId, answers, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, response.formId, response.patientId, JSON.stringify(response.answers), createdAt);

    return { id, createdAt };
  }
};
