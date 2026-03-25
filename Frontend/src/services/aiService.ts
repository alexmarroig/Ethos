import { api, ApiResult } from "./apiClient";

export const aiService = {
  organize: (text: string): Promise<ApiResult<{ organized_text: string }>> =>
    api.post<{ organized_text: string }>("/ai/organize", { text }),
};
