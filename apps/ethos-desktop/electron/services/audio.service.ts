import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';
import { getVaultSalt } from '../security';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export const audioService = {
  saveEncrypted: async (sourcePath: string, encryptionKey: string): Promise<string> => {
    const userDataPath = app.getPath('userData');
    const vaultPath = path.join(userDataPath, 'vault', 'audio');

    if (!fs.existsSync(vaultPath)) {
      fs.mkdirSync(vaultPath, { recursive: true });
    }

    const fileId = crypto.randomUUID();
    const targetPath = path.join(vaultPath, `${fileId}.enc`);

    const salt = getVaultSalt();
    const key = crypto.scryptSync(encryptionKey, salt, 32);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const input = fs.createReadStream(sourcePath);
    const output = fs.createWriteStream(targetPath);

    output.write(iv);

    await new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output);
      cipher.on('finish', () => {
        const authTag = cipher.getAuthTag();
        fs.appendFileSync(targetPath, authTag);
        resolve(null);
      });
      input.on('error', reject);
      output.on('error', reject);
    });

    return targetPath;
  },

  decryptToTemp: async (encryptedPath: string, encryptionKey: string): Promise<string> => {
    const tempPath = path.join(app.getPath('temp'), `ethos-temp-${crypto.randomUUID()}.wav`);

    const salt = getVaultSalt();
    const key = crypto.scryptSync(encryptionKey, salt, 32);
    const fileBuffer = fs.readFileSync(encryptedPath);

    const iv = fileBuffer.subarray(0, IV_LENGTH);
    const authTag = fileBuffer.subarray(fileBuffer.length - AUTH_TAG_LENGTH);
    const encryptedData = fileBuffer.subarray(IV_LENGTH, fileBuffer.length - AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    fs.writeFileSync(tempPath, decrypted);

    return tempPath;
  },

  delete: (filePath: string): void => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};
