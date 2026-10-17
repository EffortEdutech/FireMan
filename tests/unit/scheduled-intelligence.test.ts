import { describe, expect, it, vi } from "vitest";
import { fetchScheduledIntelligence } from "@/lib/dashboard/scheduled-intelligence";

describe("fetchScheduledIntelligence", () => {
  it("groups active work into timing windows and frequencies", async () => {
    const builder = {
      select: vi.fn(() => builder), in: vi.fn(() => builder), lte: vi.fn(() => builder), order: vi.fn(() => builder),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: [
        { id: "1", scheduled_date: "2026-10-01", status: "SCHEDULED", maintenance_plans: { frequency: "MONTHLY" } },
        { id: "2", scheduled_date: "2026-10-15", status: "SCHEDULED", maintenance_plans: { frequency: "MONTHLY" } },
        { id: "3", scheduled_date: "2026-11-01", status: "IN_PROGRESS", maintenance_plans: { frequency: "QUARTERLY" } }
      ], error: null }))
    };
    const supabase = { from: vi.fn(() => builder) } as never;

    const result = await fetchScheduledIntelligence(supabase, new Date("2026-10-13T12:00:00Z"));

    expect(result.data?.windows).toEqual({ overdue: 1, next7Days: 1, next30Days: 1, later: 0 });
    expect(result.data?.ageing.oldestOverdueDays).toBe(12);
    expect(result.data?.frequencies).toEqual([{ frequency: "MONTHLY", count: 2 }, { frequency: "QUARTERLY", count: 1 }]);
  });

  it("returns an error without manufacturing empty schedule data", async () => {
    const builder = {
      select: vi.fn(() => builder), in: vi.fn(() => builder), lte: vi.fn(() => builder), order: vi.fn(() => builder),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: null, error: new Error("denied") }))
    };
    const supabase = { from: vi.fn(() => builder) } as never;

    const result = await fetchScheduledIntelligence(supabase, new Date("2026-10-13T12:00:00Z"));

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("denied");
  });
});
