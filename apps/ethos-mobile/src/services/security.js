import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const SALT_KEY = 'ethos_instance_salt';
const ITERATIONS = 600000;
const KEY_SIZE = 256 / 32;

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
  const masterKey = CryptoJS.PBKDF2(password, CryptoJS.enc.Base64.parse(salt), {
    keySize: KEY_SIZE * 2,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256
  }).toString();

  const dbKey = masterKey.substring(0, 64);
  const vaultKey = masterKey.substring(64, 128);

  return { dbKey, vaultKey };
};

let sessionKeys = null;
export const setSessionKeys = (keys) => { sessionKeys = keys; };
export const getSessionKeys = () => sessionKeys;
export const clearSessionKeys = () => { sessionKeys = null; };
