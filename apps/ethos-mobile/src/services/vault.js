import AesGcmCrypto from 'react-native-aes-gcm-crypto';
import * as FileSystem from 'expo-file-system';
import { getSessionKeys } from './security';
import { getDb } from './db';

const VAULT_DIR = `${FileSystem.documentDirectory}vault/`;

/**
 * Normalizes Expo URI to a native file path if needed by the library.
 */
const toPath = (uri) => uri.replace('file://', '');

export const vaultService = {
  /**
   * Encrypted file manager using native file streams (OOM Safe).
   */
  encryptFile: async (sourceUri, sessionId) => {
    const keys = getSessionKeys();
    if (!keys) throw new Error('App Locked: Chaves não disponíveis.');

    const dirInfo = await FileSystem.getInfoAsync(VAULT_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(VAULT_DIR, { recursive: true });
    }

    const targetUri = `${VAULT_DIR}${sessionId}.ethos`;

    // key must be in Base64 for react-native-aes-gcm-crypto
    const keyBase64 = Buffer.from(keys.vaultKey, 'hex').toString('base64');

    // encryptFile handles large files via streams internally
    const { iv, tag } = await AesGcmCrypto.encryptFile(
      toPath(sourceUri),
      toPath(targetUri),
      keyBase64
    );

    // Save IV and Tag to database for decryption
    const db = getDb();
    await db.runAsync(
      'UPDATE sessions SET audioId = ?, noteId = ? WHERE id = ?',
      [targetUri, JSON.stringify({ iv, tag }), sessionId]
    );

    // Aggressive cleaning
    await FileSystem.deleteAsync(sourceUri, { idempotent: true });

    return targetUri;
  },

  /**
   * Decrypts a file from the vault into a temporary cache file (OOM Safe).
   */
  decryptFile: async (encryptedUri, sessionId) => {
    const keys = getSessionKeys();
    if (!keys) throw new Error('App Locked');

    const db = getDb();
    const session = await db.getFirstAsync('SELECT noteId FROM sessions WHERE id = ?', sessionId);
    if (!session || !session.noteId) throw new Error('Metadados de áudio não encontrados.');

    const { iv, tag } = JSON.parse(session.noteId);
    const keyBase64 = Buffer.from(keys.vaultKey, 'hex').toString('base64');

    const tempUri = `${FileSystem.cacheDirectory}decrypted_${sessionId}.wav`;

    await AesGcmCrypto.decryptFile(
      toPath(encryptedUri),
      toPath(tempUri),
      keyBase64,
      iv,
      tag
    );

    return tempUri;
  },

  getVaultDirectory: () => VAULT_DIR
};
