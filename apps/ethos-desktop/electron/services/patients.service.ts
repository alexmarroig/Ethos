import { getDb } from '../db';
import { Patient } from '@ethos/shared';
import { v4 as uuidv4 } from 'uuid';

export const patientsService = {
  getAll: (): Patient[] => {
    const db = getDb();
    return db.prepare('SELECT * FROM patients ORDER BY fullName ASC').all() as Patient[];
  },

  getById: (id: string): Patient | undefined => {
    const db = getDb();
    return db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as Patient | undefined;
  },

  create: (patient: Omit<Patient, 'id' | 'createdAt'>): Patient => {
    const db = getDb();
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const newPatient = { ...patient, id, createdAt };

    db.prepare(`
      INSERT INTO patients (id, fullName, phoneNumber, cpf, cep, address, supportNetwork, sessionPrice, birthDate, notes, createdAt)
      VALUES (@id, @fullName, @phoneNumber, @cpf, @cep, @address, @supportNetwork, @sessionPrice, @birthDate, @notes, @createdAt)
    `).run(newPatient);

    return newPatient;
  },

  update: (id: string, updates: Partial<Patient>): void => {
    const db = getDb();
    const allowedKeys = ['fullName', 'phoneNumber', 'cpf', 'cep', 'address', 'supportNetwork', 'sessionPrice', 'birthDate', 'notes'];
    const keys = Object.keys(updates).filter(k => allowedKeys.includes(k));

    if (keys.length === 0) return;

    const setClause = keys.map(key => `${key} = @${key}`).join(', ');
    db.prepare(`UPDATE patients SET ${setClause} WHERE id = @id`).run({ ...updates, id });
  },

  delete: (id: string): void => {
    const db = getDb();
    db.prepare('DELETE FROM patients WHERE id = ?').run(id);
  }
};
