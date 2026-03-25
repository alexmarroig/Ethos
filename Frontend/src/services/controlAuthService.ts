// Control Plane Auth Service — cloud account management
import { controlApi } from "./controlClient";
import type { ApiResult } from "./apiClient";

export interface ControlLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "professional" | "patient";
  };
}

export interface ControlMeResponse {
  id: string;
  email: string;
  name: string;
  role: "admin" | "professional" | "patient";
  created_at: string;
}

export const controlAuthService = {
  login: (email: string, password: string): Promise<ApiResult<ControlLoginResponse>> =>
    controlApi.post<ControlLoginResponse>("/auth/login", { email, password }),

  invite: (email: string, role: string): Promise<ApiResult<{ invite_token: string }>> =>
    controlApi.post<{ invite_token: string }>("/auth/invite", { email, role }),

  acceptInvite: (token: string, name: string, password: string): Promise<ApiResult<ControlLoginResponse>> =>
    controlApi.post<ControlLoginResponse>("/auth/accept-invite", { token, name, password }),

  me: (): Promise<ApiResult<ControlMeResponse>> =>
    controlApi.get<ControlMeResponse>("/me"),
};
