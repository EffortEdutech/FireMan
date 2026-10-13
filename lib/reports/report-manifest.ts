import type { IssuedReportData } from "@/lib/reports/issued-report-data";
import { reportTemplateStats } from "@/lib/reports/report-template-stats";

export type ReportManifest = {
  schemaVersion: "1.0";
  report: IssuedReportData["report"];
  client: IssuedReportData["client"];
  site: IssuedReportData["site"];
  job: IssuedReportData["job"];
  template: {
    name: string;
    version: string;
    behavior: "FROZEN_ON_REPORT";
    sectionCount: number;
    selectedFieldCount: number;
  };
  evidence: {
    assetCount: number;
    findingCount: number;
    photoCount: number;
    checklistGroupCount: number;
    checklistResultCount: number;
    loadWarnings: string[];
  };
  outputs: ["pdf", "html", "json"];
};

export function buildReportManifest(data: IssuedReportData): ReportManifest {
  const templateStats = reportTemplateStats(data.layout);
  const loadWarnings = Object.entries(data.loadErrors)
    .filter(([, hasError]) => hasError)
    .map(([source]) => source);

  return {
    schemaVersion: "1.0",
    report: data.report,
    client: data.client,
    site: data.site,
    job: data.job,
    template: {
      name: data.report.templateName,
      version: data.layout.version,
      behavior: "FROZEN_ON_REPORT",
      sectionCount: templateStats.sectionCount,
      selectedFieldCount: templateStats.fieldCount
    },
    evidence: {
      assetCount: data.assets.length,
      findingCount: data.findings.length,
      photoCount: data.findings.reduce((count, finding) => count + finding.photos.length, 0),
      checklistGroupCount: data.checklistGroups.length,
      checklistResultCount: data.summary.checklistResultCount,
      loadWarnings
    },
    outputs: ["pdf", "html", "json"]
  };
}
