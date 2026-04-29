import type { RecordsRepository } from "@/domain/contracts/recordsRepository";
import { httpRecordsRepository } from "@/domain/repositories/adapters/httpRecordsRepository";

function isLocalRecordsEnabled(): boolean {
  return import.meta.env.VITE_LOCAL_RECORDS_REPOSITORY === "true";
}

export function getRecordsRepository(): RecordsRepository {
  if (isLocalRecordsEnabled()) {
    // TODO: plugar IndexedDBRecordsRepository quando estiver pronto.
    return httpRecordsRepository;
  }

  return httpRecordsRepository;
}
