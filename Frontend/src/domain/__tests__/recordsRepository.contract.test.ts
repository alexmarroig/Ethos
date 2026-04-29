import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecordsRepository } from "@/domain/repositories/recordsRepository";
import { clinicalNoteService } from "@/services/clinicalNoteService";

describe("RecordsRepository contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    const spy = vi.spyOn(clinicalNoteService, "listBySession").mockResolvedValue(expected as any);
    const result = await getRecordsRepository().listBySession("s-1");
    expect(spy).toHaveBeenCalledWith("s-1");
    expect(result).toEqual(expected);
  });
});
