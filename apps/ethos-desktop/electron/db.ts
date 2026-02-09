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
  `);

  return db;
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};
