import AesGcmCrypto from 'react-native-aes-gcm-crypto';
import * as FileSystem from 'expo-file-system';
import { getSessionKeys } from './security';
import { getDb } from './db';
import { Buffer } from 'buffer';

const VAULT_DIR = `${FileSystem.documentDirectory}vault/`;
const toPath = (uri) => uri.replace('file://', '');

export const vaultService = {
  encryptFile: async (sourceUri, sessionId) => {
    const keys = getSessionKeys();
    if (!keys) throw new Error('App Locked');
    const dirInfo = await FileSystem.getInfoAsync(VAULT_DIR);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(VAULT_DIR, { recursive: true });
    const targetUri = `${VAULT_DIR}${sessionId}.ethos`;
    const keyBase64 = Buffer.from(keys.vaultKey, 'hex').toString('base64');
    const { iv, tag } = await AesGcmCrypto.encryptFile(toPath(sourceUri), toPath(targetUri), keyBase64);
    const db = getDb();
    await db.runAsync('UPDATE sessions SET audioId = ?, noteId = ? WHERE id = ?', [targetUri, JSON.stringify({ iv, tag }), sessionId]);
    await FileSystem.deleteAsync(sourceUri, { idempotent: true });
    return targetUri;
  },
  decryptFile: async (encryptedUri, sessionId) => {
    const keys = getSessionKeys();
    if (!keys) throw new Error('App Locked');
    const db = getDb();
    const session = await db.getFirstAsync('SELECT noteId FROM sessions WHERE id = ?', sessionId);
    if (!session || !session.noteId) throw new Error('Metadata missing');
    const { iv, tag } = JSON.parse(session.noteId);
    const keyBase64 = Buffer.from(keys.vaultKey, 'hex').toString('base64');
    const tempUri = `${FileSystem.cacheDirectory}decrypted_${sessionId}.wav`;
    await AesGcmCrypto.decryptFile(toPath(encryptedUri), toPath(tempUri), keyBase64, iv, tag);
    return tempUri;
  },
  getVaultDirectory: () => VAULT_DIR
};
