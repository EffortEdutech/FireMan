import { describe, expect, it } from "vitest";
import {
  canEditQuoteReference,
  canTransitionQuoteRequest,
  isQuoteRequestStatus,
  quoteRequestChoices
} from "@/lib/corrective/quote-request-status";

describe("quote request status lifecycle", () => {
  it("recognizes only the supported manual statuses", () => {
    expect(isQuoteRequestStatus("REQUESTED")).toBe(true);
    expect(isQuoteRequestStatus("PAID")).toBe(false);
  });

  it("allows request submission and cancellation before a decision", () => {
    expect(canTransitionQuoteRequest("REQUESTED", "SUBMITTED")).toBe(true);
    expect(canTransitionQuoteRequest("REQUESTED", "CANCELLED")).toBe(true);
    expect(canTransitionQuoteRequest("REQUESTED", "APPROVED")).toBe(false);
  });

  it("allows a submitted quote to be approved, rejected, or cancelled", () => {
    expect(quoteRequestChoices("SUBMITTED")).toEqual(["SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"]);
    expect(canTransitionQuoteRequest("SUBMITTED", "APPROVED")).toBe(true);
  });

  it("keeps final decisions terminal", () => {
    expect(quoteRequestChoices("APPROVED")).toEqual(["APPROVED"]);
    expect(canTransitionQuoteRequest("REJECTED", "REQUESTED")).toBe(false);
    expect(canEditQuoteReference("CANCELLED")).toBe(false);
  });
});
