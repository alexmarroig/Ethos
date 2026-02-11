import { getDb } from '../db';
import { FinancialEntry } from '@ethos/shared';
import { v4 as uuidv4 } from 'uuid';

export const financialService = {
  getAll: (): FinancialEntry[] => {
    const db = getDb();
    return db.prepare('SELECT * FROM financial_entries ORDER BY date DESC').all() as FinancialEntry[];
  },

  getByPatientId: (patientId: string): FinancialEntry[] => {
    const db = getDb();
    return db.prepare('SELECT * FROM financial_entries WHERE patientId = ? ORDER BY date DESC').all(patientId) as FinancialEntry[];
  },

  create: (entry: Omit<FinancialEntry, 'id' | 'createdAt'>): FinancialEntry => {
    const db = getDb();
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const newEntry = { ...entry, id, createdAt };

    db.prepare(`
      INSERT INTO financial_entries (id, patientId, sessionId, amount, type, category, status, method, date, notes, createdAt)
      VALUES (@id, @patientId, @sessionId, @amount, @type, @category, @status, @method, @date, @notes, @createdAt)
    `).run(newEntry);

    return newEntry;
  },

  update: (id: string, updates: Partial<FinancialEntry>): void => {
    const db = getDb();
    const allowedKeys = ['amount', 'type', 'category', 'status', 'method', 'date', 'notes'];
    const keys = Object.keys(updates).filter(k => allowedKeys.includes(k));

    if (keys.length === 0) return;

    const setClause = keys.map(key => `${key} = @${key}`).join(', ');
    db.prepare(`UPDATE financial_entries SET ${setClause} WHERE id = @id`).run({ ...updates, id });
  },

  delete: (id: string): void => {
    const db = getDb();
    db.prepare('DELETE FROM financial_entries WHERE id = ?').run(id);
  }
};
