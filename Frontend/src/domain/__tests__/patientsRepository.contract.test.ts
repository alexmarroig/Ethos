import { describe, expect, it, vi, beforeEach } from "vitest";
import { getPatientsRepository } from "@/domain/repositories/patientsRepository";
import { patientService } from "@/services/patientService";

describe("PatientsRepository contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes the expected contract methods", () => {
    const repository = getPatientsRepository();

    expect(typeof repository.list).toBe("function");
    expect(typeof repository.getById).toBe("function");
    expect(typeof repository.create).toBe("function");
    expect(typeof repository.update).toBe("function");
    expect(typeof repository.grantAccess).toBe("function");
  });

  it("delegates list() to current adapter implementation", async () => {
    const expected = { success: true as const, data: [], request_id: "test" };
    const spy = vi.spyOn(patientService, "list").mockResolvedValue(expected);

    const repository = getPatientsRepository();
    const result = await repository.list();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expected);
  });

  it("delegates getById() to current adapter implementation", async () => {
    const expected = {
      success: true as const,
      data: {
        patient: { id: "p-1", name: "Ana" },
        summary: { total_sessions: 0 },
        sessions: [],
        documents: [],
        clinical_notes: [],
        emotional_diary: [],
        form_entries: [],
        portal_access: null,
        timeline: [],
      },
      request_id: "test",
    };

    const spy = vi.spyOn(patientService, "getById").mockResolvedValue(expected as any);

    const repository = getPatientsRepository();
    const result = await repository.getById("p-1");

    expect(spy).toHaveBeenCalledWith("p-1");
    expect(result).toEqual(expected);
  });
});
