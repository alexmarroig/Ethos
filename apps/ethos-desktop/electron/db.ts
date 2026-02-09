import Database from 'better-sqlite3-multiple-ciphers';
import path from 'node:path';
import { app } from 'electron';
import fs from 'node:fs';

let db: Database.Database;

export const initDb = (encryptionKey: string) => {
  const userDataPath = app.getPath('userData');
  const vaultPath = path.join(userDataPath, 'vault');

  if (!fs.existsSync(vaultPath)) {
    fs.mkdirSync(vaultPath, { recursive: true });
  }

  const dbPath = path.join(vaultPath, 'ethos.db');
  db = new Database(dbPath);

  // Setup encryption
  db.pragma(`key = '${encryptionKey}'`);

  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      phoneNumber TEXT,
      cpf TEXT,
      cep TEXT,
      address TEXT,
      supportNetwork TEXT,
      sessionPrice INTEGER,
      birthDate TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      scheduledAt TEXT NOT NULL,
      status TEXT NOT NULL,
      audioId TEXT,
      transcriptId TEXT,
      noteId TEXT,
      FOREIGN KEY(patientId) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      language TEXT NOT NULL,
      fullText TEXT NOT NULL,
      segments TEXT NOT NULL, -- JSON
      createdAt TEXT NOT NULL,
      FOREIGN KEY(sessionId) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS clinical_notes (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      version INTEGER NOT NULL,
      status TEXT NOT NULL,
      generatedText TEXT NOT NULL,
      editedText TEXT,
      validatedAt TEXT,
      validatedBy TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(sessionId) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS transcription_jobs (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      audioPath TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL,
      progress REAL NOT NULL,
      error TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS financial_entries (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      sessionId TEXT,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      method TEXT,
      date TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(patientId) REFERENCES patients(id),
      FOREIGN KEY(sessionId) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL, -- 'psychologist', 'patient', 'admin'
      fullName TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      schema TEXT NOT NULL, -- JSON definition of questions
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS form_responses (
      id TEXT PRIMARY KEY,
      formId TEXT NOT NULL,
      patientId TEXT NOT NULL,
      answers TEXT NOT NULL, -- JSON answers
      createdAt TEXT NOT NULL,
      FOREIGN KEY(formId) REFERENCES forms(id),
      FOREIGN KEY(patientId) REFERENCES patients(id)
    );
  `);

  // Seed initial form templates
  const formsCount = db.prepare('SELECT COUNT(*) as count FROM forms').get() as { count: number };
  if (formsCount.count === 0) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO forms (id, title, description, schema, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'form-sonhos',
      'Diário dos Sonhos',
      'Registre seus sonhos ao acordar para trabalharmos em sessão.',
      JSON.stringify([
        { id: 'q1', type: 'text', question: 'O que aconteceu no sonho?' },
        { id: 'q2', type: 'select', question: 'Qual era a emoção predominante?', options: ['Medo', 'Alegria', 'Confusão', 'Raiva', 'Outra'] }
      ]),
      now
    );
    db.prepare(`
      INSERT INTO forms (id, title, description, schema, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'form-emocoes',
      'Diário de Emoções',
      'Acompanhamento diário de estado emocional.',
      JSON.stringify([
        { id: 'q1', type: 'range', question: 'De 0 a 10, quão bem você se sentiu hoje?' },
        { id: 'q2', type: 'text', question: 'O que mais marcou seu dia?' }
      ]),
      now
    );
  }

  // Seed test users if empty
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (usersCount.count === 0) {
    const now = new Date().toISOString();
    // In a real app, passwords would be hashed. For this demo, we'll use plain for simplicity or a simple mock hash.
    db.prepare(`
      INSERT INTO users (id, email, passwordHash, role, fullName, createdAt)
      VALUES
        (?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?)
    `).run(
      'user-1', 'psico@ethos.app', 'ethos2026', 'psychologist', 'Psicólogo Teste', now,
      'user-2', 'paciente@ethos.app', 'ethos2026', 'patient', 'Paciente Teste', now,
      'user-wife', 'wife@ethos.app', 'ethos2026', 'psychologist', 'Dra. Esposa do Fundador', now
    );
  }

  return db;
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};
