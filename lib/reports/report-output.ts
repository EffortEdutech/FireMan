export type ReportOutputFormat = "html" | "pdf";

export function parseReportOutputFormat(value: string | null): ReportOutputFormat {
  return value === "pdf" ? "pdf" : "html";
}

export function reportOutputFilename(reportNumber: string, format: ReportOutputFormat) {
  const safeReportNumber = reportNumber.replace(/[^a-z0-9_-]+/gi, "-");
  return `${safeReportNumber}.${format}`;
}
