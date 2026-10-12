import { Card } from "@/components/ui/card";
import { ChecklistResults } from "@/components/ui/checklist-results";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { SummaryField } from "@/components/ui/summary-field";
import { formatDate } from "@/lib/format/date";
import type { IssuedReportData } from "@/lib/reports/issued-report-data";
import type { ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";

type ReportLayoutRendererProps = {
  data: IssuedReportData;
  layout: ReportLayoutDefinition;
};

function sectionTitle(index: number, section: ReportLayoutSection) {
  return `${index}. ${section.content.title ?? section.sectionId}`;
}

function sectionColumns(section: ReportLayoutSection, fallback: number) {
  const columns = Number(section.options?.columns ?? fallback);

  if (!Number.isFinite(columns)) {
    return fallback;
  }

  return Math.min(4, Math.max(1, Math.round(columns)));
}

function sectionPhotoLimit(section: ReportLayoutSection) {
  const columns = sectionColumns(section, 2);
  const rows = Number(section.options?.photoRows ?? 2);
  const clampedRows = Number.isFinite(rows) ? Math.min(8, Math.max(1, Math.round(rows))) : 2;

  return columns * clampedRows;
}

function sectionFields(section: ReportLayoutSection, fallback: string[]) {
  return section.binding.fields && section.binding.fields.length > 0 ? section.binding.fields : fallback;
}

function hasField(section: ReportLayoutSection, field: string, fallback: string[]) {
  return sectionFields(section, fallback).includes(field);
}

function renderSummaryValue(data: IssuedReportData, field: string) {
  switch (field) {
    case "clientName":
      return data.summary.clientName;
    case "siteName":
      return data.summary.siteName;
    case "jobNumber":
      return data.summary.jobNumber;
    case "scheduledDate":
      return data.summary.scheduledDate;
    case "generatedAt":
      return formatDate(data.summary.generatedAt);
    case "issuedAt":
      return formatDate(data.summary.issuedAt);
    case "findingCount":
      return `${data.summary.findingCount}`;
    case "checklistResultCount":
      return `${data.summary.checklistResultCount} result${data.summary.checklistResultCount === 1 ? "" : "s"}`;
    default:
      return "Not set";
  }
}

function renderSummaryLabel(field: string) {
  const labels: Record<string, string> = {
    checklistResultCount: "Checklist",
    clientName: "Client",
    findingCount: "Findings",
    generatedAt: "Generated",
    issuedAt: "Issued",
    jobNumber: "Job",
    scheduledDate: "Scheduled",
    siteName: "Site"
  };

  return labels[field] ?? field;
}

function SummaryGrid({ data, section }: { data: IssuedReportData; section: ReportLayoutSection }) {
  const fields = sectionFields(section, ["clientName", "siteName", "jobNumber", "scheduledDate", "generatedAt", "issuedAt"]);
  const columns = sectionColumns(section, 3);

  return (
    <div className="print-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: "1rem" }}>
      {fields.map((field) => (
        <SummaryField key={field} label={renderSummaryLabel(field)} value={renderSummaryValue(data, field)} />
      ))}
    </div>
  );
}

const assetFieldLabels: Record<string, string> = {
  assetCode: "Asset",
  equipmentType: "Type",
  inspectionStatus: "Inspection",
  location: "Location",
  systemName: "System"
};

function assetFieldValue(asset: IssuedReportData["assets"][number], field: string) {
  const values: Record<string, string> = {
    assetCode: asset.assetCode,
    equipmentType: asset.equipmentType,
    inspectionStatus: asset.inspectionStatus,
    location: asset.location,
    systemName: asset.systemName
  };

  return values[field] ?? "Not set";
}

function AssetTable({ data, section }: { data: IssuedReportData; section: ReportLayoutSection }) {
  if (data.assets.length === 0) {
    return <EmptyState title="No assets included" message="This report has no assigned assets attached." />;
  }

  const fields = sectionFields(section, ["assetCode", "equipmentType", "systemName", "location", "inspectionStatus"]);

  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            {fields.map((field) => (
              <th key={field}>{assetFieldLabels[field] ?? field}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.assets.map((asset) => (
            <tr key={asset.id}>
              {fields.map((field) => (
                <td key={field}>{field === "assetCode" ? <strong>{asset.assetCode}</strong> : assetFieldValue(asset, field)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldEvidence({ data, section }: { data: IssuedReportData; section: ReportLayoutSection }) {
  if (data.loadErrors.findings) {
    return <EmptyState title="Evidence unavailable" message="Captured findings could not be loaded." />;
  }

  if (data.findings.length === 0) {
    return <EmptyState title="No findings included" message="This report was generated without field findings." />;
  }

  const photoColumns = sectionColumns(section, 2);
  const photoLimit = sectionPhotoLimit(section);
  const fieldFallback = ["title", "severity", "status", "description", "recommendation", "createdAt"];
  const showCreatedAt = hasField(section, "createdAt", fieldFallback);
  const showDescription = hasField(section, "description", fieldFallback);
  const showRecommendation = hasField(section, "recommendation", fieldFallback);
  const showSeverity = hasField(section, "severity", fieldFallback);
  const showStatus = hasField(section, "status", fieldFallback);
  const showTitle = hasField(section, "title", fieldFallback);

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {data.loadErrors.findingPhotos ? (
        <div style={{ color: "var(--muted)" }}>Some finding photos could not be loaded.</div>
      ) : null}
      {data.findings.map((finding) => {
        const visiblePhotos = finding.photos.slice(0, photoLimit);
        const hiddenPhotoCount = finding.photos.length - visiblePhotos.length;

        return (
        <div
          key={finding.id}
          style={{
            border: `1px solid ${finding.severity === "CRITICAL" ? "#f0b4ae" : "var(--border)"}`,
            borderRadius: 8,
            display: "grid",
            gap: "0.75rem",
            padding: "1rem"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
            <div>
              <strong>{showTitle ? finding.title : "Finding evidence"}</strong>
              {showCreatedAt ? (
                <div style={{ color: "var(--muted)", marginTop: 4 }}>
                  {formatDate(finding.createdAt)} / {finding.photos.length} photo{finding.photos.length === 1 ? "" : "s"}
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {showSeverity ? <StatusBadge>{finding.severity}</StatusBadge> : null}
              {showStatus ? <StatusBadge>{finding.status}</StatusBadge> : null}
            </div>
          </div>
          {showDescription && finding.description ? <div>{finding.description}</div> : null}
          {showRecommendation && finding.recommendation ? <div style={{ color: "var(--muted)" }}>Recommendation: {finding.recommendation}</div> : null}
          {finding.photos.length > 0 ? (
            <>
            <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: `repeat(${photoColumns}, minmax(0, 1fr))` }}>
              {visiblePhotos.map((photo, index) => (
                <figure key={photo.id} style={{ border: "1px solid var(--border)", borderRadius: 6, margin: 0, overflow: "hidden" }}>
                  {photo.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={photo.caption ?? `${finding.title} photo ${index + 1}`}
                      src={photo.signedUrl}
                      style={{ aspectRatio: "4 / 3", display: "block", objectFit: "cover", width: "100%" }}
                    />
                  ) : (
                    <div
                      style={{
                        alignItems: "center",
                        aspectRatio: "4 / 3",
                        background: "var(--surface)",
                        color: "var(--muted)",
                        display: "flex",
                        justifyContent: "center",
                        textAlign: "center"
                      }}
                    >
                      Photo unavailable
                    </div>
                  )}
                  {section.options?.showCaptions !== false ? (
                    <figcaption style={{ color: "var(--muted)", fontSize: "0.85rem", padding: "0.5rem" }}>
                      {photo.caption ?? `Photo ${index + 1}`}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
            {hiddenPhotoCount > 0 ? (
              <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                {hiddenPhotoCount} additional photo{hiddenPhotoCount === 1 ? "" : "s"} hidden by this template layout.
              </div>
            ) : null}
            </>
          ) : null}
        </div>
      );
      })}
    </div>
  );
}

function ChecklistEvidence({ data, section }: { data: IssuedReportData; section: ReportLayoutSection }) {
  if (data.loadErrors.inspections || data.loadErrors.templateItems || data.loadErrors.inspectionResults) {
    return <EmptyState title="Checklist unavailable" message="Structured checklist results could not be loaded." />;
  }

  const fields = sectionFields(section, ["assetCode", "checklistName", "status", "items"]);
  const groups = fields.includes("items")
    ? data.checklistGroups
    : data.checklistGroups.map((group) => ({
        ...group,
        items: []
      }));

  return (
    <ChecklistResults
      emptyTitle="No checklist results"
      emptyMessage="This report has no structured checklist results attached."
      groups={groups}
    />
  );
}

function SignatureBox({ section }: { section: ReportLayoutSection }) {
  const columns = sectionColumns(section, section.options?.layout === "single_column" ? 1 : 2);

  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {["Prepared by", "Client acknowledgement"].map((label) => (
        <div key={label} style={{ border: "1px solid var(--border)", borderRadius: 6, minHeight: 120, padding: "1rem" }}>
          <strong>{label}</strong>
          <div style={{ borderTop: "1px solid var(--border)", color: "var(--muted)", marginTop: 56, paddingTop: 8 }}>Name, signature, date</div>
        </div>
      ))}
      {section.content.description ? <div style={{ color: "var(--muted)", gridColumn: "1 / -1" }}>{section.content.description}</div> : null}
    </div>
  );
}

function renderSection(data: IssuedReportData, section: ReportLayoutSection) {
  switch (section.blockType) {
    case "summary_grid":
      return <SummaryGrid data={data} section={section} />;
    case "asset_table":
      return <AssetTable data={data} section={section} />;
    case "field_evidence":
      return <FieldEvidence data={data} section={section} />;
    case "checklist_evidence":
      return <ChecklistEvidence data={data} section={section} />;
    case "signature_box":
      return <SignatureBox section={section} />;
    case "static_text":
      return section.content.description ? <p style={{ margin: 0 }}>{section.content.description}</p> : null;
    case "header":
      return null;
  }
}

export function ReportLayoutRenderer({ data, layout }: ReportLayoutRendererProps) {
  const sections = layout.sections.filter((section) => section.blockType !== "header");

  return (
    <>
      {sections.map((section, index) => (
        <Card className="print-section" key={section.sectionId}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>{sectionTitle(index + 1, section)}</h2>
          {renderSection(data, section)}
        </Card>
      ))}
    </>
  );
}
