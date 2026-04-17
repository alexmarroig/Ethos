"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.privacyService = void 0;
const defaultPolicy = {
    autoDeleteAfterDays: 30,
    deleteOnSessionRemoval: true,
};
let currentPolicy = { ...defaultPolicy };
exports.privacyService = {
    getPolicy: () => currentPolicy,
    updatePolicy: (policy) => {
        currentPolicy = { ...currentPolicy, ...policy };
    },
    scheduleCleanup: () => {
        return "Job scheduler configurado para limpeza local.";
    },
};
