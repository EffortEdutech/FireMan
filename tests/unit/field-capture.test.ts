import { describe, expect, it } from "vitest";

function captureMessage(error: string) {
  if (error === "photo-upload-failed") return "Finding saved, but the photo upload failed. Retry the photo upload when connected.";
  if (error === "inspection-not-ready") return "Start this job and asset checklist before recording the result.";
  return "Field action failed.";
}

describe("field capture recovery messages", () => {
  it("distinguishes recoverable field-action failures", () => {
    expect(captureMessage("photo-upload-failed")).toContain("photo upload failed");
    expect(captureMessage("inspection-not-ready")).toContain("Start this job");
    expect(captureMessage("unknown")).toBe("Field action failed.");
  });
});
