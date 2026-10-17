import { describe, expect, it } from "vitest";
import { addOfflineFinding, removeOfflineFinding } from "@/lib/maintenance/offline-queue";

const item = { id: "finding-1", jobId: "job-1", title: "Pressure", severity: "CRITICAL" as const, description: "Low pressure", createdAt: "2026-10-14T00:00:00Z" };

describe("offline finding queue", () => {
  it("adds and removes idempotent queue items", () => {
    expect(addOfflineFinding([], item)).toEqual([item]);
    expect(removeOfflineFinding([item], item.id)).toEqual([]);
  });
});
