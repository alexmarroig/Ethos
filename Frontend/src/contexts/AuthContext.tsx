import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { localEntitlementsApi } from "@/api/clinical";
import { ENABLE_DEMO_LOGIN } from "@/config/runtime";
import { setOnUnauthorized } from "@/services/apiClient";
import { authService } from "@/services/authService";
import { clearControlToken, setControlToken } from "@/services/controlClient";
import { controlAuthService } from "@/services/controlAuthService";
import {
  clearLegacyAuthStorage,
  WEB_AUTH_EXPIRY_KEY,
  WEB_AUTH_STORAGE_KEY,
  WEB_CLOUD_AUTH_KEY,
} from "@/services/authStorage";

export type UserRole = "admin" | "professional" | "patient";
type IncomingRole = UserRole | "user" | "assistente" | "supervisor";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCloudAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_USERS: Record<string, User> = {
  "admin@admin": {
    id: "dev-admin-1",
    email: "admin@admin",
    name: "Administrador",
    role: "admin",
    token: "dev-token-admin",
  },
  "camila@admin": {
    id: "dev-pro-1",
    email: "camila@admin",
    name: "Camila (Psicologa)",
    role: "professional",
    token: "dev-token-professional",
  },
  "paciente@admin": {
    id: "dev-patient-1",
    email: "paciente@admin",
    name: "Paciente Teste",
    role: "patient",
    token: "dev-token-patient",
  },
};

const DEV_PASSWORD = "bianco256";
const EXPIRY_MS = 24 * 60 * 60 * 1000;

function normalizeRole(role: IncomingRole | string | undefined): UserRole {
  switch (role) {
    case "admin":
      return "admin";
    case "patient":
      return "patient";
    case "professional":
    case "user":
    case "assistente":
    case "supervisor":
    default:
      return "professional";
  }
}

function normalizeUser(
  raw: Pick<User, "id" | "email" | "name"> & { role?: IncomingRole | string; token?: string }
): User {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    role: normalizeRole(raw.role),
    token: raw.token,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudAuthenticated, setIsCloudAuthenticated] = useState(false);
  const loggingOut = { current: false };

  const doLogout = () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    setUser(null);
    setIsCloudAuthenticated(false);
    localStorage.removeItem(WEB_AUTH_STORAGE_KEY);
    localStorage.removeItem(WEB_AUTH_EXPIRY_KEY);
    localStorage.removeItem(WEB_CLOUD_AUTH_KEY);
    clearControlToken();
    authService
      .logout()
      .catch(() => {})
      .finally(() => {
        loggingOut.current = false;
      });
  };

  useEffect(() => {
    setOnUnauthorized(() => {
      doLogout();
    });
  }, []);

  useEffect(() => {
    clearLegacyAuthStorage();
  }, []);

  useEffect(() => {
    const restore = async () => {
      const stored = localStorage.getItem(WEB_AUTH_STORAGE_KEY);
      const expiry = localStorage.getItem(WEB_AUTH_EXPIRY_KEY);

      if (stored && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          try {
            const restoredUser = normalizeUser(JSON.parse(stored));
            setIsCloudAuthenticated(localStorage.getItem(WEB_CLOUD_AUTH_KEY) === "true");

            if (restoredUser.token && !restoredUser.token.startsWith("dev-")) {
              const check = await localEntitlementsApi.get();
              if (!check.success && check.status === 401) {
                doLogout();
                setIsLoading(false);
                return;
              }
            }

            setUser(restoredUser);
          } catch {
            localStorage.removeItem(WEB_AUTH_STORAGE_KEY);
            localStorage.removeItem(WEB_AUTH_EXPIRY_KEY);
          }
        } else {
          localStorage.removeItem(WEB_AUTH_STORAGE_KEY);
          localStorage.removeItem(WEB_AUTH_EXPIRY_KEY);
          localStorage.removeItem(WEB_CLOUD_AUTH_KEY);
          clearControlToken();
        }
      }

      setIsLoading(false);
    };

    void restore();
  }, []);

  const persistUser = (u: User, cloudAuth: boolean) => {
    const normalized = normalizeUser(u);
    setUser(normalized);
    setIsCloudAuthenticated(cloudAuth);
    localStorage.setItem(WEB_AUTH_STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(WEB_AUTH_EXPIRY_KEY, String(Date.now() + EXPIRY_MS));
    localStorage.setItem(WEB_CLOUD_AUTH_KEY, String(cloudAuth));
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const clinicalResult = await authService.login(email, password);
    if (clinicalResult.success) {
      persistUser(
        normalizeUser({
          ...clinicalResult.data.user,
          token: clinicalResult.data.token,
        }),
        false
      );
      return true;
    }

    const cloudResult = await controlAuthService.login(email, password);
    if (cloudResult.success) {
      setControlToken(cloudResult.data.token);
      persistUser(
        normalizeUser({
          ...cloudResult.data.user,
        }),
        true
      );
      return true;
    }

    if (ENABLE_DEMO_LOGIN) {
      const devUser = DEV_USERS[email.toLowerCase()];
      if (devUser && password === DEV_PASSWORD) {
        persistUser(devUser, false);
        return true;
      }
    }

    return false;
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isCloudAuthenticated,
        login,
        logout: doLogout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
