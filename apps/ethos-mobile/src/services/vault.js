import { Buffer } from 'buffer';
import AesGcmCrypto from 'react-native-aes-gcm-crypto';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { getSessionKeys } from './security';

const VAULT_DIR = `${FileSystem.documentDirectory}vault/`;

// AES-256-GCM encrypt using Web Crypto API (available in RN 0.71+)
const encryptBuffer = async (data, keyHex) => {
  const keyBytes = Buffer.from(keyHex, 'hex');
  const iv = await Crypto.getRandomBytesAsync(12);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  // Prepend IV (12 bytes) to ciphertext+tag
  const result = new Uint8Array(12 + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), 12);
  return result;
};

// AES-256-GCM decrypt using Web Crypto API
const decryptBuffer = async (data, keyHex) => {
  const keyBytes = Buffer.from(keyHex, 'hex');
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  return new Uint8Array(plaintext);
};

export const vaultService = {
  /**
   * Encrypts an audio file and saves it to the vault.
   * Uses streaming-capable native implementation to avoid OOM.
   * Uses AES-256-GCM via Web Crypto API.
   */
  encryptFile: async (sourceUri, sessionId) => {
    const keys = getSessionKeys();
    if (!keys) throw new Error('App Locked: Chaves não disponíveis.');

    // Ensure vault exists
    const dirInfo = await FileSystem.getInfoAsync(VAULT_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(VAULT_DIR, { recursive: true });
    }

    const targetUri = `${VAULT_DIR}${sessionId}.ethos`;
    const sourcePath = sourceUri.replace('file://', '');
    const targetPath = targetUri.replace('file://', '');

    // Setup Cipher (AES-256-GCM)
    // react-native-aes-gcm-crypto handles IV and Tag internally or via params
    // Using encryptFile for better performance/memory
    await AesGcmCrypto.encryptFile(
      sourcePath,
      targetPath,
      keys.vaultKey,
      null // Auto-generate IV
    // Read source file as base64, convert to binary
    const sourceBase64 = await FileSystem.readAsStringAsync(sourceUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const sourceBytes = Buffer.from(sourceBase64, 'base64');

    // Encrypt
    const encrypted = await encryptBuffer(sourceBytes, keys.vaultKey);

    // Write encrypted file as base64
    await FileSystem.writeAsStringAsync(
      targetUri,
      Buffer.from(encrypted).toString('base64'),
      { encoding: FileSystem.EncodingType.Base64 }
    );

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

    const tempUri = `${FileSystem.cacheDirectory}decrypted_session.wav`;
    const sourcePath = encryptedUri.replace('file://', '');
    const targetPath = tempUri.replace('file://', '');

    await AesGcmCrypto.decryptFile(
      sourcePath,
      targetPath,
      keys.vaultKey

    // Read encrypted file
    const encryptedBase64 = await FileSystem.readAsStringAsync(encryptedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const encryptedBytes = Buffer.from(encryptedBase64, 'base64');

    // Decrypt
    const decrypted = await decryptBuffer(encryptedBytes, keys.vaultKey);

    // Write decrypted file
    await FileSystem.writeAsStringAsync(
      tempUri,
      Buffer.from(decrypted).toString('base64'),
      { encoding: FileSystem.EncodingType.Base64 }
    );

    return tempUri;
  },

  getVaultDirectory: () => VAULT_DIR
};
