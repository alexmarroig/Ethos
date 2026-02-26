import { Buffer } from 'buffer';
import AesGcmCrypto from 'react-native-aes-gcm-crypto';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { mockAesGcm, mockFileSystem } from './webMocks';
import { getSessionKeys } from './security';

const AesLib = Platform.OS === 'web' ? mockAesGcm : AesGcmCrypto;
const FileSystemLib = Platform.OS === 'web' ? mockFileSystem : FileSystem;

const VAULT_DIR = `${FileSystemLib.documentDirectory}vault/`;

export const vaultService = {
  /**
   * Encrypts an audio file and saves it to the vault.
   * Uses streaming-capable native implementation to avoid OOM.
   */
  encryptFile: async (sourceUri, sessionId) => {
    const keys = getSessionKeys();
    if (!keys && Platform.OS !== 'web') throw new Error('App Locked: Chaves não disponíveis.');

    // Ensure vault exists
    const dirInfo = await FileSystemLib.getInfoAsync(VAULT_DIR);
    if (!dirInfo.exists) {
      await FileSystemLib.makeDirectoryAsync(VAULT_DIR, { recursive: true });
    }

    const targetUri = `${VAULT_DIR}${sessionId}.ethos`;
    const sourcePath = sourceUri.replace('file://', '');
    const targetPath = targetUri.replace('file://', '');

    // Setup Cipher (AES-256-GCM)
    // react-native-aes-gcm-crypto handles IV and Tag internally or via params
    // Using encryptFile for better performance/memory
    await AesLib.encryptFile(
      sourcePath,
      targetPath,
      keys?.vaultKey || 'mock-key',
      null // Auto-generate IV
    );

    // Aggressive cleaning: Delete unencrypted source
    await FileSystemLib.deleteAsync(sourceUri, { idempotent: true });

    return targetUri;
  },

  /**
   * Decrypts a file from the vault into a temporary cache file.
   */
  decryptFile: async (encryptedUri) => {
    const keys = getSessionKeys();
    if (!keys && Platform.OS !== 'web') throw new Error('App Locked');

    const tempUri = `${FileSystemLib.cacheDirectory}decrypted_session.wav`;
    const sourcePath = encryptedUri.replace('file://', '');
    const targetPath = tempUri.replace('file://', '');

    await AesLib.decryptFile(
      sourcePath,
      targetPath,
      keys?.vaultKey || 'mock-key'
    );

    return tempUri;
  },

  getVaultDirectory: () => VAULT_DIR
};
