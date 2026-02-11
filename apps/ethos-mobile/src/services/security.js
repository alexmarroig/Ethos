import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const SALT_KEY = 'ethos_instance_salt';
const ITERATIONS = 600000;
const KEY_SIZE_WORDS = 256 / 32;

const deriveScopedKey = (masterKeyHex, scope) => {
  return CryptoJS.PBKDF2(masterKeyHex, scope, {
    keySize: KEY_SIZE_WORDS,
    iterations: 1,
    hasher: CryptoJS.algo.SHA256,
  }).toString();
};

export const getInstanceSalt = async () => {
  let salt = await SecureStore.getItemAsync(SALT_KEY);
  if (!salt) {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    salt = CryptoJS.lib.WordArray.create(randomBytes).toString(CryptoJS.enc.Base64);
    await SecureStore.setItemAsync(SALT_KEY, salt);
  }
  return salt;
};

export const deriveKeys = async (password) => {
  const salt = await getInstanceSalt();

  const masterKeyHex = CryptoJS.PBKDF2(password, CryptoJS.enc.Base64.parse(salt), {
    keySize: KEY_SIZE_WORDS,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  }).toString();

  const dbKey = deriveScopedKey(masterKeyHex, 'ETHOS_DB_KEY_V1');
  const vaultKey = deriveScopedKey(masterKeyHex, 'ETHOS_VAULT_KEY_V1');

  return {
    dbKey,
    vaultKey,
    meta: {
      iterations: ITERATIONS,
    },
  };
};

let sessionKeys = null;

export const setSessionKeys = (keys) => {
  sessionKeys = keys;
};

export const getSessionKeys = () => sessionKeys;

export const clearSessionKeys = () => {
  sessionKeys = null;
};
