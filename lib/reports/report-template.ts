import type { Json } from "@/lib/supabase/database.types";
import type { ReportLayoutDefinition } from "@/lib/reports/report-layout";
import { standardMaintenanceReportLayout } from "@/lib/reports/standard-maintenance-report-layout";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReportLayoutDefinition(value: unknown): value is ReportLayoutDefinition {
  if (!isRecord(value) || !Array.isArray(value.sections)) {
    return false;
  }

  return (
    typeof value.layoutId === "string" &&
    typeof value.name === "string" &&
    typeof value.version === "string" &&
    typeof value.locked === "boolean" &&
    isRecord(value.page) &&
    value.page.size === "A4" &&
    (value.page.orientation === "portrait" || value.page.orientation === "landscape") &&
    value.sections.every((section) => isRecord(section) && typeof section.sectionId === "string" && typeof section.blockType === "string")
  );
}

export function resolveReportLayout(layout: Json | null | undefined): ReportLayoutDefinition {
  return isReportLayoutDefinition(layout) ? layout : standardMaintenanceReportLayout;
}
