import { describe, expect, it } from "vitest";
import { nextMaintenanceDate } from "@/lib/maintenance/recurrence";

describe("nextMaintenanceDate", () => {
  it("calculates calendar-based frequencies", () => {
    expect(nextMaintenanceDate("2026-10-13", "MONTHLY")).toBe("2026-11-13");
    expect(nextMaintenanceDate("2026-10-13", "QUARTERLY")).toBe("2027-01-13");
    expect(nextMaintenanceDate("2026-10-13", "HALF_YEARLY")).toBe("2027-04-13");
    expect(nextMaintenanceDate("2026-10-13", "YEARLY")).toBe("2027-10-13");
  });

  it("calculates custom intervals and rejects invalid ones", () => {
    expect(nextMaintenanceDate("2026-10-13", "CUSTOM", 30)).toBe("2026-11-12");
    expect(() => nextMaintenanceDate("2026-10-13", "CUSTOM", 0)).toThrow("positive");
  });
});
