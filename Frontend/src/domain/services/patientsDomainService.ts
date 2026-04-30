import { getPatientsRepository } from "@/domain/repositories/patientsRepository";
import type { GrantPatientAccessInput } from "@/domain/contracts/patientsRepository";
import type { CreatePatientInput, UpdatePatientInput } from "@/services/patientService";

export const patientsDomainService = {
  list: () => getPatientsRepository().list(),
  getById: (id: string) => getPatientsRepository().getById(id),
  create: (data: CreatePatientInput) => getPatientsRepository().create(data),
  update: (id: string, data: UpdatePatientInput) => getPatientsRepository().update(id, data),
  grantAccess: (input: GrantPatientAccessInput) => getPatientsRepository().grantAccess(input),
};
