import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, logout as apiLogout } from '../services/api/auth';
import { setTokenProvider, setUnauthorizedHandler } from '../services/api/httpClient';
import type { AuthState, AuthUser } from '../../features/auth/types';

const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Register token provider for httpClient (dependency injection)
  useEffect(() => {
    setTokenProvider(() => token);
  }, [token]);

  // Register unauthorized handler
  useEffect(() => {
    setUnauthorizedHandler(() => {
      handleLogout();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore token from SecureStore on startup
  useEffect(() => {
    SecureStore.getItemAsync('auth_token')
      .then(stored => setToken(stored))
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleLogin(email: string, password: string) {
    const response = await apiLogin(email, password);
    const newToken = (response as any).token as string;
    await SecureStore.setItemAsync('auth_token', newToken);
    setToken(newToken);
    setUser((response as any).user as AuthUser ?? null);
  }

  async function handleLogout() {
    try { await apiLogout(); } catch { /* best effort */ }
    await SecureStore.deleteItemAsync('auth_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isLoading,
      login: handleLogin,
      logout: handleLogout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
