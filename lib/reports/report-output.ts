export type ReportOutputFormat = "html" | "pdf" | "json";

export function parseReportOutputFormat(value: string | null): ReportOutputFormat {
  if (value === "pdf" || value === "json") {
    return value;
  }

  return "html";
}

export function reportOutputFilename(reportNumber: string, format: ReportOutputFormat) {
  const safeReportNumber = reportNumber.replace(/[^a-z0-9_-]+/gi, "-");
  return `${safeReportNumber}.${format}`;
}
