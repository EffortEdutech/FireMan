import type { ReportBlockType, ReportDataBinding, ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";

export type TemplatePreset = "client_summary" | "detailed_evidence" | "custom";

type SectionDefinition = {
  id: string;
  defaultColumns?: number;
  defaultTitle: string;
  blockType: ReportBlockType;
  source?: ReportDataBinding;
  fields?: string[];
};

export const reportTemplateSections = [
  {
    id: "report_summary",
    defaultColumns: 3,
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
    defaultColumns: 2,
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
    defaultColumns: 2,
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
  sectionColumns,
  sectionOrderIds,
  sectionTitles,
  selectedSectionIds
}: {
  description: string | null;
  name: string;
  preset: TemplatePreset;
  sectionColumns?: Map<string, number>;
  sectionOrderIds?: string[];
  sectionTitles: Map<string, string>;
  selectedSectionIds: Set<string>;
}): ReportLayoutDefinition {
  const presetIds = presetSectionIds[preset] ?? presetSectionIds.custom;
  const selectedIds = selectedSectionIds.size > 0 ? selectedSectionIds : new Set(presetIds);
  const orderedIds = sectionOrderIds && sectionOrderIds.length > 0 ? sectionOrderIds : reportTemplateSections.map((section) => section.id);
  const sectionById = new Map(reportTemplateSections.map((section) => [section.id, section]));
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
    ...orderedIds
      .map((sectionId) => sectionById.get(sectionId))
      .filter((section): section is NonNullable<ReturnType<typeof sectionById.get>> => Boolean(section))
      .filter((section) => selectedIds.has(section.id))
      .map((section) => {
        const columns = clampColumns(sectionColumns?.get(section.id) ?? section.defaultColumns);
        const options = {
          ...(columns ? { columns } : {}),
          ...(section.id === "sign_off" ? { layout: columns === 1 ? "single_column" : "two_column" } : {})
        };

        return {
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
          ...(Object.keys(options).length > 0 ? { options } : {})
        };
      })
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

export function clampColumns(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(4, Math.max(1, Math.round(value)));
}
