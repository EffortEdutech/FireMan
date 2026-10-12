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
  const fields = section.binding.fields ?? [];
  const columns = sectionColumns(section, 3);

  return (
    <div className="print-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: "1rem" }}>
      {fields.map((field) => (
        <SummaryField key={field} label={renderSummaryLabel(field)} value={renderSummaryValue(data, field)} />
      ))}
      <SummaryField label="Findings" value={`${data.summary.findingCount}`} />
      <SummaryField
        label="Checklist"
        value={`${data.summary.checklistResultCount} result${data.summary.checklistResultCount === 1 ? "" : "s"}`}
      />
      <SummaryField label="Type" value="Maintenance" />
    </div>
  );
}

function AssetTable({ data }: { data: IssuedReportData }) {
  if (data.assets.length === 0) {
    return <EmptyState title="No assets included" message="This report has no assigned assets attached." />;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>System</th>
            <th>Location</th>
            <th>Inspection</th>
          </tr>
        </thead>
        <tbody>
          {data.assets.map((asset) => (
            <tr key={asset.id}>
              <td>
                <strong>{asset.assetCode}</strong>
              </td>
              <td>{asset.equipmentType}</td>
              <td>{asset.systemName}</td>
              <td>{asset.location}</td>
              <td>{asset.inspectionStatus}</td>
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

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {data.loadErrors.findingPhotos ? (
        <div style={{ color: "var(--muted)" }}>Some finding photos could not be loaded.</div>
      ) : null}
      {data.findings.map((finding) => (
        <div key={finding.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
            <strong>{finding.title}</strong>
            <StatusBadge>{finding.severity}</StatusBadge>
          </div>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>
            {finding.status} / {formatDate(finding.createdAt)}
          </div>
          {finding.description ? <div style={{ marginTop: 8 }}>{finding.description}</div> : null}
          {finding.recommendation ? <div style={{ color: "var(--muted)", marginTop: 8 }}>Recommendation: {finding.recommendation}</div> : null}
          {finding.photos.length > 0 ? (
            <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: `repeat(${photoColumns}, minmax(0, 1fr))`, marginTop: 12 }}>
              {finding.photos.slice(0, sectionPhotoLimit(section)).map((photo, index) => (
                <figure key={photo.id} style={{ margin: 0 }}>
                  {photo.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={photo.caption ?? `${finding.title} photo ${index + 1}`}
                      src={photo.signedUrl}
                      style={{ aspectRatio: "4 / 3", borderRadius: 6, objectFit: "cover", width: "100%" }}
                    />
                  ) : (
                    <div
                      style={{
                        alignItems: "center",
                        aspectRatio: "4 / 3",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
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
                    <figcaption style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 4 }}>
                      {photo.caption ?? `Photo ${index + 1}`}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ChecklistEvidence({ data }: { data: IssuedReportData }) {
  if (data.loadErrors.inspections || data.loadErrors.templateItems || data.loadErrors.inspectionResults) {
    return <EmptyState title="Checklist unavailable" message="Structured checklist results could not be loaded." />;
  }

  return (
    <ChecklistResults
      emptyTitle="No checklist results"
      emptyMessage="This report has no structured checklist results attached."
      groups={data.checklistGroups}
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
      return <AssetTable data={data} />;
    case "field_evidence":
      return <FieldEvidence data={data} section={section} />;
    case "checklist_evidence":
      return <ChecklistEvidence data={data} />;
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
