import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthUser = {
  name: string;
  email: string;
};

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "ethos.auth";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser;
        if (parsed?.name && parsed?.email) {
          setUser(parsed);
          setStatus("authenticated");
          return;
        }
      } catch {
        // ignore corrupted storage
      }
    }
    setStatus("unauthenticated");
  }, []);

  const login = (nextUser: AuthUser) => {
    setUser(nextUser);
    setStatus("authenticated");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  };

  const logout = () => {
    setUser(null);
    setStatus("unauthenticated");
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      logout,
    }),
    [status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
