import type { Session } from "@ethos/shared";

const sessions = new Map<string, Session>();

export const sessionsService = {
  list: () => Array.from(sessions.values()),
  create: (payload: Omit<Session, "id" | "status">) => {
    const session: Session = {
      ...payload,
      id: crypto.randomUUID(),
      status: "scheduled",
    };
    sessions.set(session.id, session);
    return session;
  },
  update: (id: string, payload: Partial<Session>) => {
    const session = sessions.get(id);
    if (!session) {
      throw new Error("Sessão não encontrada");
    }
    const updated = { ...session, ...payload };
    sessions.set(id, updated);
    return updated;
  },
  remove: (id: string) => {
    sessions.delete(id);
  },
};
