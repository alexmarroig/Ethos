import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionsRepository } from "@/domain/repositories/sessionsRepository";
import { sessionService } from "@/services/sessionService";

describe("SessionsRepository contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes expected methods", () => {
    const repository = getSessionsRepository();
    expect(typeof repository.listPage).toBe("function");
    expect(typeof repository.list).toBe("function");
    expect(typeof repository.getById).toBe("function");
    expect(typeof repository.create).toBe("function");
    expect(typeof repository.updateStatus).toBe("function");
    expect(typeof repository.update).toBe("function");
    expect(typeof repository.getTranscript).toBe("function");
    expect(typeof repository.getSuggestions).toBe("function");
    expect(typeof repository.cancelSeries).toBe("function");
    expect(typeof repository.updateSeries).toBe("function");
    expect(typeof repository.delete).toBe("function");
  });

  it("delegates list()", async () => {
    const expected = { success: true as const, data: [], request_id: "test" };
    const spy = vi.spyOn(sessionService, "list").mockResolvedValue(expected as any);
    const result = await getSessionsRepository().list();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expected);
  });
});
