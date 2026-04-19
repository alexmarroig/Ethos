"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionsService = void 0;
const sessions = new Map();
exports.sessionsService = {
    list: () => Array.from(sessions.values()),
    create: (payload) => {
        const session = {
            ...payload,
            id: crypto.randomUUID(),
            status: "scheduled",
        };
        sessions.set(session.id, session);
        return session;
    },
    update: (id, payload) => {
        const session = sessions.get(id);
        if (!session) {
            throw new Error("Sessão não encontrada");
        }
        const updated = { ...session, ...payload };
        sessions.set(id, updated);
        return updated;
    },
    remove: (id) => {
        sessions.delete(id);
    },
};
