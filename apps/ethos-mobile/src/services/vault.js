import { Buffer } from 'buffer';
import crypto from 'react-native-quick-crypto';
import * as FileSystem from 'expo-file-system';
import { getSessionKeys } from './security';

const VAULT_DIR = `${FileSystem.documentDirectory}vault/`;

export const vaultService = {
  /**
   * Encrypts an audio file and saves it to the vault.
   * Deletes the source file after encryption (Aggressive cleaning).
   */
  encryptFile: async (sourceUri, sessionId) => {
    const keys = getSessionKeys();
    if (!keys) throw new Error('App Locked: Chaves não disponíveis.');

    // Ensure vault exists
    const dirInfo = await FileSystem.getInfoAsync(VAULT_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(VAULT_DIR, { recursive: true });
    }

    // Read source file
    // Note: In a production V1, we should use a streaming approach for large files.
    const base64Data = await FileSystem.readAsStringAsync(sourceUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const data = Buffer.from(base64Data, 'base64');

    // Setup Cipher (AES-256-GCM)
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(keys.vaultKey, 'hex'), iv);

    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Bundle: IV (12) + Tag (16) + Ciphertext
    const bundle = Buffer.concat([iv, tag, ciphertext]);
    const targetUri = `${VAULT_DIR}${sessionId}.ethos`;

    await FileSystem.writeAsStringAsync(targetUri, bundle.toString('base64'), {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Aggressive cleaning: Delete unencrypted source
    await FileSystem.deleteAsync(sourceUri, { idempotent: true });

    return targetUri;
  },

  /**
   * Decrypts a file from the vault into a temporary cache file.
   */
  decryptFile: async (encryptedUri) => {
    const keys = getSessionKeys();
    if (!keys) throw new Error('App Locked');

    const base64Bundle = await FileSystem.readAsStringAsync(encryptedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bundle = Buffer.from(base64Bundle, 'base64');

    const iv = bundle.subarray(0, 12);
    const tag = bundle.subarray(12, 28);
    const ciphertext = bundle.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keys.vaultKey, 'hex'), iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    // Write to a temp file in cache (will be aggressive-cleaned later)
    const tempUri = `${FileSystem.cacheDirectory}decrypted_session.wav`;
    await FileSystem.writeAsStringAsync(tempUri, decrypted.toString('base64'), {
      encoding: FileSystem.EncodingType.Base64,
    });

    return tempUri;
  },

  getVaultDirectory: () => VAULT_DIR
};
