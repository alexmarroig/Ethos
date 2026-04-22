import { patientService, type Patient } from "./patientService";

const DEFAULT_PATIENT_INDEX_TTL_MS = 90_000;

type CacheEntry = {
  data: Patient[];
  expiresAt: number;
};

let patientsCache: CacheEntry | null = null;
let inflightPatientsRequest: Promise<Patient[]> | null = null;

function isCacheFresh(cache: CacheEntry | null) {
  return !!cache && cache.expiresAt > Date.now();
}

export function primePatientsIndexCache(patients: Patient[], ttlMs = DEFAULT_PATIENT_INDEX_TTL_MS) {
  patientsCache = {
    data: patients,
    expiresAt: Date.now() + ttlMs,
  };
}

export async function getPatientsIndex(options?: { ttlMs?: number; forceRefresh?: boolean }) {
  if (!options?.forceRefresh && isCacheFresh(patientsCache)) return patientsCache.data;
  if (inflightPatientsRequest) return inflightPatientsRequest;

  inflightPatientsRequest = patientService
    .list()
    .then((result) => (result.success ? result.data : []))
    .then((patients) => {
      primePatientsIndexCache(patients, options?.ttlMs ?? DEFAULT_PATIENT_INDEX_TTL_MS);
      return patients;
    })
    .finally(() => {
      inflightPatientsRequest = null;
    });

  return inflightPatientsRequest;
}

export async function resolvePatientsIndex(patientsIndex?: Patient[]) {
  if (patientsIndex) {
    primePatientsIndexCache(patientsIndex);
    return patientsIndex;
  }
  return getPatientsIndex();
}

export function clearPatientsIndexCache() {
  patientsCache = null;
  inflightPatientsRequest = null;
}
