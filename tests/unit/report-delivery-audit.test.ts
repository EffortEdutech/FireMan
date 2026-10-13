import { describe, expect, it, vi } from "vitest";
import { recordReportDelivery } from "@/lib/reports/report-delivery-audit";

describe("report delivery audit", () => {
  it("writes a report download event with the actor and output format", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn(() => ({ insert })) } as never;
    const profile = { id: "owner-1", organisation_id: "org-1" } as never;

    await expect(recordReportDelivery(supabase, profile, "report-1", "pdf")).resolves.toBeNull();
    expect(insert).toHaveBeenCalledWith({
      action: "REPORT_DOWNLOADED_PDF",
      actor_id: "owner-1",
      after_data: { format: "pdf" },
      entity_id: "report-1",
      entity_type: "REPORT",
      organisation_id: "org-1",
      user_agent: null
    });
  });
});
