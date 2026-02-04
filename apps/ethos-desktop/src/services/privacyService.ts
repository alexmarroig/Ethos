export type RetentionPolicy = {
  autoDeleteAfterDays: number;
  deleteOnSessionRemoval: boolean;
};

const defaultPolicy: RetentionPolicy = {
  autoDeleteAfterDays: 30,
  deleteOnSessionRemoval: true,
};

let currentPolicy = { ...defaultPolicy };

export const privacyService = {
  getPolicy: () => currentPolicy,
  updatePolicy: (policy: Partial<RetentionPolicy>) => {
    currentPolicy = { ...currentPolicy, ...policy };
  },
  scheduleCleanup: () => {
    return "Job scheduler configurado para limpeza local.";
  },
};
