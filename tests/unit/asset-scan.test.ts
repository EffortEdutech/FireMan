import { describe, expect, it } from "vitest";
import { normalizeAssetCode } from "@/lib/maintenance/asset-scan";

describe("normalizeAssetCode", () => {
  it("normalizes scanner/manual input and limits its size", () => {
    expect(normalizeAssetCode("  CLIENT-A   EXT-001 ")).toBe("CLIENT-A EXT-001");
    expect(normalizeAssetCode("x".repeat(200))).toHaveLength(120);
  });
});
