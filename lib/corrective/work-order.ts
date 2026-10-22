export const workOrderAuthorizations = ["APPROVED_QUOTE", "MANAGEMENT_EXCEPTION"] as const;

export type WorkOrderAuthorization = (typeof workOrderAuthorizations)[number];

export function isWorkOrderAuthorization(value: string): value is WorkOrderAuthorization {
  return workOrderAuthorizations.includes(value as WorkOrderAuthorization);
}

export function isValidWorkOrderDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isValidManagementExceptionReason(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length >= 10 && trimmed.length <= 1000;
}
