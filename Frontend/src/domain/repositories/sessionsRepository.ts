import type { SessionsRepository } from "@/domain/contracts/sessionsRepository";
import { httpSessionsRepository } from "@/domain/repositories/adapters/httpSessionsRepository";

function isLocalSessionsEnabled(): boolean {
  return import.meta.env.VITE_LOCAL_SESSIONS_REPOSITORY === "true";
}

let sessionsRepositoryOverride: SessionsRepository | null = null;

export function setSessionsRepositoryForTests(
  repository: SessionsRepository | null,
): void {
  sessionsRepositoryOverride = repository;
}

export function getSessionsRepository(): SessionsRepository {
  if (sessionsRepositoryOverride) {
    return sessionsRepositoryOverride;
  }

  if (isLocalSessionsEnabled()) {
    // TODO: plugar IndexedDBSessionsRepository quando estiver pronto.
    return httpSessionsRepository;
  }

  return httpSessionsRepository;
}