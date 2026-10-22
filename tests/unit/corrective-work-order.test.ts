import { describe, expect, it } from "vitest";
import {
  isValidManagementExceptionReason,
  isValidWorkOrderDate,
  isWorkOrderAuthorization
} from "@/lib/corrective/work-order";

describe("corrective work order authorization and schedule validation", () => {
  it("accepts only the approved-quote and management-exception bases", () => {
    expect(isWorkOrderAuthorization("APPROVED_QUOTE")).toBe(true);
    expect(isWorkOrderAuthorization("MANAGEMENT_EXCEPTION")).toBe(true);
    expect(isWorkOrderAuthorization("PENDING_QUOTE")).toBe(false);
  });

  it("accepts real ISO calendar dates and rejects malformed dates", () => {
    expect(isValidWorkOrderDate("2026-10-18")).toBe(true);
    expect(isValidWorkOrderDate("2026-02-30")).toBe(false);
    expect(isValidWorkOrderDate("18-10-2026")).toBe(false);
  });

  it("requires a meaningful bounded reason for a management exception", () => {
    expect(isValidManagementExceptionReason("Approved outside normal quote flow")).toBe(true);
    expect(isValidManagementExceptionReason("  short ")).toBe(false);
    expect(isValidManagementExceptionReason(null)).toBe(false);
    expect(isValidManagementExceptionReason("x".repeat(1001))).toBe(false);
  });
});
