import { describe, expect, it } from "vitest";
import { parseReportOutputFormat, reportOutputFilename } from "@/lib/reports/report-output";

describe("report output contract", () => {
  it("accepts PDF explicitly and defaults unknown formats to HTML", () => {
    expect(parseReportOutputFormat("pdf")).toBe("pdf");
    expect(parseReportOutputFormat("html")).toBe("html");
    expect(parseReportOutputFormat(null)).toBe("html");
    expect(parseReportOutputFormat("json")).toBe("json");
    expect(parseReportOutputFormat("docx")).toBe("html");
  });

  it("creates safe deterministic filenames for downloadable reports", () => {
    expect(reportOutputFilename("UKB/2026:000004", "pdf")).toBe("UKB-2026-000004.pdf");
    expect(reportOutputFilename("Client A Report", "html")).toBe("Client-A-Report.html");
  });
});
