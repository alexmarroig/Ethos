import { api, ApiResult } from "./apiClient";

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "professional" | "patient";
  };
}

export const authService = {
  login: (email: string, password: string): Promise<ApiResult<LoginResponse>> =>
    api.post<LoginResponse>("/auth/login", { email, password }),

  logout: (): Promise<ApiResult<void>> =>
    api.post<void>("/auth/logout"),

  invite: (email: string, role: string): Promise<ApiResult<{ invite_token: string }>> =>
    api.post<{ invite_token: string }>("/auth/invite", { email, role }),

  acceptInvite: (token: string, name: string, password: string): Promise<ApiResult<LoginResponse>> =>
    api.post<LoginResponse>("/auth/accept-invite", { token, name, password }),

  requestPasswordReset: (email: string): Promise<ApiResult<{ message: string }>> =>
    api.post<{ message: string }>("/auth/request-password-reset", { email }),

  resetPassword: (token: string, newPassword: string): Promise<ApiResult<{ message: string }>> =>
    api.post<{ message: string }>("/auth/reset-password", { token, password: newPassword }),
};
