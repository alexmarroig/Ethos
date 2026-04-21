"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = exports.initDb = void 0;
const better_sqlite3_multiple_ciphers_1 = __importDefault(require("better-sqlite3-multiple-ciphers"));
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
const node_fs_1 = __importDefault(require("node:fs"));
let db;
const getTableColumns = (tableName) => {
    return db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
};
const ensureColumn = (tableName, columnName, definition) => {
    const columns = getTableColumns(tableName);
    if (!columns.includes(columnName)) {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
    }
};
const runMigrations = () => {
    const currentVersion = db.prepare('PRAGMA user_version').get().user_version ?? 0;
    if (currentVersion < 1) {
        db.exec('PRAGMA user_version = 1;');
    }
    if (currentVersion < 2) {
        ensureColumn('patients', 'isProBono', 'INTEGER NOT NULL DEFAULT 0');
        ensureColumn('patients', 'isExempt', 'INTEGER NOT NULL DEFAULT 0');
        db.exec(`
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
        db.exec('PRAGMA user_version = 2;');
    }
};
const initDb = (encryptionKey) => {
    const userDataPath = electron_1.app.getPath('userData');
    const vaultPath = node_path_1.default.join(userDataPath, 'vault');
    if (!node_fs_1.default.existsSync(vaultPath)) {
        node_fs_1.default.mkdirSync(vaultPath, { recursive: true });
    }
    const dbPath = node_path_1.default.join(vaultPath, 'ethos.db');
    db = new better_sqlite3_multiple_ciphers_1.default(dbPath);
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
    runMigrations();
    // Seed initial form templates
    const formsCount = db.prepare('SELECT COUNT(*) as count FROM forms').get();
    if (formsCount.count === 0) {
        const now = new Date().toISOString();
        db.prepare(`
      INSERT INTO forms (id, title, description, schema, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run('form-sonhos', 'Diário dos Sonhos', 'Registre seus sonhos ao acordar para trabalharmos em sessão.', JSON.stringify([
            { id: 'q1', type: 'text', question: 'O que aconteceu no sonho?' },
            { id: 'q2', type: 'select', question: 'Qual era a emoção predominante?', options: ['Medo', 'Alegria', 'Confusão', 'Raiva', 'Outra'] }
        ]), now);
        db.prepare(`
      INSERT INTO forms (id, title, description, schema, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run('form-emocoes', 'Diário de Emoções', 'Acompanhamento diário de estado emocional.', JSON.stringify([
            { id: 'q1', type: 'range', question: 'De 0 a 10, quão bem você se sentiu hoje?' },
            { id: 'q2', type: 'text', question: 'O que mais marcou seu dia?' }
        ]), now);
    }
    // Seed test users if empty
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (usersCount.count === 0) {
        const now = new Date().toISOString();
        // In a real app, passwords would be hashed. For this demo, we'll use plain for simplicity or a simple mock hash.
        db.prepare(`
      INSERT INTO users (id, email, passwordHash, role, fullName, createdAt)
      VALUES
        (?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?)
    `).run('user-1', 'psico@ethos.app', 'ethos2026', 'psychologist', 'Psicólogo Teste', now, 'user-2', 'paciente@ethos.app', 'ethos2026', 'patient', 'Paciente Teste', now, 'user-wife', 'wife@ethos.app', 'ethos2026', 'psychologist', 'Dra. Esposa do Fundador', now);
    }
    return db;
};
exports.initDb = initDb;
const getDb = () => {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
};
exports.getDb = getDb;
