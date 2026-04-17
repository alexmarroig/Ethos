import { api, type ApiResult } from "./apiClient";

export interface GoalMilestone {
  id: string;
  title: string;
  achieved: boolean;
  achieved_at?: string;
}

export type GoalStatus = "active" | "achieved" | "paused" | "abandoned";

export interface TherapeuticGoal {
  id: string;
  owner_user_id: string;
  patient_id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  progress: number;
  milestones: GoalMilestone[];
  created_at: string;
  achieved_at?: string;
}

export const goalsService = {
  list: (patientId: string): Promise<ApiResult<TherapeuticGoal[]>> =>
    api.get<TherapeuticGoal[]>(`/goals?patient_id=${patientId}`),

  create: (patientId: string, title: string, description?: string): Promise<ApiResult<TherapeuticGoal>> =>
    api.post<TherapeuticGoal>("/goals", { patient_id: patientId, title, description }),

  update: (
    goalId: string,
    patch: Partial<Pick<TherapeuticGoal, "title" | "description" | "status" | "progress" | "milestones">>,
  ): Promise<ApiResult<TherapeuticGoal>> =>
    api.patch<TherapeuticGoal>(`/goals/${goalId}`, patch),

  delete: (goalId: string): Promise<ApiResult<{ deleted: boolean }>> =>
    api.delete<{ deleted: boolean }>(`/goals/${goalId}`),
};
