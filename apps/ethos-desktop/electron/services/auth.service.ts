import { getDb } from '../db';
import { safeStorage } from 'electron';

export const authService = {
  login: (email: string, passwordHash: string) => {
    const db = getDb();
    const user = db.prepare('SELECT id, email, role, fullName FROM users WHERE email = ? AND passwordHash = ?')
      .get(email, passwordHash) as any;

    if (user) {
      return {
        success: true,
        user
      };
    }
    return { success: false, message: 'Credenciais inválidas' };
  },

  saveCredentials: (email: string, token: string) => {
    if (safeStorage.isEncryptionAvailable()) {
      const encryptedToken = safeStorage.encryptString(token);
      // Here we could store in a local config file or DB
      // For simplicity in this demo, we'll return it to be stored by the caller in a safe place
      // but typically we'd use electron-store or similar.
      return encryptedToken.toString('base64');
    }
    return token;
  },

  decryptToken: (encryptedTokenBase64: string) => {
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(encryptedTokenBase64, 'base64');
        return safeStorage.decryptString(buffer);
      } catch (e) {
        return null;
      }
    }
    return encryptedTokenBase64;
  }
};
