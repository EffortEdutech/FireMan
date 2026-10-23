import { describe, expect, it } from "vitest";
import { buildTrendSeries, changeSinceLastVisit, formatChange, sparklinePoints } from "@/lib/reports/trends";

const pts = [
  { jobId: "j3", visitDate: "2026-10-01", valueStandard: 7.2 },
  { jobId: "j1", visitDate: "2026-08-01", valueStandard: 6.5 },
  { jobId: "j2", visitDate: "2026-09-01", valueStandard: 6.8 },
];

describe("trends", () => {
  it("sorts oldest first and honours the since date", () => {
    expect(buildTrendSeries(pts).map((p) => p.value)).toEqual([6.5, 6.8, 7.2]);
    expect(buildTrendSeries(pts, "2026-09-01").map((p) => p.date)).toEqual(["2026-09-01", "2026-10-01"]);
  });
  it("compares with the latest earlier visit", () => {
    const c = changeSinceLastVisit(pts, "j3");
    expect(c).toMatchObject({ kind: "CHANGED", previousDate: "2026-09-01" });
    expect(formatChange("fire_pump.discharge_pressure", c)).toBe("+0.4 bar since 2026-09-01 (was 6.8 bar), +5.9%");
  });
  it("reports first reading and missing current reading", () => {
    expect(changeSinceLastVisit(pts, "j1")).toEqual({ kind: "FIRST_READING" });
    expect(formatChange("fire_pump.discharge_pressure", changeSinceLastVisit(pts, "nope"))).toBeNull();
  });
  it("handles a drop and a zero baseline", () => {
    const drop = changeSinceLastVisit([{ jobId: "a", visitDate: "2026-01-01", valueStandard: 10 }, { jobId: "b", visitDate: "2026-02-01", valueStandard: 8 }], "b");
    expect(formatChange("fire_pump.flow", drop)).toBe("-2 L/min since 2026-01-01 (was 10 L/min), -20%");
    const zero = changeSinceLastVisit([{ jobId: "a", visitDate: "2026-01-01", valueStandard: 0 }, { jobId: "b", visitDate: "2026-02-01", valueStandard: 1 }], "b");
    expect(zero).toMatchObject({ percent: null });
  });
  it("draws sparklines only with two or more points", () => {
    expect(sparklinePoints([{ date: "d", value: 1 }], 100, 20)).toBeNull();
    expect(sparklinePoints([{ date: "a", value: 1 }, { date: "b", value: 2 }], 100, 20)).toBe("3,17 97,3");
  });
});
