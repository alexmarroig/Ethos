import type { RecordsRepository } from "@/domain/contracts/recordsRepository";
import { httpRecordsRepository } from "@/domain/repositories/adapters/httpRecordsRepository";

function isLocalRecordsEnabled(): boolean {
  return import.meta.env.VITE_LOCAL_RECORDS_REPOSITORY === "true";
}

let recordsRepositoryOverride: RecordsRepository | null = null;

export function setRecordsRepositoryForTests(repository: RecordsRepository | null): void {
  recordsRepositoryOverride = repository;
}

export function getRecordsRepository(): RecordsRepository {
  if (recordsRepositoryOverride) return recordsRepositoryOverride;

  if (isLocalRecordsEnabled()) {
    // TODO: plugar IndexedDBRecordsRepository quando estiver pronto.
    return httpRecordsRepository;
  }

  return httpRecordsRepository;
}
