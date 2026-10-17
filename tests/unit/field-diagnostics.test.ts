import { describe, expect, it } from "vitest";
import { FIREMAINT_APP_VERSION } from "@/lib/app-version";

describe("field support diagnostics", () => {
  it("uses a stable app version for pilot support", () => {
    expect(FIREMAINT_APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
