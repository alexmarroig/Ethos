import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const getVaultKey = () => {
  const keyPath = path.join(app.getPath('userData'), 'vkey');
  if (fs.existsSync(keyPath)) {
    const encryptedKey = fs.readFileSync(keyPath);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(encryptedKey);
    }
  }

  // Generate new key
  const newKey = crypto.randomBytes(32).toString('hex');
  if (safeStorage.isEncryptionAvailable()) {
    const encryptedKey = safeStorage.encryptString(newKey);
    fs.writeFileSync(keyPath, encryptedKey);
  } else {
    // Fallback if safeStorage not available (e.g. some linux setups)
    fs.writeFileSync(keyPath, newKey);
  }
  return newKey;
};

export const getVaultSalt = () => {
  const saltPath = path.join(app.getPath('userData'), 'vsalt');
  if (fs.existsSync(saltPath)) {
    return fs.readFileSync(saltPath);
  }
  const newSalt = crypto.randomBytes(16);
  fs.writeFileSync(saltPath, newSalt);
  return newSalt;
};
