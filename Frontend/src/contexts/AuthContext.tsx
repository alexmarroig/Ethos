import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { localEntitlementsApi } from "@/api/clinical";
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
  avatar_url?: string;
  crp?: string;
  specialty?: string;
  clinical_approach?: string;
  role: UserRole;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCloudAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: Partial<User>) => Promise<boolean>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
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
  raw: Pick<User, "id" | "email" | "name"> & {
    avatar_url?: string;
    crp?: string;
    specialty?: string;
    clinical_approach?: string;
    role?: IncomingRole | string;
    token?: string;
  }
): User {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    avatar_url: raw.avatar_url,
    crp: raw.crp,
    specialty: raw.specialty,
    clinical_approach: raw.clinical_approach,
    role: normalizeRole(raw.role),
    token: raw.token,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudAuthenticated, setIsCloudAuthenticated] = useState(false);
  const loggingOut = useRef(false);

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
      const params = new URLSearchParams(window.location.search);
      const tokenFromUrl = params.get("token");

      if (tokenFromUrl) {
        localStorage.setItem(
          WEB_AUTH_STORAGE_KEY,
          JSON.stringify({ token: tokenFromUrl }),
        );
        localStorage.setItem(WEB_AUTH_EXPIRY_KEY, String(Date.now() + EXPIRY_MS));
        localStorage.setItem(WEB_CLOUD_AUTH_KEY, "false");

        const me = await authService.me();
        if (me.success) {
          persistUser(
            normalizeUser({
              ...me.data,
              token: tokenFromUrl,
            }),
            false,
          );
          const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
          window.history.replaceState({}, document.title, cleanUrl);
          setIsLoading(false);
          return;
        }

        localStorage.removeItem(WEB_AUTH_STORAGE_KEY);
        localStorage.removeItem(WEB_AUTH_EXPIRY_KEY);
        localStorage.removeItem(WEB_CLOUD_AUTH_KEY);
      }

      const stored = localStorage.getItem(WEB_AUTH_STORAGE_KEY);
      const expiry = localStorage.getItem(WEB_AUTH_EXPIRY_KEY);

      if (stored && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          try {
            const restoredUser = normalizeUser(JSON.parse(stored));
            if (restoredUser.token?.startsWith("dev-")) {
              doLogout();
              setIsLoading(false);
              return;
            }

            setIsCloudAuthenticated(localStorage.getItem(WEB_CLOUD_AUTH_KEY) === "true");

            if (restoredUser.token) {
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
            localStorage.removeItem(WEB_CLOUD_AUTH_KEY);
            clearControlToken();
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

  const persistUser = (nextUser: User, cloudAuth: boolean) => {
    const normalized = normalizeUser(nextUser);
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

    return false;
  };

  const refreshUser = async () => {
    if (!user?.token) return;
    const result = await authService.me();
    if (!result.success) return;
    persistUser(
      normalizeUser({
        ...result.data,
        token: user.token,
      }),
      false
    );
  };

  const updateProfile = async (payload: Partial<User>): Promise<boolean> => {
    const result = await authService.updateMe({
      name: payload.name,
      email: payload.email,
      avatar_url: payload.avatar_url,
      crp: payload.crp,
      specialty: payload.specialty,
      clinical_approach: payload.clinical_approach,
    });
    if (!result.success) return false;
    persistUser(
      normalizeUser({
        ...result.data,
        token: user?.token,
      }),
      false
    );
    return true;
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
        refreshUser,
        updateProfile,
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
