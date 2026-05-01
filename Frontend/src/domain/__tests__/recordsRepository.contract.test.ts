import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRecordsRepository,
  setRecordsRepositoryForTests,
} from "@/domain/repositories/recordsRepository";
import { clinicalNoteService } from "@/services/clinicalNoteService";

describe("RecordsRepository contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setRecordsRepositoryForTests(null);
  });

  it("exposes expected methods", () => {
    const repository = getRecordsRepository();

    expect(typeof repository.create).toBe("function");
    expect(typeof repository.listBySession).toBe("function");
    expect(typeof repository.getById).toBe("function");
    expect(typeof repository.validate).toBe("function");
  });

  it("delegates listBySession()", async () => {
    const expected = { success: true as const, data: [], request_id: "test" };
    const spy = vi
      .spyOn(clinicalNoteService, "listBySession")
      .mockResolvedValue(expected as any);

    const result = await getRecordsRepository().listBySession("s-1");

    expect(spy).toHaveBeenCalledWith("s-1");
    expect(result).toEqual(expected);
  });

  it("allows overriding repository implementation", async () => {
    const override = {
      create: vi.fn(),
      listBySession: vi
        .fn()
        .mockResolvedValue({
          success: true as const,
          data: [],
          request_id: "override",
        }),
      getById: vi.fn(),
      validate: vi.fn(),
    } as any;

    setRecordsRepositoryForTests(override);

    const result = await getRecordsRepository().listBySession("s-1");

    expect(override.listBySession).toHaveBeenCalledWith("s-1");
    expect(result.request_id).toBe("override");
  });
});