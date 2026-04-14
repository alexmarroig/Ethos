import { getDb } from '../db';
import type { Patient } from '@ethos/shared';
import { v4 as uuidv4 } from 'uuid';

// 🔐 Tipo vindo do banco (boolean → number)
type PatientRow = Omit<Patient, 'isProBono' | 'isExempt'> & {
  isProBono: number;
  isExempt: number;
};

// 🔁 converte banco → domínio
const hydratePatient = (row: PatientRow): Patient => ({
  ...row,
  isProBono: Boolean(row.isProBono),
  isExempt: Boolean(row.isExempt),
});

export const patientsService = {
  getAll: (): Patient[] => {
    const db = getDb();

    const rows = db
      .prepare('SELECT * FROM patients ORDER BY fullName ASC')
      .all() as PatientRow[];

    return rows.map(hydratePatient);
  },

  getById: (id: string): Patient | undefined => {
    const db = getDb();

    const row = db
      .prepare('SELECT * FROM patients WHERE id = ?')
      .get(id) as PatientRow | undefined;

    return row ? hydratePatient(row) : undefined;
  },

  create: (patient: Omit<Patient, 'id' | 'createdAt'>): Patient => {
    const db = getDb();

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const newPatient: PatientRow = {
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

  update: (id: string, updates: Partial<Patient>): void => {
    if (!id) return;

    const db = getDb();

    const allowedKeys: (keyof Patient)[] = [
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

    const keys = Object.keys(updates).filter((k) =>
      allowedKeys.includes(k as keyof Patient)
    );

    if (keys.length === 0) return;

    const normalizedUpdates: any = {
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

  delete: (id: string): void => {
    if (!id) return;

    const db = getDb();
    db.prepare('DELETE FROM patients WHERE id = ?').run(id);
  },
};