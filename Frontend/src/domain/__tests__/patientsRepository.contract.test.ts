import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPatientsRepository,
  setPatientsRepositoryForTests,
} from "@/domain/repositories/patientsRepository";
import { patientService } from "@/services/patientService";

describe("PatientsRepository contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setPatientsRepositoryForTests(null);
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

    const spy = vi
      .spyOn(patientService, "getById")
      .mockResolvedValue(expected as any);

    const repository = getPatientsRepository();
    const result = await repository.getById("p-1");

    expect(spy).toHaveBeenCalledWith("p-1");
    expect(result).toEqual(expected);
  });

  it("allows overriding repository implementation", async () => {
    const override = {
      list: vi.fn().mockResolvedValue({
        success: true as const,
        data: [{ id: "fake" }],
        request_id: "override",
      }),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      grantAccess: vi.fn(),
    } as any;

    setPatientsRepositoryForTests(override);

    const result = await getPatientsRepository().list();

    expect(override.list).toHaveBeenCalledTimes(1);
    expect(result.request_id).toBe("override");
  });
});