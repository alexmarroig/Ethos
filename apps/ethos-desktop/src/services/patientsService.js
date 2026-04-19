"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientsService = void 0;
const patients = new Map();
exports.patientsService = {
    list: () => Array.from(patients.values()),
    create: (payload) => {
        const patient = {
            ...payload,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };
        patients.set(patient.id, patient);
        return patient;
    },
    update: (id, payload) => {
        const patient = patients.get(id);
        if (!patient) {
            throw new Error("Paciente não encontrado");
        }
        const updated = { ...patient, ...payload };
        patients.set(id, updated);
        return updated;
    },
    remove: (id) => {
        patients.delete(id);
    },
};
