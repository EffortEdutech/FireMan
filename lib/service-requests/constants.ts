import type { Database } from "@/lib/supabase/types";

export type ServiceRequestStatus = Database["public"]["Enums"]["service_request_status"];
export type ServiceRequestCategory = Database["public"]["Enums"]["service_request_category"];

export const serviceRequestStatusLabels: Record<ServiceRequestStatus, string> = {
  NEW: "Submitted",
  TRIAGE: "Under review",
  NEEDS_CUSTOMER_INFO: "Information needed",
  SITE_VISIT_TO_ARRANGE: "Site visit to arrange",
  QUOTE_PREPARATION: "Quotation being prepared",
  READY_TO_SCHEDULE: "Ready to schedule",
  AWAITING_CUSTOMER_DECISION: "Awaiting your decision",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "Work in progress",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  UNABLE_TO_PROCEED: "Unable to proceed",
  CLOSED_WITHOUT_WORK: "Closed without work"
};

export const serviceRequestStatuses = Object.keys(serviceRequestStatusLabels) as ServiceRequestStatus[];

export const serviceRequestTransitions: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
  NEW: ["TRIAGE", "CANCELLED", "UNABLE_TO_PROCEED"],
  TRIAGE: ["NEEDS_CUSTOMER_INFO", "SITE_VISIT_TO_ARRANGE", "QUOTE_PREPARATION", "READY_TO_SCHEDULE", "SCHEDULED", "CANCELLED", "UNABLE_TO_PROCEED"],
  NEEDS_CUSTOMER_INFO: ["TRIAGE", "SITE_VISIT_TO_ARRANGE", "QUOTE_PREPARATION", "READY_TO_SCHEDULE", "CANCELLED", "UNABLE_TO_PROCEED"],
  SITE_VISIT_TO_ARRANGE: ["TRIAGE", "QUOTE_PREPARATION", "READY_TO_SCHEDULE", "CANCELLED", "UNABLE_TO_PROCEED"],
  QUOTE_PREPARATION: ["AWAITING_CUSTOMER_DECISION", "READY_TO_SCHEDULE", "CLOSED_WITHOUT_WORK", "CANCELLED", "UNABLE_TO_PROCEED"],
  READY_TO_SCHEDULE: ["SCHEDULED", "IN_PROGRESS", "CANCELLED", "UNABLE_TO_PROCEED"],
  AWAITING_CUSTOMER_DECISION: ["APPROVED", "DECLINED", "QUOTE_PREPARATION", "CANCELLED"],
  APPROVED: ["READY_TO_SCHEDULE", "SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED", "UNABLE_TO_PROCEED"],
  IN_PROGRESS: ["COMPLETED", "UNABLE_TO_PROCEED"],
  COMPLETED: ["CLOSED"],
  CLOSED: [],
  DECLINED: ["CLOSED"],
  CANCELLED: ["CLOSED"],
  UNABLE_TO_PROCEED: ["CLOSED"],
  CLOSED_WITHOUT_WORK: ["CLOSED"]
};

export const serviceRequestCategoryLabels: Record<ServiceRequestCategory, string> = {
  REACTIVE_ISSUE: "A fault or service issue",
  PLANNED_SERVICE: "Planned service",
  INSPECTION: "Inspection",
  FINDING_FOLLOW_UP: "Follow up an inspection finding",
  QUOTATION: "Request a quotation",
  OTHER: "Other"
};

export const serviceRequestUrgencyLabels = {
  ROUTINE: "Routine",
  PRIORITY: "Priority",
  URGENT: "Urgent"
} as const;

