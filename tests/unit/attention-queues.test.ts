import { describe, expect, it, vi } from "vitest";
import { fetchAttentionQueues } from "@/lib/dashboard/attention-queues";

function query(data: unknown, error: Error | null = null) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error }))
  };
  return builder;
}

describe("fetchAttentionQueues", () => {
  it("maps actionable rows for the dashboard", async () => {
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce(query([{ id: "job-1", job_number: "JOB-1", scheduled_date: "2026-10-01", clients: { name: "Client A" }, sites: { name: "Site A" } }]))
        .mockReturnValueOnce(query([]))
        .mockReturnValueOnce(query([{ id: "finding-1", job_id: "job-1", title: "Pressure loss", maintenance_jobs: { job_number: "JOB-1", clients: { name: "Client A" } } }]))
        .mockReturnValueOnce(query([{ id: "report-1", report_number: "R-1", title: "Report", maintenance_jobs: { job_number: "JOB-1" } }]))
    } as never;

    const result = await fetchAttentionQueues(supabase, new Date("2026-10-13T12:00:00Z"));

    expect(result.error).toBeNull();
    expect(result.data?.overdueJobs[0]?.jobNumber).toBe("JOB-1");
    expect(result.data?.criticalFindings[0]?.title).toBe("Pressure loss");
    expect(result.data?.reviewedReports[0]?.reportNumber).toBe("R-1");
  });

  it("surfaces queue query errors", async () => {
    const builder = {
      select: vi.fn(() => builder), eq: vi.fn(() => builder), in: vi.fn(() => builder), lt: vi.fn(() => builder), order: vi.fn(() => builder), limit: vi.fn(() => builder),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: null, error: new Error("denied") }))
    };
    const supabase = { from: vi.fn(() => builder) } as never;

    const result = await fetchAttentionQueues(supabase, new Date("2026-10-13T12:00:00Z"));

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("denied");
  });
});
