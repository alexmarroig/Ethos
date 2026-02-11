import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const SALT_KEY = 'ethos_instance_salt';
const ITERATIONS = 600000; // OWASP recommendation for PBKDF2-HMAC-SHA256
const KEY_SIZE = 256 / 32; // CryptoJS expects size in words

/**
 * Gets or creates a unique salt for this device instance.
 * This salt is stored in SecureStore.
 */
export const getInstanceSalt = async () => {
  let salt = await SecureStore.getItemAsync(SALT_KEY);
  if (!salt) {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    salt = CryptoJS.lib.WordArray.create(randomBytes).toString(CryptoJS.enc.Base64);
    await SecureStore.setItemAsync(SALT_KEY, salt);
  }
  return salt;
};

/**
 * Derives the DB and Vault keys from the master password using PBKDF2.
 * @param {string} password - The user's master password.
 */
export const deriveKeys = async (password) => {
  const salt = await getInstanceSalt();

  // Derive a master key first
  const masterKey = CryptoJS.PBKDF2(password, CryptoJS.enc.Base64.parse(salt), {
    keySize: KEY_SIZE * 2, // We want enough bits for two keys
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256
  }).toString();

  // Split the master key into DB Key and Vault Key
  const dbKey = masterKey.substring(0, 64); // 256 bits in hex
  const vaultKey = masterKey.substring(64, 128); // another 256 bits

  return {
    dbKey,
    vaultKey
  };
};

/**
 * Persists the derived keys in SecureStore (Optional, depends on security policy).
 * For ETHOS, we might prefer keeping them in memory only while unlocked.
 */
let sessionKeys = null;

export const setSessionKeys = (keys) => {
  sessionKeys = keys;
};

export const getSessionKeys = () => sessionKeys;

export const clearSessionKeys = () => {
  sessionKeys = null;
};
