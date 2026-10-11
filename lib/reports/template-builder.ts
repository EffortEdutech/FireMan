import type { ReportBlockType, ReportDataBinding, ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";

export type TemplatePreset = "client_summary" | "detailed_evidence" | "custom";

type SectionDefinition = {
  id: string;
  defaultTitle: string;
  blockType: ReportBlockType;
  source?: ReportDataBinding;
  fields?: string[];
};

export const reportTemplateSections = [
  {
    id: "report_summary",
    defaultTitle: "Report Summary",
    blockType: "summary_grid",
    source: "summary",
    fields: ["clientName", "siteName", "jobNumber", "scheduledDate", "generatedAt", "issuedAt"]
  },
  {
    id: "asset_register",
    defaultTitle: "Serviced Assets",
    blockType: "asset_table",
    source: "assets",
    fields: ["assetCode", "equipmentType", "systemName", "location", "inspectionStatus"]
  },
  {
    id: "field_evidence",
    defaultTitle: "Field Evidence",
    blockType: "field_evidence",
    source: "findings",
    fields: ["title", "severity", "status", "description", "recommendation", "createdAt"]
  },
  {
    id: "checklist_results",
    defaultTitle: "Checklist Results",
    blockType: "checklist_evidence",
    source: "checklistGroups",
    fields: ["assetCode", "checklistName", "status", "items"]
  },
  {
    id: "sign_off",
    defaultTitle: "Sign-off",
    blockType: "signature_box"
  }
] satisfies SectionDefinition[];

export const presetSectionIds: Record<TemplatePreset, string[]> = {
  client_summary: ["report_summary", "field_evidence", "sign_off"],
  detailed_evidence: reportTemplateSections.map((section) => section.id),
  custom: reportTemplateSections.map((section) => section.id)
};

export function slugifyTemplateName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "custom-report-template"
  );
}

export function buildReportLayoutDefinition({
  description,
  name,
  preset,
  sectionTitles,
  selectedSectionIds
}: {
  description: string | null;
  name: string;
  preset: TemplatePreset;
  sectionTitles: Map<string, string>;
  selectedSectionIds: Set<string>;
}): ReportLayoutDefinition {
  const presetIds = presetSectionIds[preset] ?? presetSectionIds.custom;
  const selectedIds = selectedSectionIds.size > 0 ? selectedSectionIds : new Set(presetIds);
  const sections: ReportLayoutSection[] = [
    {
      sectionId: "report_header",
      blockType: "header",
      content: {
        title: name,
        subtitle: description ?? "Fire safety service evidence"
      },
      binding: {
        source: "report",
        fields: ["reportNumber", "title", "status", "issuedAt"]
      }
    },
    ...reportTemplateSections
      .filter((section) => selectedIds.has(section.id))
      .map((section) => ({
        sectionId: section.id,
        blockType: section.blockType,
        content: {
          title: sectionTitles.get(section.id) ?? section.defaultTitle,
          ...(section.id === "sign_off" ? { description: "Prepared for client record and audit filing." } : {})
        },
        binding: {
          ...(section.source ? { source: section.source } : {}),
          ...(section.fields ? { fields: section.fields } : {})
        },
        ...(section.id === "report_summary" ? { options: { columns: 3 } } : {}),
        ...(section.id === "sign_off" ? { options: { layout: "two_column" } } : {})
      }))
  ];

  return {
    layoutId: slugifyTemplateName(name),
    name,
    version: "1.0.0",
    locked: false,
    page: {
      size: "A4",
      orientation: "portrait",
      margins: {
        top: 20,
        right: 16,
        bottom: 20,
        left: 16
      }
    },
    sections
  };
}
