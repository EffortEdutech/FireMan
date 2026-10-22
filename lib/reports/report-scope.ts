import type { IssuedReportData } from "@/lib/reports/issued-report-data";
import type { ReportLayoutSection } from "@/lib/reports/report-layout";

/**
 * Returns the system types a section is limited to (`options.systemTypes`),
 * or null when the section is unscoped and shows everything on the job.
 */
export function sectionSystemTypes(section: ReportLayoutSection): string[] | null {
  const value = section.options?.systemTypes;
  if (!Array.isArray(value)) return null;
  const types = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return types.length > 0 ? types : null;
}

/**
 * Narrow report data to the systems a section is scoped to.
 * Assets, checklist groups and findings with no known system type are excluded
 * from a scoped section; an unscoped section in the same layout still shows them,
 * so a combined template keeps a consolidated register of everything.
 */
export function scopeDataForSection(data: IssuedReportData, section: ReportLayoutSection): IssuedReportData {
  const types = sectionSystemTypes(section);
  if (!types) return data;

  const allowed = new Set(types);
  const matches = (systemType: string | null | undefined) => Boolean(systemType && allowed.has(systemType));

  return {
    ...data,
    assets: data.assets.filter((asset) => matches(asset.systemType)),
    checklistGroups: data.checklistGroups.filter((group) => matches(group.systemType)),
    findings: data.findings.filter((finding) => matches(finding.systemType))
  };
}

/** Bullet lines for a `static_text` section (`options.items`); empty when none. */
export function staticTextItems(section: ReportLayoutSection): string[] {
  const value = section.options?.items;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}
