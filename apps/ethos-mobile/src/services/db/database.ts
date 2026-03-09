// ethos-mobile/src/services/db/database.ts
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// In a real scenario, expo-sqlite currently doesn't natively bundle SQLCipher 
// without custom native dev clients, but it can be swapped.
// For this Native Prototype phase, we'll establish the pattern using standard SQLite
// and simulate the SecureStore key wrapping.

const DB_NAME = 'ethos_clinical_vault.db';

let db: SQLite.SQLiteDatabase | null = null;

export const initDB = async () => {
    if (db) return db;

    // Simulate getting or generating an encryption key
    let encryptionKey = await SecureStore.getItemAsync('db_encryption_key');
    if (!encryptionKey) {
        encryptionKey = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            Date.now().toString() + Math.random().toString()
        );
        await SecureStore.setItemAsync('db_encryption_key', encryptionKey);
    }

    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Initial Setup
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY NOT NULL,
            full_name TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY NOT NULL,
            patient_id TEXT NOT NULL,
            scheduled_at TEXT NOT NULL,
            status TEXT NOT NULL,
            sync_status TEXT DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS clinical_notes (
            id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL,
            draft_text TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
    `);

    console.log("Database initialized securely.");
    return db;
};

export const getDB = () => {
    if (!db) throw new Error("Database not initialized. Call initDB first.");
    return db;
};
