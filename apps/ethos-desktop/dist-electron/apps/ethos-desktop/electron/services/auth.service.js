"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const db_1 = require("../db");
const electron_1 = require("electron");
const node_crypto_1 = __importDefault(require("node:crypto"));
const ITERATIONS = 210_000;
const KEY_LEN = 32;
const DIGEST = 'sha512';
function deriveKey(password, saltHex) {
    const salt = saltHex
        ? Buffer.from(saltHex, 'hex')
        : node_crypto_1.default.randomBytes(16);
    const key = node_crypto_1.default.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST);
    return {
        key,
        salt: salt.toString('hex')
    };
}
exports.authService = {
    login: (email, password) => {
        const db = (0, db_1.getDb)();
        // ⚠️ ideal: comparar hash real (ajustar depois)
        const user = db.prepare(`
      SELECT id, email, role, fullName, salt
      FROM users 
      WHERE email = ?
    `).get(email);
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
    encryptToken: (token) => {
        if (electron_1.safeStorage.isEncryptionAvailable()) {
            const encryptedToken = electron_1.safeStorage.encryptString(token);
            return encryptedToken.toString('base64');
        }
        return token;
    },
    decryptToken: (encryptedTokenBase64) => {
        if (electron_1.safeStorage.isEncryptionAvailable()) {
            try {
                const buffer = Buffer.from(encryptedTokenBase64, 'base64');
                return electron_1.safeStorage.decryptString(buffer);
            }
            catch {
                return null;
            }
        }
        return encryptedTokenBase64;
    }
};
