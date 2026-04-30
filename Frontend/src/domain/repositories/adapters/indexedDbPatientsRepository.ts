import type { PatientsRepository } from "@/domain/contracts/patientsRepository";
import type { ApiResult } from "@/services/apiClient";
import type { CreatePatientInput, Patient, PatientDetail, UpdatePatientInput } from "@/services/patientService";

const DB_NAME = "ethos-local-first";
const DB_VERSION = 1;
const PATIENTS_STORE = "patients";

function ok<T>(data: T): ApiResult<T> {
  return { success: true, data, request_id: "local-indexeddb" };
}

function fail<T>(message: string, code = "LOCAL_DB_ERROR"): ApiResult<T> {
  return { success: false, error: { code, message }, request_id: "local-indexeddb" };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PATIENTS_STORE)) {
        db.createObjectStore(PATIENTS_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("failed to open IndexedDB"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PATIENTS_STORE, mode);
    const store = tx.objectStore(PATIENTS_STORE);
    run(store).then(resolve).catch(reject);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error("indexeddb tx error"));
  });
}

function mapToDetail(patient: Patient): PatientDetail {
  return {
    patient,
    summary: { total_sessions: patient.total_sessions ?? 0 },
    sessions: [],
    documents: [],
    clinical_notes: [],
    emotional_diary: [],
    form_entries: [],
    portal_access: null,
    timeline: [],
  };
}

export const indexedDbPatientsRepository: PatientsRepository = {
  list: async () => {
    try {
      const rows = await withStore("readonly", async (store) => {
        const req = store.getAll();
        return new Promise<Patient[]>((resolve, reject) => {
          req.onsuccess = () => resolve((req.result ?? []) as Patient[]);
          req.onerror = () => reject(req.error ?? new Error("failed to list patients"));
        });
      });
      return ok(rows);
    } catch (error) {
      return fail((error as Error).message);
    }
  },

  getById: async (id) => {
    try {
      const patient = await withStore("readonly", async (store) => {
        const req = store.get(id);
        return new Promise<Patient | undefined>((resolve, reject) => {
          req.onsuccess = () => resolve(req.result as Patient | undefined);
          req.onerror = () => reject(req.error ?? new Error("failed to get patient"));
        });
      });

      if (!patient) return fail(`Paciente ${id} não encontrado`, "NOT_FOUND");
      return ok(mapToDetail(patient));
    } catch (error) {
      return fail((error as Error).message);
    }
  },

  create: async (data: CreatePatientInput) => {
    try {
      const patient: Patient = {
        id: `local-${crypto.randomUUID()}`,
        name: data.name,
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp,
        notes: data.notes,
        created_at: new Date().toISOString(),
      };

      await withStore("readwrite", async (store) => {
        const req = store.add(patient);
        return new Promise<void>((resolve, reject) => {
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error ?? new Error("failed to create patient"));
        });
      });

      return ok(patient);
    } catch (error) {
      return fail((error as Error).message);
    }
  },

  update: async (id: string, data: UpdatePatientInput) => {
    try {
      const current = await indexedDbPatientsRepository.getById(id);
      if (!current.success) return current;

      const next: Patient = { ...current.data.patient, ...data, id };

      await withStore("readwrite", async (store) => {
        const req = store.put(next);
        return new Promise<void>((resolve, reject) => {
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error ?? new Error("failed to update patient"));
        });
      });

      return ok(next);
    } catch (error) {
      return fail((error as Error).message);
    }
  },

  grantAccess: async () => fail("Grant access não suportado no modo local", "NOT_SUPPORTED"),
};
