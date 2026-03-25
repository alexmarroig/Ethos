import { api, ApiResult } from "./apiClient";

export const backupService = {
  backup: (): Promise<ApiResult<{ path: string; size: number }>> =>
    api.post<{ path: string; size: number }>("/backup"),

  restore: (data: { backup_path: string }): Promise<ApiResult<{ restored: boolean }>> =>
    api.post<{ restored: boolean }>("/restore", data),

  purge: (confirmation: string): Promise<ApiResult<{ purged: boolean }>> =>
    api.post<{ purged: boolean }>("/purge", { confirmation }),
};
