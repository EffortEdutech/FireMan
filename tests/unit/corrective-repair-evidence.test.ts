import { describe, expect, it } from "vitest";
import {
  correctiveRepairPhotoLimit,
  isValidCorrectiveRepairPhoto,
  isValidRepairSubmission,
  isValidVerificationNotes
} from "@/lib/corrective/repair-evidence";

describe("corrective repair evidence validation", () => {
  it("requires bounded repair notes and keeps parts non-commercial and optional", () => {
    expect(isValidRepairSubmission("Replaced the damaged alarm head.", "Detector head" )).toBe(true);
    expect(isValidRepairSubmission(" short ", null)).toBe(false);
    expect(isValidRepairSubmission("x".repeat(5001), null)).toBe(false);
    expect(isValidRepairSubmission("A valid repair description", "x".repeat(2001))).toBe(false);
  });

  it("requires an independent verification note", () => {
    expect(isValidVerificationNotes("Tested and confirmed alarm response." )).toBe(true);
    expect(isValidVerificationNotes("verified")).toBe(false);
    expect(isValidVerificationNotes(null)).toBe(false);
  });

  it("accepts only bounded JPEG, PNG, and WebP repair photos", () => {
    expect(correctiveRepairPhotoLimit).toBe(4);
    expect(isValidCorrectiveRepairPhoto({ type: "image/jpeg", size: 1024 })).toBe(true);
    expect(isValidCorrectiveRepairPhoto({ type: "image/svg+xml", size: 1024 })).toBe(false);
    expect(isValidCorrectiveRepairPhoto({ type: "image/png", size: 6 * 1024 * 1024 + 1 })).toBe(false);
  });
});
