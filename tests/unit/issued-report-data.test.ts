import { describe, expect, it, vi } from "vitest";
import { fetchIssuedReportData } from "@/lib/reports/issued-report-data";
import { standardMaintenanceReportLayout } from "@/lib/reports/standard-maintenance-report-layout";

function query(result: { data: unknown; error: Error | null }) {
  const promise = Promise.resolve(result);

  return {
    select: () => query(result),
    eq: () => query(result),
    in: () => query(result),
    order: () => query(result),
    single: () => promise,
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise)
  };
}

describe("fetchIssuedReportData", () => {
  it("returns a not-found error when report access or lookup fails", async () => {
    const from = vi.fn(() => query({ data: null, error: new Error("Report not found") }));
    const supabase = { from, storage: { from: vi.fn() } } as never;

    const result = await fetchIssuedReportData(supabase, "missing-report", { issuedOnly: true });

    expect(result.data).toBeNull();
    expect(result.error).toEqual(new Error("Report not found"));
    expect(from).toHaveBeenCalledWith("reports");
  });

  it("keeps report data when a finding photo cannot be signed", async () => {
    const from = vi.fn((table: string) => {
      if (table === "reports") {
        return query({
          data: {
            id: "report-1",
            job_id: "job-1",
            report_number: "UKB-2026-000005",
            title: "Photo Error Report",
            status: "ISSUED",
            generated_at: "2026-10-08",
            issued_at: "2026-10-08",
            template_id: null,
            report_templates: null,
            maintenance_jobs: {
              job_number: "UKB-JOB-1",
              scheduled_date: "2026-10-08",
              clients: { name: "Client A" },
              sites: { name: "Site A" }
            }
          },
          error: null
        });
      }

      if (table === "findings") {
        return query({
          data: [{ id: "finding-1", title: "Failure", severity: "CRITICAL", status: "OPEN", description: null, recommendation: null, created_at: "2026-10-08" }],
          error: null
        });
      }

      if (table === "finding_photos") {
        return query({
          data: [{ id: "photo-1", finding_id: "finding-1", storage_path: "missing/photo.jpg", caption: null, taken_at: null, created_at: "2026-10-08" }],
          error: null
        });
      }

      return query({ data: [], error: null });
    });
    const supabase = {
      from,
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: new Error("Photo unavailable") })
        }))
      }
    } as never;

    const result = await fetchIssuedReportData(supabase, "report-1");

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.loadErrors.findingPhotos).toBe(true);
    expect(result.data!.findings[0]!.photos[0]!.signedUrl).toBeNull();
    expect(result.data!.report.reportNumber).toBe("UKB-2026-000005");
  });

  it("flags inspection loading failures without hiding the issued report", async () => {
    const from = vi.fn((table: string) => {
      if (table === "reports") {
        return query({
          data: {
            id: "report-2",
            job_id: "job-2",
            report_number: "UKB-2026-000006",
            title: "Checklist Error Report",
            status: "ISSUED",
            generated_at: "2026-10-08",
            issued_at: "2026-10-08",
            template_id: null,
            report_templates: null,
            maintenance_jobs: {
              job_number: "UKB-JOB-2",
              scheduled_date: "2026-10-08",
              clients: { name: "Client A" },
              sites: { name: "Site A" }
            }
          },
          error: null
        });
      }

      if (table === "inspections") {
        return query({ data: null, error: new Error("Checklist unavailable") });
      }

      if (table === "job_equipment") {
        return query({
          data: [{ id: "job-equipment-2", equipment: { asset_code: "ASSET-2", location_description: null, equipment_types: null, systems: null } }],
          error: null
        });
      }

      return query({ data: [], error: null });
    });
    const supabase = { from, storage: { from: vi.fn() } } as never;

    const result = await fetchIssuedReportData(supabase, "report-2");

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.loadErrors.inspections).toBe(true);
    expect(result.data!.checklistGroups).toEqual([]);
    expect(result.data!.report.reportNumber).toBe("UKB-2026-000006");
  });

  it("flags missing checklist template items while retaining the inspection group", async () => {
    const from = vi.fn((table: string) => {
      if (table === "reports") {
        return query({
          data: {
            id: "report-3",
            job_id: "job-3",
            report_number: "UKB-2026-000007",
            title: "Incomplete Checklist Report",
            status: "ISSUED",
            generated_at: "2026-10-08",
            issued_at: "2026-10-08",
            template_id: null,
            report_templates: null,
            maintenance_jobs: {
              job_number: "UKB-JOB-3",
              scheduled_date: "2026-10-08",
              clients: { name: "Client A" },
              sites: { name: "Site A" }
            }
          },
          error: null
        });
      }

      if (table === "job_equipment") {
        return query({
          data: [{ id: "job-equipment-3", equipment: { asset_code: "ASSET-3", location_description: null, equipment_types: null, systems: null } }],
          error: null
        });
      }

      if (table === "inspections") {
        return query({
          data: [{ id: "inspection-3", job_equipment_id: "job-equipment-3", template_id: "inspection-template-3", status: "LOCKED", inspection_templates: { name: "Missing Items Checklist" } }],
          error: null
        });
      }

      if (table === "inspection_template_items") {
        return query({ data: null, error: new Error("Checklist items unavailable") });
      }

      return query({ data: [], error: null });
    });
    const supabase = { from, storage: { from: vi.fn() } } as never;

    const result = await fetchIssuedReportData(supabase, "report-3");

    expect(result.error).toBeNull();
    expect(result.data!.loadErrors.templateItems).toBe(true);
    expect(result.data!.checklistGroups).toMatchObject([{ assetCode: "ASSET-3", checklistName: "Missing Items Checklist", items: [] }]);
  });

  it("assembles the persisted template, findings, photos, assets, and checklist results", async () => {
    const reportTemplateLayout = {
      ...standardMaintenanceReportLayout,
      layoutId: "client-summary-report",
      name: "Client Summary Report",
      version: "2.3.0"
    };
    const from = vi.fn((table: string) => {
      if (table === "reports") {
        return query({
          data: {
            id: "report-1",
            job_id: "job-1",
            report_number: "UKB-2026-000004",
            title: "Client Summary",
            status: "ISSUED",
            generated_at: "2026-10-08",
            issued_at: "2026-10-08",
            template_id: "template-1",
            report_templates: { name: "Client Summary Report", layout: reportTemplateLayout },
            maintenance_jobs: {
              job_number: "UKB-JOB-20261008-D89B92",
              scheduled_date: "2026-10-08",
              clients: { name: "Client A" },
              sites: { name: "Client A Demo Site" }
            }
          },
          error: null
        });
      }

      if (table === "findings") {
        return query({
          data: [
            {
              id: "finding-1",
              title: "Pressure failure",
              severity: "CRITICAL",
              status: "OPEN",
              description: "Pressure is low.",
              recommendation: "Recharge extinguisher.",
              created_at: "2026-10-08"
            }
          ],
          error: null
        });
      }

      if (table === "job_equipment") {
        return query({
          data: [
            {
              id: "job-equipment-1",
              equipment: {
                asset_code: "CLIENT-A-EXT-001",
                location_description: "main entrance",
                equipment_types: { name: "Fire Extinguisher" },
                systems: { name: "Fire Protection" }
              }
            }
          ],
          error: null
        });
      }

      if (table === "finding_photos") {
        return query({
          data: [
            {
              id: "photo-1",
              finding_id: "finding-1",
              storage_path: "org/job/finding/photo.jpg",
              caption: "Pressure gauge photo",
              taken_at: null,
              created_at: "2026-10-08"
            }
          ],
          error: null
        });
      }

      if (table === "inspections") {
        return query({
          data: [
            {
              id: "inspection-1",
              job_equipment_id: "job-equipment-1",
              template_id: "inspection-template-1",
              status: "LOCKED",
              inspection_templates: { name: "Fire Extinguisher Inspection" }
            }
          ],
          error: null
        });
      }

      if (table === "inspection_template_items") {
        return query({
          data: [
            {
              id: "item-1",
              template_id: "inspection-template-1",
              prompt: "Pressure indicator is acceptable",
              sort_order: 1
            }
          ],
          error: null
        });
      }

      return query({
        data: [
          {
            id: "result-1",
            inspection_id: "inspection-1",
            template_item_id: "item-1",
            result_status: "FAIL"
          }
        ],
        error: null
      });
    });
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.test/photo" }, error: null });
    const supabase = { from, storage: { from: vi.fn(() => ({ createSignedUrl })) } } as never;

    const result = await fetchIssuedReportData(supabase, "report-1", { issuedOnly: true });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    const data = result.data!;

    expect(data.report).toMatchObject({
      reportNumber: "UKB-2026-000004",
      templateId: "template-1",
      templateName: "Client Summary Report"
    });
    expect(data.layout).toMatchObject({ layoutId: "client-summary-report", version: "2.3.0" });
    expect(data.findings[0]!.photos[0]).toMatchObject({
      caption: "Pressure gauge photo",
      signedUrl: "https://storage.test/photo"
    });
    expect(data.assets[0]).toMatchObject({ assetCode: "CLIENT-A-EXT-001", inspectionStatus: "LOCKED" });
    expect(data.checklistGroups[0]!.items[0]).toMatchObject({
      prompt: "Pressure indicator is acceptable",
      resultStatus: "FAIL"
    });
    expect(createSignedUrl).toHaveBeenCalledWith("org/job/finding/photo.jpg", 3600);
    expect(from).toHaveBeenCalledWith("reports");
  });
});
