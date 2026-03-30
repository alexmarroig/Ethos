import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";

import { login as loginRequest, logout as logoutRequest } from "../services/api/auth";
import { setHttpClientAuthToken, setHttpClientSessionInvalidHandler } from "../services/api/httpClient";
import type { AuthResponse, AuthUser } from "../services/api/types";

type AuthSession = AuthResponse;

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isSubmitting: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AUTH_STORAGE_KEY = "ethos_mobile_auth_session";
const APP_ROLES = new Set(["user", "assistente", "supervisor", "patient"]);

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredSession = async (): Promise<AuthSession | null> => {
  const raw = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    return null;
  }
};

const persistStoredSession = async (session: AuthSession | null) => {
  if (!session) {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    return;
  }

  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applySession = useCallback(async (nextSession: AuthSession | null) => {
    setSession(nextSession);
    setHttpClientAuthToken(nextSession?.token ?? null);
    await persistStoredSession(nextSession);
  }, []);

  const forceLogout = useCallback(async () => {
    await applySession(null);
  }, [applySession]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const storedSession = await readStoredSession();
        if (!mounted) return;
        setSession(storedSession);
        setHttpClientAuthToken(storedSession?.token ?? null);
      } finally {
        if (mounted) setIsHydrating(false);
      }
    };

    setHttpClientSessionInvalidHandler(async () => {
      await forceLogout();
    });

    void bootstrap();

    return () => {
      mounted = false;
      setHttpClientSessionInvalidHandler(null);
    };
  }, [forceLogout]);

  const login = useCallback(async (email: string, password: string) => {
    setIsSubmitting(true);
    try {
      const nextSession = await loginRequest(email, password);
      if (!APP_ROLES.has(nextSession.user.role)) {
        throw new Error("Esta conta nao possui acesso ao aplicativo mobile.");
      }

      await applySession(nextSession);
    } finally {
      setIsSubmitting(false);
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      if (session?.token) {
        await logoutRequest();
      }
    } catch {
      // best effort logout
    } finally {
      await applySession(null);
    }
  }, [applySession, session?.token]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: Boolean(session?.token),
    isHydrating,
    isSubmitting,
    login,
    logout,
  }), [isHydrating, isSubmitting, login, logout, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
