import type { Patient } from "@ethos/shared";

const patients = new Map<string, Patient>();

export const patientsService = {
  list: () => Array.from(patients.values()),
  create: (payload: Omit<Patient, "id" | "createdAt">) => {
    const patient: Patient = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    patients.set(patient.id, patient);
    return patient;
  },
  update: (id: string, payload: Partial<Patient>) => {
    const patient = patients.get(id);
    if (!patient) {
      throw new Error("Paciente não encontrado");
    }
    const updated = { ...patient, ...payload };
    patients.set(id, updated);
    return updated;
  },
  remove: (id: string) => {
    patients.delete(id);
  },
};
