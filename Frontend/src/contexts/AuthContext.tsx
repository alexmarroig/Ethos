import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authService } from "@/services/authService";
import { controlAuthService } from "@/services/controlAuthService";
import { setControlToken, clearControlToken } from "@/services/controlClient";
import { setOnUnauthorized } from "@/services/apiClient";
import { localEntitlementsApi } from "@/api/clinical";
import { IS_DEV } from "@/config/runtime";

export type UserRole = "admin" | "professional" | "patient";

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

// DEV-only fallback credentials
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

const STORAGE_KEY = "ethos_user";
const EXPIRY_KEY = "ethos_user_expiry";
const CLOUD_AUTH_KEY = "ethos_cloud_auth";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudAuthenticated, setIsCloudAuthenticated] = useState(false);

  // Guard against re-entrant logout calls
  const loggingOut = { current: false };

  const doLogout = () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    setUser(null);
    setIsCloudAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(CLOUD_AUTH_KEY);
    clearControlToken();
    authService.logout().catch(() => {}).finally(() => {
      loggingOut.current = false;
    });
  };

  // Register the global 401 interceptor
  useEffect(() => {
    setOnUnauthorized(() => {
      doLogout();
    });
  }, []);

  useEffect(() => {
    const restore = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const expiry = localStorage.getItem(EXPIRY_KEY);

      if (stored && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          try {
            const restoredUser: User = JSON.parse(stored);
            setIsCloudAuthenticated(localStorage.getItem(CLOUD_AUTH_KEY) === "true");

            // Validate token with a lightweight call
            if (restoredUser.token && !restoredUser.token.startsWith("dev-")) {
              const check = await localEntitlementsApi.get();
              if (!check.success && check.status === 401) {
                // Token expired — force logout
                doLogout();
                setIsLoading(false);
                return;
              }
            }

            setUser(restoredUser);
          } catch {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(EXPIRY_KEY);
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(EXPIRY_KEY);
          localStorage.removeItem(CLOUD_AUTH_KEY);
          clearControlToken();
        }
      }
      setIsLoading(false);
    };

    restore();
  }, []);

  const persistUser = (u: User, cloudAuth: boolean) => {
    setUser(u);
    setIsCloudAuthenticated(cloudAuth);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + EXPIRY_MS));
    localStorage.setItem(CLOUD_AUTH_KEY, String(cloudAuth));
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    let cloudOk = false;

    // 1. Try Control Plane (cloud) first
    const cloudResult = await controlAuthService.login(email, password);
    if (cloudResult.success) {
      cloudOk = true;
      setControlToken(cloudResult.data.token);
    }

    // 2. Try Clinical Plane (local)
    const clinicalResult = await authService.login(email, password);
    if (clinicalResult.success) {
      const u: User = {
        ...clinicalResult.data.user,
        token: clinicalResult.data.token,
      };
      persistUser(u, cloudOk);
      return true;
    }

    // 3. If cloud succeeded but clinical failed — cloud-only mode
    if (cloudOk && cloudResult.success) {
      const u: User = {
        ...cloudResult.data.user,
      };
      persistUser(u, true);
      return true;
    }

    // 4. DEV fallback
    if (IS_DEV) {
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
