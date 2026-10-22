import { describe, expect, it } from "vitest";
import type { IssuedReportData } from "@/lib/reports/issued-report-data";
import { renderReportHtml } from "@/lib/reports/report-html";
import { buildReportPdfTextLines } from "@/lib/reports/report-pdf";
import { scopeDataForSection, sectionSystemTypes, staticTextItems } from "@/lib/reports/report-scope";
import { resolveReportLayout } from "@/lib/reports/report-template";
import { buildSystemReportCatalog, fireSystemModules } from "@/lib/reports/system-report-catalog";
import type { Database } from "@/lib/supabase/database.types";

type SystemType = Database["public"]["Enums"]["system_type"];

const validSystemTypes: SystemType[] = [
  "FIRE_ALARM",
  "FIRE_EXTINGUISHING",
  "HOSE_REEL",
  "SPRINKLER",
  "EMERGENCY_LIGHTING",
  "EXIT_SIGNAGE",
  "HYDRANT_RISER",
  "FIRE_PUMP",
  "GASEOUS_SUPPRESSION",
  "FOAM_SUPPRESSION",
  "PASSIVE_PROTECTION",
  "SMOKE_CONTROL",
  "OTHER"
];

const catalog = buildSystemReportCatalog();

const data: IssuedReportData = {
  report: {
    id: "report-1",
    jobId: "job-1",
    reportNumber: "UKB-2026-000010",
    title: "Service visit",
    status: "ISSUED",
    templateId: "template-1",
    templateName: "Test",
    generatedAt: "2026-10-21",
    issuedAt: "2026-10-21"
  },
  client: { name: "Client A" },
  site: { name: "Site A" },
  job: { jobNumber: "JOB-1", scheduledDate: "2026-10-21" },
  summary: {
    clientName: "Client A",
    siteName: "Site A",
    jobNumber: "JOB-1",
    scheduledDate: "2026-10-21",
    generatedAt: "2026-10-21",
    issuedAt: "2026-10-21",
    findingCount: 3,
    checklistResultCount: 0
  },
  assets: [
    { id: "a1", assetCode: "FA-PANEL-1", equipmentType: "Fire Alarm Panel", systemName: "Alarm", systemType: "FIRE_ALARM", location: "Lobby", inspectionStatus: "COMPLETED" },
    { id: "a2", assetCode: "SPR-VALVE-1", equipmentType: "Alarm Valve", systemName: "Sprinkler", systemType: "SPRINKLER", location: "Pump room", inspectionStatus: "COMPLETED" },
    { id: "a3", assetCode: "UNKNOWN-1", equipmentType: "Other", systemName: "Other", systemType: null, location: "Roof", inspectionStatus: "COMPLETED" }
  ],
  findings: [
    { id: "f1", title: "Detector fault", severity: "HIGH", status: "OPEN", description: null, recommendation: null, createdAt: "2026-10-21", photos: [], systemType: "FIRE_ALARM" },
    { id: "f2", title: "Obstructed head", severity: "LOW", status: "OPEN", description: null, recommendation: null, createdAt: "2026-10-21", photos: [], systemType: "SPRINKLER" },
    { id: "f3", title: "Unassigned note", severity: "OBSERVATION", status: "OPEN", description: null, recommendation: null, createdAt: "2026-10-21", photos: [] }
  ],
  checklistGroups: [
    { id: "c1", assetCode: "FA-PANEL-1", systemType: "FIRE_ALARM", checklistName: "Alarm panel", status: "COMPLETED", items: [] },
    { id: "c2", assetCode: "SPR-VALVE-1", systemType: "SPRINKLER", checklistName: "Alarm valve", status: "COMPLETED", items: [] }
  ],
  layout: catalog[0]!.layout,
  loadErrors: { findings: false, findingPhotos: false, correctiveWorkOrders: false, inspections: false, templateItems: false, inspectionResults: false }
};

describe("system report catalogue", () => {
  it("produces many templates with unique slugs and names", () => {
    expect(catalog.length).toBeGreaterThanOrEqual(25);
    expect(new Set(catalog.map((template) => template.slug)).size).toBe(catalog.length);
    expect(new Set(catalog.map((template) => template.name)).size).toBe(catalog.length);
  });

  it("offers both per-system and combined per-visit templates", () => {
    expect(catalog.some((template) => template.kind === "COMBINED")).toBe(true);
    expect(catalog.filter((template) => template.kind === "SYSTEM").length).toBeGreaterThan(catalog.filter((template) => template.kind === "COMBINED").length);
  });

  it("covers every fire system module with at least one template", () => {
    for (const module of fireSystemModules) {
      expect(catalog.some((template) => template.kind === "SYSTEM" && template.slug.startsWith(module.key))).toBe(true);
    }
  });

  it.each(catalog.map((template) => [template.slug, template] as const))("%s is a valid, resolvable layout", (_slug, template) => {
    expect(resolveReportLayout(template.layout as never)).toBe(template.layout);
    const sectionIds = template.layout.sections.map((section) => section.sectionId);
    expect(new Set(sectionIds).size).toBe(sectionIds.length);
    expect(template.layout.sections[0]!.blockType).toBe("header");
    expect(template.layout.sections.at(-1)?.blockType).toBe("signature_box");
    for (const section of template.layout.sections) {
      const types = sectionSystemTypes(section);
      for (const type of types ?? []) {
        expect(validSystemTypes).toContain(type);
      }
    }
  });

  it("lists reference standards and never states a standard is verified for this contract", () => {
    for (const module of fireSystemModules) {
      expect(module.standards.length).toBeGreaterThan(0);
    }
    const alarm = catalog.find((template) => template.slug === "fire-alarm-quarterly");
    expect(JSON.stringify(alarm?.layout)).toContain("standard cited in the client contract");
  });
});

describe("section scoping", () => {
  it("returns the data unchanged for an unscoped section", () => {
    const section = catalog.find((template) => template.slug === "combined-annual")!.layout.sections.find((item) => item.sectionId === "consolidated_deficiencies")!;
    expect(scopeDataForSection(data, section)).toBe(data);
  });

  it("limits assets, checklists and findings to the section's system types", () => {
    const layout = catalog.find((template) => template.slug === "fire-alarm-quarterly")!.layout;
    const section = layout.sections.find((item) => item.sectionId === "system_assets")!;
    const scoped = scopeDataForSection(data, section);
    expect(scoped.assets.map((asset) => asset.assetCode)).toEqual(["FA-PANEL-1"]);
    expect(scoped.checklistGroups.map((group) => group.assetCode)).toEqual(["FA-PANEL-1"]);
    expect(scoped.findings.map((finding) => finding.id)).toEqual(["f1"]);
  });

  it("renders only the scoped system in HTML and PDF text for a per-system template", () => {
    const template = catalog.find((item) => item.slug === "fire-alarm-quarterly")!;
    const html = renderReportHtml(data, template.layout);
    expect(html).toContain("FA-PANEL-1");
    expect(html).toContain("Detector fault");
    expect(html).not.toContain("SPR-VALVE-1");
    expect(html).not.toContain("Obstructed head");
    expect(html).not.toContain("Unassigned note");
    expect(html).toContain("NFPA 72");

    const pdfText = buildReportPdfTextLines(data, template.layout).join("\n");
    expect(pdfText).toContain("FA-PANEL-1");
    expect(pdfText).not.toContain("SPR-VALVE-1");
    expect(pdfText).toContain("NFPA 72");
  });

  it("keeps every finding in the combined report's consolidated register", () => {
    const template = catalog.find((item) => item.slug === "combined-quarterly")!;
    const html = renderReportHtml(data, template.layout);
    expect(html).toContain("Detector fault");
    expect(html).toContain("Obstructed head");
    expect(html).toContain("Unassigned note");
  });

  it("reads static text bullet items safely", () => {
    expect(staticTextItems({ sectionId: "x", blockType: "static_text", content: {}, binding: {}, options: { items: ["a", " ", "b"] } })).toEqual(["a", "b"]);
    expect(staticTextItems({ sectionId: "x", blockType: "static_text", content: {}, binding: {} })).toEqual([]);
  });
});
