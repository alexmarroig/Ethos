import { createHttpClient } from './httpClient';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

const authContract = {
  '/auth/login': ['post'],
  '/auth/logout': ['post'],
  '/auth/invite': ['post'],
  '/auth/accept-invite': ['post'],
} as const;

const authClient = createHttpClient({
  name: 'MobileAuth',
  baseUrl: API_BASE_URL,
  contract: authContract,
  // token is injected globally via setTokenProvider in useAuth
});

export const login = async (email: string, password: string) => {
  return authClient.request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
};

export const logout = async () => {
  await authClient.request('/auth/logout', { method: 'POST' });
};
