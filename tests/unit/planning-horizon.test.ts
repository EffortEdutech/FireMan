import { describe, expect, it } from "vitest";
import { planMaintenanceHorizon } from "@/lib/maintenance/planning-horizon";

describe("planMaintenanceHorizon", () => {
  it("plans only cycles inside the requested horizon", () => {
    expect(planMaintenanceHorizon("2026-10-13", "2027-02-01", "MONTHLY")).toEqual([
      { scheduledDate: "2026-11-13", sequence: 1 },
      { scheduledDate: "2026-12-13", sequence: 2 },
      { scheduledDate: "2027-01-13", sequence: 3 }
    ]);
  });

  it("rejects a horizon before the planning date", () => {
    expect(() => planMaintenanceHorizon("2026-10-13", "2026-10-12", "MONTHLY")).toThrow("on or after");
  });
});
