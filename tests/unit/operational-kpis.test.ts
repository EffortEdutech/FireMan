import { describe, expect, it, vi } from "vitest";
import { fetchOperationalKpis } from "@/lib/dashboard/operational-kpis";

function query(count: number | null, error: Error | null = null) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ count, error }))
  };
  return builder;
}

describe("fetchOperationalKpis", () => {
  it("returns date-aware job, report, and attention counts", async () => {
    const counts = [2, 5, 3, 1, 4, 2, 7, 6, 1, 2, 3, 9, 2, 8];
    const supabase = { from: vi.fn(() => query(counts.shift() ?? 0)) } as never;
    const result = await fetchOperationalKpis(supabase, new Date("2026-10-13T12:00:00Z"));

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      clients: 2,
      sites: 5,
      jobs: { scheduled: 3, inProgress: 1, awaitingReview: 4, underReview: 2, completed: 7, dueNext30Days: 6, overdue: 1 },
      reports: { generated: 2, reviewed: 3, issued: 9 },
      attention: { criticalFindings: 2, openFindings: 8 }
    });
  });

  it("surfaces the first query error", async () => {
    const supabase = { from: vi.fn(() => query(null, new Error("denied"))) } as never;
    const result = await fetchOperationalKpis(supabase, new Date("2026-10-13T12:00:00Z"));

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("denied");
  });
});
