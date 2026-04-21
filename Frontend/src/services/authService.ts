import { api, ApiResult } from "./apiClient";

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    crp?: string;
    specialty?: string;
    clinical_approach?: string;
    role: "admin" | "professional" | "patient";
  };
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  crp: string;
  specialty: string;
  clinical_approach: string;
  accepted_ethics: boolean;
}

export const authService = {
  loginWithGoogle: (credential: string): Promise<ApiResult<LoginResponse>> =>
    api.post<LoginResponse>("/auth/google", { credential }),

  login: (email: string, password: string): Promise<ApiResult<LoginResponse>> =>
    api.post<LoginResponse>("/auth/login", { email, password }),

  register: (payload: RegisterPayload): Promise<ApiResult<LoginResponse>> =>
    api.post<LoginResponse>("/auth/register", payload),

  me: (): Promise<ApiResult<LoginResponse["user"]>> =>
    api.get<LoginResponse["user"]>("/auth/me"),

  updateMe: (payload: Partial<{
    name: string;
    email: string;
    avatar_url?: string;
    crp?: string;
    rg?: string;
    cpf?: string;
    gender?: "F" | "M";
    specialty?: string;
    clinical_approach?: string;
  }>): Promise<ApiResult<LoginResponse["user"]>> =>
    api.patch<LoginResponse["user"]>("/auth/me", payload),

  logout: (): Promise<ApiResult<void>> => api.post<void>("/auth/logout"),

  invite: (email: string, role: string): Promise<ApiResult<{ invite_token: string }>> =>
    api.post<{ invite_token: string }>("/auth/invite", { email, role }),

  acceptInvite: (token: string, name: string, password: string): Promise<ApiResult<LoginResponse>> =>
    api.post<LoginResponse>("/auth/accept-invite", { token, name, password }),

  requestPasswordReset: (email: string): Promise<ApiResult<{ message: string }>> =>
    api.post<{ message: string }>("/auth/request-password-reset", { email }),

  resetPassword: (token: string, newPassword: string): Promise<ApiResult<{ message: string }>> =>
    api.post<{ message: string }>("/auth/reset-password", { token, password: newPassword }),
};
