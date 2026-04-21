"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioService = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const electron_1 = require("electron");
const security_1 = require("../security");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
exports.audioService = {
    saveEncrypted: async (sourcePath, encryptionKey) => {
        const userDataPath = electron_1.app.getPath('userData');
        const vaultPath = node_path_1.default.join(userDataPath, 'vault', 'audio');
        if (!node_fs_1.default.existsSync(vaultPath)) {
            node_fs_1.default.mkdirSync(vaultPath, { recursive: true });
        }
        const fileId = node_crypto_1.default.randomUUID();
        const targetPath = node_path_1.default.join(vaultPath, `${fileId}.enc`);
        const salt = (0, security_1.getVaultSalt)();
        const key = node_crypto_1.default.scryptSync(encryptionKey, salt, 32);
        const iv = node_crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = node_crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        const input = node_fs_1.default.createReadStream(sourcePath);
        const output = node_fs_1.default.createWriteStream(targetPath);
        output.write(iv);
        await new Promise((resolve, reject) => {
            input.pipe(cipher).pipe(output);
            cipher.on('finish', () => {
                const authTag = cipher.getAuthTag();
                node_fs_1.default.appendFileSync(targetPath, authTag);
                resolve(null);
            });
            input.on('error', reject);
            output.on('error', reject);
        });
        return targetPath;
    },
    decryptToTemp: async (encryptedPath, encryptionKey) => {
        const tempPath = node_path_1.default.join(electron_1.app.getPath('temp'), `ethos-temp-${node_crypto_1.default.randomUUID()}.wav`);
        const salt = (0, security_1.getVaultSalt)();
        const key = node_crypto_1.default.scryptSync(encryptionKey, salt, 32);
        const fileBuffer = node_fs_1.default.readFileSync(encryptedPath);
        const iv = fileBuffer.subarray(0, IV_LENGTH);
        const authTag = fileBuffer.subarray(fileBuffer.length - AUTH_TAG_LENGTH);
        const encryptedData = fileBuffer.subarray(IV_LENGTH, fileBuffer.length - AUTH_TAG_LENGTH);
        const decipher = node_crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        node_fs_1.default.writeFileSync(tempPath, decrypted);
        return tempPath;
    },
    delete: (filePath) => {
        if (node_fs_1.default.existsSync(filePath)) {
            node_fs_1.default.unlinkSync(filePath);
        }
    }
};
