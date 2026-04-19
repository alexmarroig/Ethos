import { api, type ApiResult } from "./apiClient";

export interface HomeworkTask {
  id: string;
  owner_user_id: string;
  patient_id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  week_number: number;
  created_at: string;
}

export const homeworkService = {
  list: (patientId: string): Promise<ApiResult<HomeworkTask[]>> =>
    api.get<HomeworkTask[]>(`/homework?patient_id=${patientId}`),

  create: (patientId: string, title: string, description?: string, due_date?: string): Promise<ApiResult<HomeworkTask>> =>
    api.post<HomeworkTask>("/homework", { patient_id: patientId, title, description, due_date }),

  update: (
    taskId: string,
    patch: Partial<Pick<HomeworkTask, "title" | "description" | "due_date" | "completed">>,
  ): Promise<ApiResult<HomeworkTask>> =>
    api.patch<HomeworkTask>(`/homework/${taskId}`, patch),

  delete: (taskId: string): Promise<ApiResult<{ deleted: boolean }>> =>
    api.delete<{ deleted: boolean }>(`/homework/${taskId}`),
};
