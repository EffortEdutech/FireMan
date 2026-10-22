// Reading units, conversions and standard-limit evaluation.
// Rule: a pass range exists ONLY where a standard defines one (`limit`).
// Readings without a standard range are recorded and trended, never judged.
// Out-of-limit results only SUGGEST a deficiency; the technician confirms.

export type Quantity = "pressure" | "flow" | "sound" | "voltage" | "duration";

export type UnitCode =
  | "bar" | "psi" | "kPa" | "MPa"
  | "L/min" | "gpm_us" | "gpm_uk"
  | "dB" | "V" | "min" | "h";

type UnitDef = { quantity: Quantity; label: string; toStandard: number };

// Standard units: pressure bar, flow L/min, sound dB(A), voltage V, duration min.
export const units: Record<UnitCode, UnitDef> = {
  bar: { quantity: "pressure", label: "bar", toStandard: 1 },
  psi: { quantity: "pressure", label: "psi", toStandard: 1 / 14.503773773 },
  kPa: { quantity: "pressure", label: "kPa", toStandard: 0.01 },
  MPa: { quantity: "pressure", label: "MPa", toStandard: 10 },
  "L/min": { quantity: "flow", label: "L/min", toStandard: 1 },
  gpm_us: { quantity: "flow", label: "gpm (US)", toStandard: 3.785411784 },
  gpm_uk: { quantity: "flow", label: "gpm (UK)", toStandard: 4.54609 },
  dB: { quantity: "sound", label: "dB(A)", toStandard: 1 },
  V: { quantity: "voltage", label: "V", toStandard: 1 },
  min: { quantity: "duration", label: "min", toStandard: 1 },
  h: { quantity: "duration", label: "h", toStandard: 60 },
};

export const standardUnitFor: Record<Quantity, UnitCode> = {
  pressure: "bar", flow: "L/min", sound: "dB", voltage: "V", duration: "min",
};

export function convertToStandard(value: number, unit: UnitCode): number {
  return value * units[unit].toStandard;
}

export function convertUnit(value: number, from: UnitCode, to: UnitCode): number {
  if (units[from].quantity !== units[to].quantity) {
    throw new Error(`Cannot convert ${from} to ${to}`);
  }
  return (value * units[from].toStandard) / units[to].toStandard;
}

export type ReadingLimit = { min?: number; max?: number; standardRef: string };

export type ReadingDefinition = {
  semanticKey: string;
  label: string;
  quantity: Quantity;
  allowedUnits: UnitCode[];
  // Present only when a standard defines a range, expressed in the standard unit.
  limit?: ReadingLimit;
};

export type ReadingEvaluation = {
  standardValue: number;
  status: "WITHIN_LIMIT" | "OUT_OF_LIMIT" | "NO_LIMIT";
  suggestDeficiency: boolean;
  reason?: string;
};

const EPS = 1e-9;

export function evaluateReading(
  def: ReadingDefinition,
  value: number,
  unit: UnitCode,
): ReadingEvaluation {
  if (!def.allowedUnits.includes(unit)) {
    throw new Error(`${unit} is not allowed for ${def.semanticKey}`);
  }
  const standardValue = convertToStandard(value, unit);
  const limit = def.limit;
  if (!limit || (limit.min === undefined && limit.max === undefined)) {
    return { standardValue, status: "NO_LIMIT", suggestDeficiency: false };
  }
  if (limit.min !== undefined && standardValue < limit.min - EPS) {
    return {
      standardValue, status: "OUT_OF_LIMIT", suggestDeficiency: true,
      reason: `Below ${limit.min} (${limit.standardRef})`,
    };
  }
  if (limit.max !== undefined && standardValue > limit.max + EPS) {
    return {
      standardValue, status: "OUT_OF_LIMIT", suggestDeficiency: true,
      reason: `Above ${limit.max} (${limit.standardRef})`,
    };
  }
  return { standardValue, status: "WITHIN_LIMIT", suggestDeficiency: false };
}

const P: UnitCode[] = ["bar", "psi", "kPa", "MPa"];
const F: UnitCode[] = ["L/min", "gpm_us", "gpm_uk"];

// Only BS 5839-1 sounder level is encoded as a limit here; every other limit
// must be added by a reviewer against the contract-cited standard.
export const readingCatalog: ReadingDefinition[] = [
  { semanticKey: "fire_alarm.sounder_level", label: "Sounder level", quantity: "sound", allowedUnits: ["dB"],
    limit: { min: 65, standardRef: "BS 5839-1 (min 65 dB(A) general areas)" } },
  { semanticKey: "fire_alarm.battery_voltage", label: "Standby battery voltage", quantity: "voltage", allowedUnits: ["V"] },
  { semanticKey: "emergency_lighting.discharge_duration", label: "Discharge duration", quantity: "duration", allowedUnits: ["min", "h"] },
  { semanticKey: "sprinkler.static_pressure", label: "Static pressure", quantity: "pressure", allowedUnits: P },
  { semanticKey: "sprinkler.residual_pressure", label: "Residual pressure", quantity: "pressure", allowedUnits: P },
  { semanticKey: "hydrant.static_pressure", label: "Hydrant static pressure", quantity: "pressure", allowedUnits: P },
  { semanticKey: "hydrant.flow", label: "Hydrant flow", quantity: "flow", allowedUnits: F },
  { semanticKey: "fire_pump.suction_pressure", label: "Pump suction pressure", quantity: "pressure", allowedUnits: P },
  { semanticKey: "fire_pump.discharge_pressure", label: "Pump discharge pressure", quantity: "pressure", allowedUnits: P },
  { semanticKey: "fire_pump.flow", label: "Pump flow", quantity: "flow", allowedUnits: F },
  { semanticKey: "extinguisher.gauge_pressure", label: "Extinguisher gauge pressure", quantity: "pressure", allowedUnits: P },
  { semanticKey: "hose_reel.flow", label: "Hose reel flow", quantity: "flow", allowedUnits: F },
];

function roundTo(n: number) {
  return Math.round(n * 100) / 100;
}

// "7.2 bar" when recorded in the standard unit, otherwise "100 psi (6.89 bar)".
export function formatReading(value: number, unit: string): string {
  if (!(unit in units)) return `${value} ${unit}`;
  const code = unit as UnitCode;
  const label = units[code].label;
  const standardCode = standardUnitFor[units[code].quantity];
  if (code === standardCode) return `${roundTo(value)} ${label}`;
  return `${roundTo(value)} ${label} (${roundTo(convertToStandard(value, code))} ${units[standardCode].label})`;
}

export function findReadingDefinition(key: string): ReadingDefinition | undefined {
  return readingCatalog.find((r) => r.semanticKey === key);
}
