import { nextMaintenanceDate, type MaintenanceFrequency } from "@/lib/maintenance/recurrence";

export type PlannedCycle = { scheduledDate: string; sequence: number };

export function planMaintenanceHorizon(
  currentDate: string,
  horizonEnd: string,
  frequency: MaintenanceFrequency,
  intervalDays?: number
) {
  if (horizonEnd < currentDate) throw new Error("Planning horizon must be on or after the current date");

  const cycles: PlannedCycle[] = [];
  let anchor = currentDate;
  while (true) {
    const scheduledDate = nextMaintenanceDate(anchor, frequency, intervalDays);
    if (scheduledDate > horizonEnd) break;
    cycles.push({ scheduledDate, sequence: cycles.length + 1 });
    anchor = scheduledDate;
  }
  return cycles;
}
