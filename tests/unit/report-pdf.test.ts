import { describe, expect, it } from "vitest";
import type { IssuedReportData } from "@/lib/reports/issued-report-data";
import { buildReportPdfTextLines, renderReportPdf } from "@/lib/reports/report-pdf";
import { standardMaintenanceReportLayout } from "@/lib/reports/standard-maintenance-report-layout";

const reportData: IssuedReportData = {
  report: {
    id: "report-1",
    jobId: "job-1",
    reportNumber: "UKB-2026-000004",
    title: "Maintenance Report UKB-JOB-20261008-D89B92",
    status: "ISSUED",
    generatedAt: "2026-10-08",
    issuedAt: "2026-10-08"
  },
  client: {
    name: "Client A"
  },
  site: {
    name: "Client A Demo Site"
  },
  job: {
    jobNumber: "UKB-JOB-20261008-D89B92",
    scheduledDate: "2026-10-08"
  },
  summary: {
    checklistResultCount: 2,
    clientName: "Client A",
    findingCount: 1,
    generatedAt: "2026-10-08",
    issuedAt: "2026-10-08",
    jobNumber: "UKB-JOB-20261008-D89B92",
    scheduledDate: "2026-10-08",
    siteName: "Client A Demo Site"
  },
  assets: [
    {
      assetCode: "CLIENT-A-EXT-001",
      equipmentType: "Fire Extinguisher",
      id: "asset-1",
      inspectionStatus: "LOCKED",
      location: "main entrance",
      systemName: "Fire Protection"
    }
  ],
  findings: [
    {
      createdAt: "2026-10-08",
      description: "Pressure indicator is below acceptable range.",
      id: "finding-1",
      recommendation: "Replace or recharge extinguisher.",
      severity: "CRITICAL",
      status: "OPEN",
      title: "Pressure failure",
      photos: [
        {
          caption: "Pressure gauge photo",
          createdAt: "2026-10-08",
          id: "photo-1",
          signedUrl: "https://storage.test/pressure-gauge",
          storagePath: "org/job/finding/photo.jpg",
          takenAt: null
        }
      ]
    }
  ],
  checklistGroups: [
    {
      assetCode: "CLIENT-A-EXT-001",
      checklistName: "Fire Extinguisher - Standard Inspection v1",
      id: "inspection-1",
      items: [
        {
          id: "item-1",
          prompt: "Asset identification matches register",
          resultStatus: "PASS"
        },
        {
          id: "item-2",
          prompt: "Pressure indicator is in acceptable range where applicable",
          resultStatus: "FAIL"
        }
      ],
      status: "LOCKED"
    }
  ],
  loadErrors: {
    findings: false,
    findingPhotos: false,
    inspectionResults: false,
    inspections: false,
    templateItems: false
  }
};

describe("report PDF renderer", () => {
  it("emits a valid PDF envelope", () => {
    const pdf = renderReportPdf(reportData, standardMaintenanceReportLayout);
    const rendered = pdf.toString("latin1");

    expect(rendered.startsWith("%PDF-1.4")).toBe(true);
    expect(rendered).toContain("xref");
    expect(rendered).toContain("trailer");
    expect(rendered).toContain("Page 1 of 1");
    expect(rendered.endsWith("%%EOF")).toBe(true);
  });

  it("includes the report golden-path fields in generated text lines", () => {
    const lines = buildReportPdfTextLines(reportData, standardMaintenanceReportLayout);

    expect(lines).toContain("UKB-2026-000004");
    expect(lines).toContain("FireMaint Formal Maintenance Report");
    expect(lines).toContain("Maintenance Report UKB-JOB-20261008-D89B92");
    expect(lines).toContain("Client: Client A | Site: Client A Demo Site");
    expect(lines).toContain("Job: UKB-JOB-20261008-D89B92");
    expect(lines).toContain("Asset 1: CLIENT-A-EXT-001");
    expect(lines).toContain("Type: Fire Extinguisher");
    expect(lines).toContain("Finding 1: Pressure failure");
    expect(lines).toContain("Severity: CRITICAL");
    expect(lines).toContain("Photos: 1");
    expect(lines).toContain("Photo 1: Pressure gauge photo");
    expect(lines).toContain("Checklist 1: CLIENT-A-EXT-001");
    expect(lines).toContain("- Pressure indicator is in acceptable range where applicable: FAIL");
  });
});
