import { describe, expect, it } from "vitest";

import {
  buildReportLayoutDefinition,
  clampColumns,
  clampRows,
  slugifyTemplateName
} from "@/lib/reports/template-builder";

describe("report template builder", () => {
  it("creates stable layout ids from template names", () => {
    expect(slugifyTemplateName("Client Summary Report")).toBe("client-summary-report");
    expect(slugifyTemplateName("  Detailed / Evidence ++ Report  ")).toBe("detailed-evidence-report");
    expect(slugifyTemplateName("!!!")).toBe("custom-report-template");
  });

  it("uses the client summary preset when no custom sections are selected", () => {
    const layout = buildReportLayoutDefinition({
      description: "Short client-facing report",
      name: "Client Summary Report",
      preset: "client_summary",
      sectionTitles: new Map(),
      selectedSectionIds: new Set()
    });

    expect(layout.layoutId).toBe("client-summary-report");
    expect(layout.sections.map((section) => section.sectionId)).toEqual([
      "report_header",
      "report_summary",
      "field_evidence",
      "sign_off"
    ]);
    expect(layout.sections.some((section) => section.sectionId === "asset_register")).toBe(false);
    expect(layout.sections.some((section) => section.sectionId === "checklist_results")).toBe(false);
  });

  it("builds a custom report from selected section order, titles, and layout options", () => {
    const layout = buildReportLayoutDefinition({
      description: "Evidence-focused layout",
      name: "Detailed Evidence",
      preset: "custom",
      sectionColumns: new Map([
        ["field_evidence", 4],
        ["report_summary", 2],
        ["sign_off", 1]
      ]),
      sectionPhotoRows: new Map([["field_evidence", 3]]),
      sectionShowCaptions: new Map([["field_evidence", false]]),
      sectionFields: new Map([
        ["field_evidence", ["title", "severity"]],
        ["report_summary", ["clientName", "jobNumber"]],
        ["sign_off", ["ignored"]]
      ]),
      sectionOrderIds: ["field_evidence", "report_summary", "sign_off"],
      sectionTitles: new Map([
        ["field_evidence", "Photos & Findings"],
        ["report_summary", "Executive Summary"],
        ["sign_off", "Approval"]
      ]),
      selectedSectionIds: new Set(["field_evidence", "report_summary", "sign_off"])
    });

    expect(layout.sections.map((section) => section.sectionId)).toEqual([
      "report_header",
      "field_evidence",
      "report_summary",
      "sign_off"
    ]);

    expect(layout.sections.find((section) => section.sectionId === "field_evidence")).toMatchObject({
      content: { title: "Photos & Findings" },
      binding: { fields: ["title", "severity"] },
      options: { columns: 4, photoRows: 3, showCaptions: false }
    });
    expect(layout.sections.find((section) => section.sectionId === "report_summary")).toMatchObject({
      content: { title: "Executive Summary" },
      binding: { fields: ["clientName", "jobNumber"] },
      options: { columns: 2 }
    });
    expect(layout.sections.find((section) => section.sectionId === "sign_off")).toMatchObject({
      content: { title: "Approval" },
      options: { columns: 1, layout: "single_column" }
    });
  });

  it("clamps configurable layout values to supported bounds", () => {
    expect(clampColumns(99)).toBe(4);
    expect(clampColumns(0)).toBeNull();
    expect(clampColumns(1.6)).toBe(2);
    expect(clampRows(99)).toBe(8);
    expect(clampRows(-2)).toBe(1);
    expect(clampRows(Number.NaN)).toBeNull();
  });
});
