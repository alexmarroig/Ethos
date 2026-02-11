import * as SQLite from 'expo-sqlite';

let db;

const getUserVersion = async () => {
  const row = await db.getFirstAsync('PRAGMA user_version;');
  return row?.user_version ?? 0;
};

const runMigrations = async () => {
  const version = await getUserVersion();

  if (version < 1) {
    await db.execAsync('PRAGMA user_version = 1;');
  }

  if (version < 2) {
    await db.execAsync(`
      ALTER TABLE patients ADD COLUMN isProBono INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE patients ADD COLUMN isExempt INTEGER NOT NULL DEFAULT 0;
    `).catch(() => {});

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS session_packages (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        totalCredits INTEGER NOT NULL,
        usedCredits INTEGER NOT NULL DEFAULT 0,
        expiresAt TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(patientId) REFERENCES patients(id)
      );
      PRAGMA user_version = 2;
    `);
  }
};

export const initDb = async (encryptionKey) => {
  db = await SQLite.openDatabaseAsync('ethos.db');
  await db.execAsync(`PRAGMA key = '${encryptionKey}';`);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      phoneNumber TEXT,
      cpf TEXT,
      cep TEXT,
      address TEXT,
      supportNetwork TEXT,
      sessionPrice INTEGER,
      isProBono INTEGER NOT NULL DEFAULT 0,
      isExempt INTEGER NOT NULL DEFAULT 0,
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
      segments TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL,
      fullName TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      schema TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS form_responses (
      id TEXT PRIMARY KEY,
      formId TEXT NOT NULL,
      patientId TEXT NOT NULL,
      answers TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(formId) REFERENCES forms(id),
      FOREIGN KEY(patientId) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS session_packages (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      totalCredits INTEGER NOT NULL,
      usedCredits INTEGER NOT NULL DEFAULT 0,
      expiresAt TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(patientId) REFERENCES patients(id)
    );
  `);

  await runMigrations();

  return db;
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDb(key) first.');
  }
  return db;
};
