import type { Patient } from "@ethos/shared";

const STORAGE_KEY = "ethos.patients";

const loadPatients = (): Patient[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored) as Patient[];
  } catch {
    return [];
  }
};

const persistPatients = (items: Patient[]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const patients = new Map<string, Patient>(loadPatients().map((item) => [item.id, item]));

const sync = () => {
  persistPatients(Array.from(patients.values()));
};

export const patientsService = {
  list: () => Array.from(patients.values()),
  create: (payload: Omit<Patient, "id" | "createdAt">) => {
    const patient: Patient = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    patients.set(patient.id, patient);
    sync();
    return patient;
  },
  update: (id: string, payload: Partial<Patient>) => {
    const patient = patients.get(id);
    if (!patient) {
      throw new Error("Paciente não encontrado");
    }
    const updated = { ...patient, ...payload };
    patients.set(id, updated);
    sync();
    return updated;
  },
  remove: (id: string) => {
    patients.delete(id);
    sync();
  },
};
