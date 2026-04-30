import type { PatientsRepository } from "@/domain/contracts/patientsRepository";
import { httpPatientsRepository } from "@/domain/repositories/adapters/httpPatientsRepository";

function isLocalPatientsEnabled(): boolean {
  return import.meta.env.VITE_LOCAL_PATIENTS_REPOSITORY === "true";
}

let patientsRepositoryOverride: PatientsRepository | null = null;

export function setPatientsRepositoryForTests(
  repository: PatientsRepository | null,
): void {
  patientsRepositoryOverride = repository;
}

export function getPatientsRepository(): PatientsRepository {
  if (patientsRepositoryOverride) {
    return patientsRepositoryOverride;
  }

  if (isLocalPatientsEnabled()) {
    // TODO: plugar IndexedDBPatientsRepository quando estiver pronto.
    return httpPatientsRepository;
  }

  return httpPatientsRepository;
}