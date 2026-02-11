import * as SQLite from 'expo-sqlite';

let db;
const TARGET_VERSION = 2;

export const initDb = async (encryptionKey) => {
  db = await SQLite.openDatabaseAsync('ethos.db');
  await db.execAsync(`PRAGMA key = '${encryptionKey}';`);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      scheduledAt TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY(patientId) REFERENCES patients(id)
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL,
      fullName TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  const versionResult = await db.getFirstAsync('PRAGMA user_version');
  let currentVersion = versionResult.user_version || 0;

  if (currentVersion < 1) {
    const patientCols = await db.getAllAsync("PRAGMA table_info(patients)");
    if (!patientCols.find(c => c.name === 'cpf')) {
      await db.execAsync("ALTER TABLE patients ADD COLUMN phoneNumber TEXT");
      await db.execAsync("ALTER TABLE patients ADD COLUMN cpf TEXT");
      await db.execAsync("ALTER TABLE patients ADD COLUMN cep TEXT");
      await db.execAsync("ALTER TABLE patients ADD COLUMN address TEXT");
      await db.execAsync("ALTER TABLE patients ADD COLUMN supportNetwork TEXT");
      await db.execAsync("ALTER TABLE patients ADD COLUMN sessionPrice INTEGER");
      await db.execAsync("ALTER TABLE patients ADD COLUMN birthDate TEXT");
      await db.execAsync("ALTER TABLE patients ADD COLUMN notes TEXT");
    }
    const sessionCols = await db.getAllAsync("PRAGMA table_info(sessions)");
    if (!sessionCols.find(c => c.name === 'audioId')) {
      await db.execAsync("ALTER TABLE sessions ADD COLUMN audioId TEXT");
      await db.execAsync("ALTER TABLE sessions ADD COLUMN transcriptId TEXT");
      await db.execAsync("ALTER TABLE sessions ADD COLUMN noteId TEXT");
    }
    await db.execAsync(`
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
    `);
    await db.execAsync(`PRAGMA user_version = 1`);
  }

  if (currentVersion < 2) {
    const patientCols = await db.getAllAsync("PRAGMA table_info(patients)");
    if (!patientCols.find(c => c.name === 'isProBono')) {
      await db.execAsync("ALTER TABLE patients ADD COLUMN isProBono INTEGER DEFAULT 0");
    }
    await db.execAsync(`PRAGMA user_version = 2`);
  }

  return db;
};

export const getDb = () => {
  if (!db) throw new Error('Database not initialized');
  return db;
};
