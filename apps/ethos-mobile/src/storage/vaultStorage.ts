import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { VAULT_DIR } from "./secureDirectories";

const MASTER_KEY_ID = "ethos.mobile.master-key";
const VAULT_KEY_SALT_ID = "ethos.mobile.vault-salt";
const VAULT_KEY_INFO = "ethos-vault-audio-key-v1";

type VaultPayload = {
  version: 1;
  iv: string;
  salt: string;
  ciphertext: string;
};

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const fromBase64 = (value: string) => new Uint8Array(Buffer.from(value, "base64"));

const getCrypto = () => {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error("Crypto indisponível para cifrar vault.");
  }
  return globalThis.crypto;
};

const getOrCreateSecret = async (key: string, bytes: number) => {
  const existing = await SecureStore.getItemAsync(key);
  if (existing) return existing;
  const crypto = getCrypto();
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  const encoded = toBase64(buffer);
  await SecureStore.setItemAsync(key, encoded);
  return encoded;
};

const deriveVaultKey = async (saltOverride?: string) => {
  const crypto = getCrypto();
  const masterKeyBase64 = await getOrCreateSecret(MASTER_KEY_ID, 32);
  const saltBase64 = saltOverride ?? (await getOrCreateSecret(VAULT_KEY_SALT_ID, 16));
  const masterKey = fromBase64(masterKeyBase64);
  const salt = fromBase64(saltBase64);

  const baseKey = await crypto.subtle.importKey("raw", masterKey, "HKDF", false, ["deriveKey"]);
  return {
    salt: saltBase64,
    key: await crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt,
        info: Buffer.from(VAULT_KEY_INFO),
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    ),
  };
};

const encryptBuffer = async (plain: Uint8Array) => {
  const crypto = getCrypto();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const { key, salt } = await deriveVaultKey();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return {
    payload: {
      version: 1,
      iv: toBase64(iv),
      salt,
      ciphertext: toBase64(new Uint8Array(ciphertext)),
    } satisfies VaultPayload,
  };
};

const decryptBuffer = async (payload: VaultPayload) => {
  const crypto = getCrypto();
  const { key } = await deriveVaultKey(payload.salt);
  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ciphertext);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new Uint8Array(plain);
};

export const ensureVaultDir = async () => {
  if (!VAULT_DIR) return;
  try {
    await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("exists")) {
      throw error;
    }
  }
};

export const vaultPathFor = (recordingId: string) => `${VAULT_DIR}/${recordingId}.vault`;

export const storeEncryptedAudio = async (recordingId: string, fileUri: string) => {
  await ensureVaultDir();
  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
  const plain = fromBase64(base64);
  const { payload } = await encryptBuffer(plain);
  const target = vaultPathFor(recordingId);
  await FileSystem.writeAsStringAsync(target, JSON.stringify(payload), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await FileSystem.deleteAsync(fileUri, { idempotent: true });
  return target;
};

export const decryptAudioToCache = async (vaultUri: string, targetPath: string) => {
  const payloadRaw = await FileSystem.readAsStringAsync(vaultUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const payload = JSON.parse(payloadRaw) as VaultPayload;
  const plain = await decryptBuffer(payload);
  await FileSystem.writeAsStringAsync(targetPath, toBase64(plain), {
    encoding: FileSystem.EncodingType.Base64,
  });
};

export const hashFileSha256 = async (fileUri: string) => {
  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
};
