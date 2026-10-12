import type { ReportBlockType, ReportDataBinding, ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";

export type TemplatePreset = "client_summary" | "detailed_evidence" | "custom";

export type ReportTemplateSectionDefinition = {
  id: string;
  defaultColumns?: number;
  defaultPhotoRows?: number;
  supportsPhotoOptions?: boolean;
  defaultTitle: string;
  blockType: ReportBlockType;
  source?: ReportDataBinding;
  fields?: string[];
  fieldLabels?: Record<string, string>;
};

export const reportTemplateSections = [
  {
    id: "report_summary",
    defaultColumns: 3,
    defaultTitle: "Report Summary",
    blockType: "summary_grid",
    source: "summary",
    fields: ["clientName", "siteName", "jobNumber", "scheduledDate", "generatedAt", "issuedAt"],
    fieldLabels: {
      clientName: "Client",
      generatedAt: "Generated",
      issuedAt: "Issued",
      jobNumber: "Job",
      scheduledDate: "Scheduled",
      siteName: "Site"
    }
  },
  {
    id: "asset_register",
    defaultTitle: "Serviced Assets",
    blockType: "asset_table",
    source: "assets",
    fields: ["assetCode", "equipmentType", "systemName", "location", "inspectionStatus"],
    fieldLabels: {
      assetCode: "Asset",
      equipmentType: "Type",
      inspectionStatus: "Inspection",
      location: "Location",
      systemName: "System"
    }
  },
  {
    id: "field_evidence",
    defaultColumns: 2,
    defaultPhotoRows: 2,
    defaultTitle: "Field Evidence",
    blockType: "field_evidence",
    supportsPhotoOptions: true,
    source: "findings",
    fields: ["title", "severity", "status", "description", "recommendation", "createdAt"],
    fieldLabels: {
      createdAt: "Captured date",
      description: "Description",
      recommendation: "Recommendation",
      severity: "Severity",
      status: "Status",
      title: "Finding title"
    }
  },
  {
    id: "checklist_results",
    defaultTitle: "Checklist Results",
    blockType: "checklist_evidence",
    source: "checklistGroups",
    fields: ["assetCode", "checklistName", "status", "items"],
    fieldLabels: {
      assetCode: "Asset",
      checklistName: "Checklist name",
      items: "Checklist items",
      status: "Inspection status"
    }
  },
  {
    id: "sign_off",
    defaultColumns: 2,
    defaultTitle: "Sign-off",
    blockType: "signature_box"
  }
] satisfies ReportTemplateSectionDefinition[];

export const presetSectionIds: Record<TemplatePreset, string[]> = {
  client_summary: ["report_summary", "field_evidence", "sign_off"],
  detailed_evidence: reportTemplateSections.map((section) => section.id),
  custom: reportTemplateSections.map((section) => section.id)
};

export const presetSectionFields: Record<TemplatePreset, Record<string, string[]>> = {
  client_summary: {
    field_evidence: ["title", "severity", "status"],
    report_summary: ["clientName", "siteName", "jobNumber", "scheduledDate"]
  },
  detailed_evidence: Object.fromEntries(reportTemplateSections.map((section) => [section.id, section.fields ?? []])),
  custom: Object.fromEntries(reportTemplateSections.map((section) => [section.id, section.fields ?? []]))
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
  sectionPhotoRows,
  sectionShowCaptions,
  sectionFields,
  sectionOrderIds,
  sectionTitles,
  selectedSectionIds
}: {
  description: string | null;
  name: string;
  preset: TemplatePreset;
  sectionColumns?: Map<string, number>;
  sectionFields?: Map<string, string[]>;
  sectionPhotoRows?: Map<string, number>;
  sectionShowCaptions?: Map<string, boolean>;
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
        const fields = selectedFields(section, sectionFields?.get(section.id));
        const columns = clampColumns(sectionColumns?.get(section.id) ?? section.defaultColumns);
        const photoRows = clampRows(sectionPhotoRows?.get(section.id) ?? section.defaultPhotoRows);
        const options = {
          ...(columns ? { columns } : {}),
          ...(section.supportsPhotoOptions
            ? {
                photoRows: photoRows ?? 2,
                showCaptions: sectionShowCaptions?.get(section.id) ?? true
              }
            : {}),
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
            ...(fields.length > 0 ? { fields } : {})
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

function selectedFields(section: ReportTemplateSectionDefinition, selected: string[] | undefined) {
  if (!section.fields || section.fields.length === 0) {
    return [];
  }

  const allowed = new Set(section.fields);
  const filtered = (selected ?? []).filter((field) => allowed.has(field));

  return filtered.length > 0 ? filtered : section.fields;
}

export function clampColumns(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(4, Math.max(1, Math.round(value)));
}

export function clampRows(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(8, Math.max(1, Math.round(value)));
}
