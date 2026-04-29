import type { PatientsRepository } from "@/domain/contracts/patientsRepository";
import { patientService } from "@/services/patientService";

export const httpPatientsRepository: PatientsRepository = {
  list: () => patientService.list(),
  getById: (id) => patientService.getById(id),
  create: (data) => patientService.create(data),
  update: (id, data) => patientService.update(id, data),
  grantAccess: (input) => patientService.grantAccess(input),
};
