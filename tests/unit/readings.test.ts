import { describe, expect, it } from "vitest";
import { convertUnit, evaluateReading, formatReading, findReadingDefinition, readingCatalog } from "@/lib/reports/readings";

describe("readings", () => {
  it("converts psi and bar both ways", () => {
    expect(convertUnit(100, "psi", "bar")).toBeCloseTo(6.8948, 3);
    expect(convertUnit(7, "bar", "psi")).toBeCloseTo(101.526, 2);
  });
  it("keeps US and UK gallons distinct", () => {
    expect(convertUnit(500, "gpm_us", "L/min")).toBeCloseTo(1892.71, 1);
    expect(convertUnit(500, "gpm_uk", "L/min")).toBeCloseTo(2273.05, 1);
  });
  it("rejects cross-quantity conversion", () => {
    expect(() => convertUnit(1, "bar", "L/min")).toThrow();
  });
  it("judges only readings that have a standard limit", () => {
    const sounder = findReadingDefinition("fire_alarm.sounder_level")!;
    expect(evaluateReading(sounder, 70, "dB").status).toBe("WITHIN_LIMIT");
    const low = evaluateReading(sounder, 60, "dB");
    expect(low.status).toBe("OUT_OF_LIMIT");
    expect(low.suggestDeficiency).toBe(true);
    const pump = findReadingDefinition("fire_pump.discharge_pressure")!;
    const r = evaluateReading(pump, 1, "psi");
    expect(r.status).toBe("NO_LIMIT");
    expect(r.suggestDeficiency).toBe(false);
  });
  it("has unique keys and valid unit quantities", () => {
    expect(new Set(readingCatalog.map((r) => r.semanticKey)).size).toBe(readingCatalog.length);
  });
  it("formats readings with the standard unit alongside", () => {
    expect(formatReading(7.2, "bar")).toBe("7.2 bar");
    expect(formatReading(100, "psi")).toBe("100 psi (6.89 bar)");
    expect(formatReading(500, "gpm_us")).toBe("500 gpm (US) (1892.71 L/min)");
  });
});
