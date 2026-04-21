"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVaultSalt = exports.getVaultKey = void 0;
const electron_1 = require("electron");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const getVaultKey = () => {
    const keyPath = node_path_1.default.join(electron_1.app.getPath('userData'), 'vkey');
    if (node_fs_1.default.existsSync(keyPath)) {
        const encryptedKey = node_fs_1.default.readFileSync(keyPath);
        if (electron_1.safeStorage.isEncryptionAvailable()) {
            return electron_1.safeStorage.decryptString(encryptedKey);
        }
    }
    // Generate new key
    const newKey = node_crypto_1.default.randomBytes(32).toString('hex');
    if (electron_1.safeStorage.isEncryptionAvailable()) {
        const encryptedKey = electron_1.safeStorage.encryptString(newKey);
        node_fs_1.default.writeFileSync(keyPath, encryptedKey);
    }
    else {
        // Fallback if safeStorage not available (e.g. some linux setups)
        node_fs_1.default.writeFileSync(keyPath, newKey);
    }
    return newKey;
};
exports.getVaultKey = getVaultKey;
const getVaultSalt = () => {
    const saltPath = node_path_1.default.join(electron_1.app.getPath('userData'), 'vsalt');
    if (node_fs_1.default.existsSync(saltPath)) {
        return node_fs_1.default.readFileSync(saltPath);
    }
    const newSalt = node_crypto_1.default.randomBytes(16);
    node_fs_1.default.writeFileSync(saltPath, newSalt);
    return newSalt;
};
exports.getVaultSalt = getVaultSalt;
