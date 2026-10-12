import type { ReportLayoutDefinition } from "@/lib/reports/report-layout";

export function reportTemplateStats(layout: ReportLayoutDefinition) {
  const sections = layout.sections.filter((section) => section.blockType !== "header");
  const fieldCount = sections.reduce((count, section) => count + (section.binding.fields?.length ?? 0), 0);

  return {
    fieldCount,
    sectionCount: sections.length
  };
}
