import { findReadingDefinition, standardUnitFor, units } from "@/lib/reports/readings";

// One recorded reading, always in the standard unit (value_standard), for one
// asset + semantic key, on one visit.
export type ReadingPoint = {
  jobId: string;
  visitDate: string; // yyyy-mm-dd (maintenance job scheduled date)
  valueStandard: number;
};

export type TrendPoint = { date: string; value: number };

export type ReadingChange =
  | { kind: "FIRST_READING" }
  | {
      kind: "CHANGED";
      previousDate: string;
      previousValue: number;
      delta: number;
      percent: number | null;
    };

function round(n: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Oldest to newest. `since` (e.g. contract start) drops older readings. */
export function buildTrendSeries(points: ReadingPoint[], since?: string | null): TrendPoint[] {
  return [...points]
    .filter((p) => Number.isFinite(p.valueStandard) && (!since || p.visitDate >= since))
    .sort((a, b) => (a.visitDate === b.visitDate ? a.jobId.localeCompare(b.jobId) : a.visitDate.localeCompare(b.visitDate)))
    .map((p) => ({ date: p.visitDate, value: p.valueStandard }));
}

/**
 * Compare this visit's reading with the latest earlier visit. Returns null when
 * the current visit has no reading. Readings are compared in the standard unit,
 * so a psi visit and a bar visit line up.
 */
export function changeSinceLastVisit(points: ReadingPoint[], currentJobId: string): ReadingChange | null {
  const current = points.find((p) => p.jobId === currentJobId);
  if (!current) return null;
  const earlier = points
    .filter((p) => p.jobId !== currentJobId && p.visitDate < current.visitDate)
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0];
  if (!earlier) return { kind: "FIRST_READING" };
  const delta = current.valueStandard - earlier.valueStandard;
  const percent = earlier.valueStandard === 0 ? null : (delta / Math.abs(earlier.valueStandard)) * 100;
  return {
    kind: "CHANGED",
    previousDate: earlier.visitDate,
    previousValue: earlier.valueStandard,
    delta,
    percent,
  };
}

/** Plain text for reports, in the standard unit. Null when the key is unknown. */
export function formatChange(semanticKey: string, change: ReadingChange | null): string | null {
  if (!change) return null;
  const def = findReadingDefinition(semanticKey);
  if (!def) return null;
  if (change.kind === "FIRST_READING") return "First recorded reading";
  const label = units[standardUnitFor[def.quantity]].label;
  const sign = change.delta > 0 ? "+" : change.delta < 0 ? "-" : "";
  const pct = change.percent === null ? "" : `, ${sign}${Math.abs(round(change.percent, 1))}%`;
  return `${sign}${Math.abs(round(change.delta))} ${label} since ${change.previousDate} (was ${round(change.previousValue)} ${label})${pct}`;
}

/** SVG polyline points for a sparkline; needs at least two points. */
export function sparklinePoints(series: TrendPoint[], width: number, height: number, pad = 3): string | null {
  if (series.length < 2) return null;
  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return series
    .map((p, i) => {
      const x = pad + (i * (width - 2 * pad)) / (series.length - 1);
      const y = height - pad - ((p.value - min) * (height - 2 * pad)) / span;
      return `${round(x, 1)},${round(y, 1)}`;
    })
    .join(" ");
}
