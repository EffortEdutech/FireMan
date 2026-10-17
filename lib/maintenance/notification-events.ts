export const notificationTypes = {
  dueSoon: "JOB_DUE_SOON",
  overdue: "JOB_OVERDUE",
  criticalFinding: "CRITICAL_FINDING",
  awaitingReview: "JOB_AWAITING_REVIEW"
} as const;

export type NotificationEvent = keyof typeof notificationTypes;

export function notificationDedupeKey(event: NotificationEvent, entityId: string, window: string) {
  return `firemaint:${notificationTypes[event]}:${entityId}:${window}`;
}
