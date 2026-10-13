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
