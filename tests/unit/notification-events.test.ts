import { describe, expect, it } from "vitest";
import { notificationDedupeKey, notificationTypes } from "@/lib/maintenance/notification-events";

describe("notification events", () => {
  it("uses stable event types and dedupe keys", () => {
    expect(notificationTypes.overdue).toBe("JOB_OVERDUE");
    expect(notificationDedupeKey("overdue", "job-1", "2026-10-13")).toBe("firemaint:JOB_OVERDUE:job-1:2026-10-13");
    expect(notificationDedupeKey("overdue", "job-1", "2026-10-13")).toBe(notificationDedupeKey("overdue", "job-1", "2026-10-13"));
  });
});
