import { describe, expect, it } from "vitest";
import type { IssuedReportData } from "@/lib/reports/issued-report-data";
import { buildReportManifest } from "@/lib/reports/report-manifest";
import { standardMaintenanceReportLayout } from "@/lib/reports/standard-maintenance-report-layout";

const data = {
  report: {
    id: "report-1",
    jobId: "job-1",
    reportNumber: "UKB-2026-000004",
    title: "Maintenance Report",
    status: "ISSUED",
    templateId: "template-1",
    templateName: "Standard Maintenance Report",
    generatedAt: "2026-10-08",
    issuedAt: "2026-10-08"
  },
  client: { name: "Client A" },
  site: { name: "Site A" },
  job: { jobNumber: "UKB-JOB-1", scheduledDate: "2026-10-08" },
  summary: {
    clientName: "Client A",
    siteName: "Site A",
    jobNumber: "UKB-JOB-1",
    scheduledDate: "2026-10-08",
    generatedAt: "2026-10-08",
    issuedAt: "2026-10-08",
    findingCount: 1,
    checklistResultCount: 2
  },
  assets: [{ id: "asset-1", assetCode: "EXT-1", equipmentType: "Extinguisher", systemName: "Fire", location: "Lobby", inspectionStatus: "LOCKED" }],
  findings: [{ id: "finding-1", title: "Failure", severity: "CRITICAL", status: "OPEN", description: null, recommendation: null, createdAt: "2026-10-08", photos: [{ id: "photo-1", storagePath: "photo.jpg", signedUrl: null, caption: null, takenAt: null, createdAt: "2026-10-08" }] }],
  checklistGroups: [{ id: "group-1", assetCode: "EXT-1", checklistName: "Inspection", status: "LOCKED", items: [] }],
  layout: standardMaintenanceReportLayout,
  loadErrors: { findings: false, findingPhotos: true, inspections: false, templateItems: false, inspectionResults: false }
} satisfies IssuedReportData;

describe("report manifest", () => {
  it("summarizes frozen template and evidence metadata for machine consumers", () => {
    const manifest = buildReportManifest(data);

    expect(manifest.schemaVersion).toBe("1.0");
    expect(manifest.template).toMatchObject({
      name: "Standard Maintenance Report",
      version: "1.0.0",
      behavior: "FROZEN_ON_REPORT",
      sectionCount: 5,
      selectedFieldCount: 21
    });
    expect(manifest.evidence).toMatchObject({
      assetCount: 1,
      findingCount: 1,
      photoCount: 1,
      checklistGroupCount: 1,
      checklistResultCount: 2,
      loadWarnings: ["findingPhotos"]
    });
    expect(manifest.outputs).toEqual(["pdf", "html", "json"]);
  });
});
