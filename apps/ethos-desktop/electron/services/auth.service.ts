import { getDb } from '../db';
import { safeStorage } from 'electron';
import crypto from 'node:crypto';

const ITERATIONS = 210_000;
const KEY_LEN = 32;
const DIGEST = 'sha512';

function deriveKey(password: string, saltHex?: string) {
  const salt = saltHex
    ? Buffer.from(saltHex, 'hex')
    : crypto.randomBytes(16);

  const key = crypto.pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LEN,
    DIGEST
  );

  return {
    key,
    salt: salt.toString('hex')
  };
}

export const authService = {
  login: (email: string, password: string) => {
    const db = getDb();

    // ⚠️ ideal: comparar hash real (ajustar depois)
    const user = db.prepare(`
      SELECT id, email, role, fullName, salt
      FROM users 
      WHERE email = ?
    `).get(email) as any;

    if (!user) {
      return { success: false, message: 'Credenciais inválidas' };
    }

    // 🔐 Derivar chave criptográfica do usuário
    const { key, salt } = deriveKey(password, user.salt);

    // salvar salt se não existir
    if (!user.salt) {
      db.prepare('UPDATE users SET salt = ? WHERE id = ?')
        .run(salt, user.id);
    }

    return {
      success: true,
      user,
      encryptionKey: key // ⚠️ NÃO persistir
    };
  },

  encryptToken: (token: string) => {
    if (safeStorage.isEncryptionAvailable()) {
      const encryptedToken = safeStorage.encryptString(token);
      return encryptedToken.toString('base64');
    }
    return token;
  },

  decryptToken: (encryptedTokenBase64: string) => {
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(encryptedTokenBase64, 'base64');
        return safeStorage.decryptString(buffer);
      } catch {
        return null;
      }
    }
    return encryptedTokenBase64;
  }
};