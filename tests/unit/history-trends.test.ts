import { describe, expect, it, vi } from "vitest";
import { fetchMaintenanceTrends } from "@/lib/maintenance/history-trends";

function query(data: unknown) {
  const builder = { select: vi.fn(() => builder), eq: vi.fn(() => builder), gte: vi.fn(() => builder), order: vi.fn(() => builder), then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error: null })) };
  return builder;
}

describe("fetchMaintenanceTrends", () => {
  it("aggregates completed work, severity, and unresolved ageing", async () => {
    const supabase = { from: vi.fn()
      .mockReturnValueOnce(query([{ id: "job-1", scheduled_date: "2026-10-01", status: "COMPLETED" }]))
      .mockReturnValueOnce(query([
        { id: "finding-1", severity: "CRITICAL", status: "OPEN", created_at: "2026-09-01T00:00:00.000Z" },
        { id: "finding-2", severity: "LOW", status: "RESOLVED", created_at: "2026-10-01T00:00:00.000Z" }
      ])) } as never;

    const result = await fetchMaintenanceTrends(supabase, new Date("2026-10-13T12:00:00Z"));

    expect(result.data?.completedByMonth.find((item) => item.month === "2026-10")?.count).toBe(1);
    expect(result.data?.findingsBySeverity).toEqual([{ severity: "CRITICAL", count: 1 }, { severity: "LOW", count: 1 }]);
    expect(result.data?.unresolved).toEqual({ count: 1, oldestDays: 42 });
  });
});
