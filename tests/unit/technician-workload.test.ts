import { describe, expect, it, vi } from "vitest";
import { fetchTechnicianWorkload } from "@/lib/maintenance/technician-workload";

function query(data: unknown) {
  const builder = { select: vi.fn(() => builder), eq: vi.fn(() => builder), order: vi.fn(() => builder), gte: vi.fn(() => builder), lte: vi.fn(() => builder), in: vi.fn(() => builder), then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error: null })) };
  return builder;
}

describe("fetchTechnicianWorkload", () => {
  it("groups the next 30 days by technician and assignment state", async () => {
    const supabase = { from: vi.fn()
      .mockReturnValueOnce(query([{ id: "tech-1", full_name: "Kamal" }]))
      .mockReturnValueOnce(query([
        { id: "job-1", assigned_technician_id: "tech-1", status: "SCHEDULED", scheduled_date: "2026-10-14" },
        { id: "job-2", assigned_technician_id: "tech-1", status: "IN_PROGRESS", scheduled_date: "2026-10-15" },
        { id: "job-3", assigned_technician_id: null, status: "SCHEDULED", scheduled_date: "2026-10-16" }
      ])) } as never;

    const result = await fetchTechnicianWorkload(supabase, new Date("2026-10-13T12:00:00Z"));

    expect(result.data?.technicians).toEqual([{ id: "tech-1", name: "Kamal", total: 2, scheduled: 1, active: 1, review: 0 }]);
    expect(result.data?.unassigned).toBe(1);
    expect(result.data?.total).toBe(3);
  });
});
