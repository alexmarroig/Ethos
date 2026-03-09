// ethos-mobile/src/services/api/auth.ts
import { createHttpClient } from './httpClient';

const API_BASE_URL = 'http://localhost:8787';

// Define the contract matching openapi.yaml
const authContract = {
    '/auth/login': ['post'],
    '/auth/logout': ['post'],
    '/auth/invite': ['post'],
    '/auth/accept-invite': ['post'],
} as const;

let currentToken: string | null = null; // In a real app, load from SecureStore

export const setToken = (token: string | null) => {
    currentToken = token;
};

const authClient = createHttpClient({
    name: 'MobileAuth',
    baseUrl: API_BASE_URL,
    contract: authContract,
    getAuthToken: () => currentToken,
    offline: {
        enabled: true,
        cacheNamespace: 'ethos_mobile_auth_cache',
    },
});

export const login = async (password: string) => {
    // Note: The openapi spec doesn't specify the exact login payload, 
    // but typically it might just be password for a local offline-first app, or email/password.
    // For this prototype, we'll assume a local password login.
    const response = await authClient.request<{ token: string, user: any }>('/auth/login', {
        method: 'POST',
        body: { password }
    });

    if (response.token) {
        setToken(response.token);
    }

    return response;
};

export const logout = async () => {
    await authClient.request('/auth/logout', { method: 'POST' });
    setToken(null);
};
