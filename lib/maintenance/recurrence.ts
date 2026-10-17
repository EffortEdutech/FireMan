export type MaintenanceFrequency = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "CUSTOM";

export function nextMaintenanceDate(currentDate: string, frequency: MaintenanceFrequency, intervalDays?: number) {
  const date = new Date(`${currentDate}T00:00:00Z`);

  if (frequency === "CUSTOM") {
    if (!intervalDays || intervalDays < 1) throw new Error("Custom maintenance interval must be positive");
    date.setUTCDate(date.getUTCDate() + intervalDays);
  } else {
    const months = { MONTHLY: 1, QUARTERLY: 3, HALF_YEARLY: 6, YEARLY: 12 }[frequency];
    date.setUTCMonth(date.getUTCMonth() + months);
  }

  return date.toISOString().slice(0, 10);
}
