export const WEB_AUTH_STORAGE_KEY = "ethos_web_user_v2";
export const WEB_AUTH_EXPIRY_KEY = "ethos_web_user_expiry_v2";
export const WEB_CLOUD_AUTH_KEY = "ethos_web_cloud_auth_v2";
export const WEB_CONTROL_TOKEN_KEY = "ethos_web_control_token_v2";

export type StoredAuthUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  token?: string;
};

export function readStoredAuthUser(): StoredAuthUser | null {
  try {
    const raw = localStorage.getItem(WEB_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthUser;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearLegacyAuthStorage() {
  const legacyKeys = [
    "ethos_user",
    "ethos_user_expiry",
    "ethos_cloud_auth",
    "ethos_control_token",
  ];

  for (const key of legacyKeys) {
    localStorage.removeItem(key);
  }
}
