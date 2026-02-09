import crypto from "node:crypto";

import { getVaultAudioKey, VAULT_AUDIO_KEY_ID } from "./cryptoKeys";

const VAULT_AUDIO_ENVELOPE_VERSION = "vault-audio-v1";
const AES_GCM_ALGO = "aes-256-gcm";
const IV_BYTES = 12;

const encode = (value: Buffer) => value.toString("base64");
const decode = (value: string) => Buffer.from(value, "base64");

export const encryptVaultAudioPath = (raw: string) => {
  const key = getVaultAudioKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(AES_GCM_ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VAULT_AUDIO_ENVELOPE_VERSION, VAULT_AUDIO_KEY_ID, encode(iv), encode(tag), encode(ciphertext)].join(":");
};

export const decryptVaultAudioPath = (payload: string) => {
  const [version, keyId, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== VAULT_AUDIO_ENVELOPE_VERSION) {
    throw new Error("Unsupported vault audio payload version");
  }
  if (keyId !== VAULT_AUDIO_KEY_ID) {
    throw new Error("Unsupported vault audio key identifier");
  }
  const key = getVaultAudioKey();
  const decipher = crypto.createDecipheriv(AES_GCM_ALGO, key, decode(ivB64));
  decipher.setAuthTag(decode(tagB64));
  const plaintext = Buffer.concat([decipher.update(decode(dataB64)), decipher.final()]);
  return plaintext.toString("utf8");
};
