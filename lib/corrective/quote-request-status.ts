export const quoteRequestStatuses = ["REQUESTED", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"] as const;

export type QuoteRequestStatus = (typeof quoteRequestStatuses)[number];

const transitions: Record<QuoteRequestStatus, readonly QuoteRequestStatus[]> = {
  REQUESTED: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: []
};

export function isQuoteRequestStatus(value: string): value is QuoteRequestStatus {
  return quoteRequestStatuses.includes(value as QuoteRequestStatus);
}

export function canTransitionQuoteRequest(current: QuoteRequestStatus, next: QuoteRequestStatus) {
  return transitions[current].includes(next);
}

export function quoteRequestChoices(current: QuoteRequestStatus) {
  return [current, ...transitions[current]];
}

export function canEditQuoteReference(status: QuoteRequestStatus) {
  return status === "REQUESTED" || status === "SUBMITTED";
}
