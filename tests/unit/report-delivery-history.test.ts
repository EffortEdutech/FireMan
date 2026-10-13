import { describe, expect, it, vi } from "vitest";
import { fetchReportDeliveryHistory } from "@/lib/reports/report-delivery-history";

describe("report delivery history", () => {
  it("maps audit rows into review-friendly delivery events", async () => {
    const result = { data: [{ action: "REPORT_DOWNLOADED_PDF", actor_id: "owner-1", created_at: "2026-10-13T04:00:00Z", profiles: { full_name: "UK Bina" } }], error: null };
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      like: vi.fn(() => query),
      order: vi.fn(() => Promise.resolve(result))
    };
    const supabase = { from: vi.fn(() => query) } as never;

    await expect(fetchReportDeliveryHistory(supabase, "report-1")).resolves.toEqual({
      data: [{ action: "REPORT_DOWNLOADED_PDF", actorId: "owner-1", actorName: "UK Bina", createdAt: "2026-10-13T04:00:00Z" }],
      error: null
    });
    expect(query.eq).toHaveBeenCalledWith("entity_id", "report-1");
    expect(query.like).toHaveBeenCalledWith("action", "REPORT_DOWNLOADED_%");
  });

  it("uses a safe actor label when the profile is unavailable", async () => {
    const query = {
      select: () => query,
      eq: () => query,
      like: () => query,
      order: () => Promise.resolve({ data: [{ action: "REPORT_DOWNLOADED_HTML", actor_id: null, created_at: "2026-10-13", profiles: null }], error: null })
    };
    const supabase = { from: vi.fn(() => query) } as never;

    const result = await fetchReportDeliveryHistory(supabase, "report-1");

    expect(result.data[0]!.actorName).toBe("Unknown user");
  });
});
