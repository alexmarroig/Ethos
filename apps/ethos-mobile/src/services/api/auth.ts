import { getApiBaseUrl } from "./config";
import { createHttpClient } from "./httpClient";
import type { AuthResponse } from "./types";

const authContract = {
  "/auth/login": ["post"],
  "/auth/logout": ["post"],
  "/auth/invite": ["post"],
  "/auth/accept-invite": ["post"],
} as const;

const authClient = createHttpClient({
  name: "MobileAuth",
  baseUrl: getApiBaseUrl,
  contract: authContract,
  offline: {
    enabled: false,
    cacheNamespace: "ethos_mobile_auth_cache",
  },
});

export const login = (email: string, password: string) =>
  authClient.request<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });

export const logout = () => authClient.request<{ success: boolean }>("/auth/logout", { method: "POST" });
