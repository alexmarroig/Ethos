import * as SQLite from 'expo-sqlite';

let db;

/**
 * Initializes the SQLite database with SQLCipher encryption.
 * @param {string} encryptionKey - The master key derived from the user's password.
 */
export const initDb = async (encryptionKey) => {
  // openDatabaseAsync will use SQLCipher because of the app.json plugin configuration
  db = await SQLite.openDatabaseAsync('ethos.db');

  // Set the encryption key immediately after opening
  // Note: In a production environment, the key should be handled securely (e.g., via SecureStore)
  await db.execAsync(`PRAGMA key = '${encryptionKey}';`);

  // Optimize and enforce constraints
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // Schema creation (Mirrors Desktop for parity)
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
      segments TEXT NOT NULL, -- Store as JSON string
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

  return db;
};

/**
 * Returns the initialized database instance.
 */
export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDb(key) first.');
  }
  return db;
};
