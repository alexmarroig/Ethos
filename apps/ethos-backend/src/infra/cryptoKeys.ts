import crypto from "node:crypto";

const MASTER_KEY_ENV = "ETHOS_MASTER_KEY";
const DEFAULT_MASTER_KEY = "ethos-dev-master-key";

const getMasterKey = () => {
  const seed = process.env[MASTER_KEY_ENV] ?? DEFAULT_MASTER_KEY;
  return crypto.createHash("sha256").update(seed).digest();
};

const deriveKey = (saltLabel: string, keyId: string) =>
  crypto.hkdfSync("sha256", getMasterKey(), Buffer.from(saltLabel, "utf8"), Buffer.from(keyId, "utf8"), 32);

export const DATABASE_KEY_ID = "db-key-v1";
const DATABASE_KEY_SALT = "ethos-db-key-salt-v1";

export const VAULT_AUDIO_KEY_ID = "vault-audio-key-v1";
const VAULT_AUDIO_KEY_SALT = "ethos-vault-audio-key-salt-v1";

export const getDatabaseKey = () => deriveKey(DATABASE_KEY_SALT, DATABASE_KEY_ID);
export const getVaultAudioKey = () => deriveKey(VAULT_AUDIO_KEY_SALT, VAULT_AUDIO_KEY_ID);
