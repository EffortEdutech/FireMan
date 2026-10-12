import { formatDate } from "@/lib/format/date";
import type { IssuedReportData } from "@/lib/reports/issued-report-data";
import type { ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";
import { reportTemplateStats } from "@/lib/reports/report-template-stats";

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function renderSummaryGrid(data: IssuedReportData, section: ReportLayoutSection) {
  const summaryFields = sectionFields(section, ["clientName", "siteName", "jobNumber", "scheduledDate", "generatedAt", "issuedAt"]);
  const columns = sectionColumns(section, 3);

  return `
    <div class="summary-grid" style="grid-template-columns: repeat(${columns}, minmax(0, 1fr));">
      ${summaryFields
        .map(
          (field) => `
            <div>
              <div class="label">${escapeHtml(renderSummaryLabel(field))}</div>
              <strong>${escapeHtml(renderSummaryValue(data, field))}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
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

function renderAssetTable(data: IssuedReportData, section: ReportLayoutSection) {
  if (data.assets.length === 0) {
    return `<p class="muted">This report has no assigned assets attached.</p>`;
  }

  const fields = sectionFields(section, ["assetCode", "equipmentType", "systemName", "location", "inspectionStatus"]);

  return `
    <table>
      <thead>
        <tr>
          ${fields.map((field) => `<th>${escapeHtml(assetFieldLabels[field] ?? field)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${data.assets
          .map(
            (asset) => `
              <tr>
                ${fields
                  .map((field) =>
                    field === "assetCode"
                      ? `<td><strong>${escapeHtml(asset.assetCode)}</strong></td>`
                      : `<td>${escapeHtml(assetFieldValue(asset, field))}</td>`
                  )
                  .join("")}
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function badgeClass(value: string) {
  if (value === "CRITICAL" || value === "FAIL" || value === "ATTENTION" || value === "Not answered") {
    return "badge badge-alert";
  }

  if (value === "PASS" || value === "COMPLETED") {
    return "badge badge-pass";
  }

  return "badge";
}

function checklistCounts(items: { resultStatus: string | null }[]) {
  return items.reduce(
    (counts, item) => {
      const status = item.resultStatus ?? "Not answered";

      if (status === "PASS") counts.pass += 1;
      else if (status === "FAIL") counts.fail += 1;
      else if (status === "ATTENTION") counts.attention += 1;
      else if (status === "NA") counts.na += 1;
      else counts.open += 1;

      return counts;
    },
    { attention: 0, fail: 0, na: 0, open: 0, pass: 0 }
  );
}

function renderFieldEvidence(data: IssuedReportData, section: ReportLayoutSection) {
  if (data.loadErrors.findings) {
    return `<p class="muted">Captured findings could not be loaded.</p>`;
  }

  if (data.findings.length === 0) {
    return `<p class="muted">This report was generated without field findings.</p>`;
  }

  const photoWarning = data.loadErrors.findingPhotos ? `<p class="muted">Some finding photos could not be loaded.</p>` : "";
  const photoColumns = sectionColumns(section, 2);
  const photoLimit = sectionPhotoLimit(section);
  const showCaptions = section.options?.showCaptions !== false;
  const fieldFallback = ["title", "severity", "status", "description", "recommendation", "createdAt"];
  const showCreatedAt = hasField(section, "createdAt", fieldFallback);
  const showDescription = hasField(section, "description", fieldFallback);
  const showRecommendation = hasField(section, "recommendation", fieldFallback);
  const showSeverity = hasField(section, "severity", fieldFallback);
  const showStatus = hasField(section, "status", fieldFallback);
  const showTitle = hasField(section, "title", fieldFallback);

  return (
    photoWarning +
    data.findings
    .map(
      (finding) => {
        const visiblePhotos = finding.photos.slice(0, photoLimit);
        const hiddenPhotoCount = finding.photos.length - visiblePhotos.length;

        return `
        <div class="evidence-item ${finding.severity === "CRITICAL" ? "evidence-alert" : ""}">
          <div class="row">
            <div>
              <strong>${escapeHtml(showTitle ? finding.title : "Finding evidence")}</strong>
              ${showCreatedAt ? `<div class="muted">${escapeHtml(formatDate(finding.createdAt))} / ${finding.photos.length} photo${finding.photos.length === 1 ? "" : "s"}</div>` : ""}
            </div>
            <div class="badge-row">
              ${showSeverity ? `<span class="${badgeClass(finding.severity)}">${escapeHtml(finding.severity)}</span>` : ""}
              ${showStatus ? `<span class="${badgeClass(finding.status)}">${escapeHtml(finding.status)}</span>` : ""}
            </div>
          </div>
          ${showDescription && finding.description ? `<p>${escapeHtml(finding.description)}</p>` : ""}
          ${showRecommendation && finding.recommendation ? `<p class="muted">Recommendation: ${escapeHtml(finding.recommendation)}</p>` : ""}
          ${
            finding.photos.length > 0
              ? `<div class="photo-grid" style="grid-template-columns: repeat(${photoColumns}, minmax(0, 1fr));">
                  ${visiblePhotos
                    .map(
                      (photo, index) => `
                        <figure class="photo-card">
                          ${
                            photo.signedUrl
                              ? `<img alt="${escapeHtml(photo.caption ?? `${finding.title} photo ${index + 1}`)}" src="${escapeHtml(photo.signedUrl)}" />`
                              : `<div class="photo-placeholder">Photo unavailable</div>`
                          }
                          ${showCaptions ? `<figcaption>${escapeHtml(photo.caption ?? `Photo ${index + 1}`)}</figcaption>` : ""}
                        </figure>
                      `
                    )
                    .join("")}
                </div>`
              : ""
          }
          ${hiddenPhotoCount > 0 ? `<p class="muted">${hiddenPhotoCount} additional photo${hiddenPhotoCount === 1 ? "" : "s"} hidden by this template layout.</p>` : ""}
        </div>
      `;
      }
    )
    .join("")
  );
}

function renderChecklistEvidence(data: IssuedReportData, section: ReportLayoutSection) {
  if (data.loadErrors.inspections || data.loadErrors.templateItems || data.loadErrors.inspectionResults) {
    return `<p class="muted">Structured checklist results could not be loaded.</p>`;
  }

  if (data.checklistGroups.length === 0) {
    return `<p class="muted">This report has no structured checklist results attached.</p>`;
  }

  const fields = sectionFields(section, ["assetCode", "checklistName", "status", "items"]);
  const showItems = fields.includes("items");

  return data.checklistGroups
    .map((group) => {
      const counts = checklistCounts(group.items);
      const needsAttention = counts.fail + counts.attention + counts.open;

      return `
        <div class="checklist-group ${needsAttention ? "checklist-alert" : ""}">
          <div class="row">
            <div>
              <strong>${escapeHtml(group.assetCode)}</strong>
              <div class="muted">${escapeHtml(group.checklistName)}</div>
            </div>
            <span class="${badgeClass(group.status)}">${escapeHtml(group.status)}</span>
          </div>
          <div class="badge-row">
            <span class="${badgeClass("PASS")}">${counts.pass} PASS</span>
            ${counts.fail ? `<span class="${badgeClass("FAIL")}">${counts.fail} FAIL</span>` : ""}
            ${counts.attention ? `<span class="${badgeClass("ATTENTION")}">${counts.attention} ATTENTION</span>` : ""}
            ${counts.open ? `<span class="${badgeClass("Not answered")}">${counts.open} OPEN</span>` : ""}
            ${counts.na ? `<span class="${badgeClass("NA")}">${counts.na} NA</span>` : ""}
          </div>
          ${group.items
            .map((item) =>
              showItems
                ? `
                <div class="checklist-item ${item.resultStatus === "FAIL" || item.resultStatus === "ATTENTION" || !item.resultStatus ? "checklist-item-alert" : ""}">
                  <span>${escapeHtml(item.prompt)}</span>
                  <span class="${badgeClass(item.resultStatus ?? "Not answered")}">${escapeHtml(item.resultStatus ?? "Not answered")}</span>
                </div>
              `
                : ""
            )
            .join("")}
        </div>
      `;
    })
    .join("");
}

function renderSignatureBox(section: ReportLayoutSection) {
  const columns = sectionColumns(section, section.options?.layout === "single_column" ? 1 : 2);

  return `
    <div class="signature-grid" style="grid-template-columns: repeat(${columns}, minmax(0, 1fr));">
      ${["Prepared by", "Client acknowledgement"]
        .map(
          (label) => `
            <div class="signature-box">
              <strong>${escapeHtml(label)}</strong>
              <div class="signature-line">Name, signature, date</div>
            </div>
          `
        )
        .join("")}
    </div>
    ${section.content.description ? `<p class="muted">${escapeHtml(section.content.description)}</p>` : ""}
  `;
}

function renderSectionBody(data: IssuedReportData, section: ReportLayoutSection) {
  switch (section.blockType) {
    case "summary_grid":
      return renderSummaryGrid(data, section);
    case "asset_table":
      return renderAssetTable(data, section);
    case "field_evidence":
      return renderFieldEvidence(data, section);
    case "checklist_evidence":
      return renderChecklistEvidence(data, section);
    case "signature_box":
      return renderSignatureBox(section);
    case "static_text":
      return section.content.description ? `<p>${escapeHtml(section.content.description)}</p>` : "";
    case "header":
      return "";
  }
}

function renderSections(data: IssuedReportData, layout: ReportLayoutDefinition) {
  return layout.sections
    .filter((section) => section.blockType !== "header")
    .map(
      (section, index) => `
        <section class="card">
          <h2>${index + 1}. ${escapeHtml(section.content.title ?? section.sectionId)}</h2>
          ${renderSectionBody(data, section)}
        </section>
      `
    )
    .join("");
}

export function renderReportHtml(data: IssuedReportData, layout: ReportLayoutDefinition) {
  const title = `${data.report.reportNumber} - ${data.report.title ?? "Maintenance Report"}`;
  const templateStats = reportTemplateStats(layout);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color: #172026;
        font-family: Arial, sans-serif;
      }

      body {
        background: #f6f8f9;
        margin: 0;
        padding: 24px;
      }

      main {
        background: #ffffff;
        margin: 0 auto;
        max-width: 960px;
        padding: 32px;
      }

      h1 {
        font-size: 28px;
        margin: 0;
      }

      h2 {
        font-size: 18px;
        margin: 0 0 16px;
      }

      table {
        border-collapse: collapse;
        width: 100%;
      }

      th,
      td {
        border-bottom: 1px solid #d9e1e7;
        padding: 10px;
        text-align: left;
        vertical-align: top;
      }

      th {
        color: #52616b;
        font-size: 13px;
      }

      .badge {
        background: #eef2f6;
        border: 1px solid #d9e1e7;
        border-radius: 999px;
        display: inline-flex;
        font-size: 13px;
        font-weight: 700;
        padding: 4px 10px;
        white-space: nowrap;
      }

      .badge-alert {
        background: #fff1f0;
        color: #8a1f17;
      }

      .badge-pass {
        background: #edf7ee;
        color: #22543d;
      }

      .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: flex-end;
      }

      .card {
        border: 1px solid #d9e1e7;
        border-radius: 8px;
        margin-top: 16px;
        padding: 20px;
      }

      .checklist-group {
        border: 1px solid #d9e1e7;
        border-radius: 8px;
        margin-top: 12px;
        padding: 16px;
      }

      .checklist-alert,
      .evidence-alert {
        border-color: #f0b4ae;
      }

      .checklist-item {
        align-items: center;
        border-top: 1px solid #d9e1e7;
        display: grid;
        gap: 12px;
        grid-template-columns: minmax(0, 1fr) auto;
        padding-top: 10px;
        margin-top: 10px;
      }

      .checklist-item-alert {
        background: #fffafa;
      }

      .evidence-item {
        border: 1px solid #d9e1e7;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
      }

      .label,
      .muted {
        color: #52616b;
      }

      .photo-card {
        border: 1px solid #d9e1e7;
        border-radius: 6px;
        margin: 0;
        overflow: hidden;
      }

      .photo-card figcaption {
        color: #52616b;
        font-size: 13px;
        padding: 8px;
      }

      .photo-card img,
      .photo-placeholder {
        aspect-ratio: 4 / 3;
        width: 100%;
      }

      .photo-card img {
        display: block;
        object-fit: cover;
      }

      .photo-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        margin-top: 12px;
      }

      .photo-placeholder {
        align-items: center;
        background: #f6f8f9;
        border: 1px solid #d9e1e7;
        color: #52616b;
        display: flex;
        justify-content: center;
      }

      .label {
        font-size: 13px;
        margin-bottom: 4px;
      }

      .row {
        align-items: flex-start;
        display: flex;
        gap: 16px;
        justify-content: space-between;
      }

      .signature-grid,
      .summary-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      .signature-box {
        border: 1px solid #d9e1e7;
        border-radius: 8px;
        min-height: 120px;
        padding: 16px;
      }

      .signature-line {
        border-top: 1px solid #d9e1e7;
        color: #52616b;
        margin-top: 56px;
        padding-top: 8px;
      }

      .template-context {
        border: 1px solid #d9e1e7;
        border-radius: 8px;
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        margin-top: 16px;
        padding: 16px;
      }

      @media print {
        body {
          background: #ffffff;
          padding: 0;
        }

        main {
          max-width: none;
          padding: 0;
        }

        .card {
          break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div class="row">
          <div>
            <h1>${escapeHtml(data.report.reportNumber)}</h1>
            <p class="muted">${escapeHtml(data.report.title ?? "Maintenance report")}</p>
            <p class="muted">Template: ${escapeHtml(data.report.templateName)}</p>
          </div>
          <span class="badge">${escapeHtml(data.report.status)}</span>
        </div>
        <div class="template-context">
          <div>
            <div class="label">Template</div>
            <strong>${escapeHtml(data.report.templateName)}</strong>
          </div>
          <div>
            <div class="label">Version Behavior</div>
            <strong>Frozen on report</strong>
          </div>
          <div>
            <div class="label">Sections</div>
            <strong>${templateStats.sectionCount}</strong>
          </div>
          <div>
            <div class="label">Selected Fields</div>
            <strong>${templateStats.fieldCount}</strong>
          </div>
        </div>
      </header>
      ${renderSections(data, layout)}
    </main>
  </body>
</html>`;
}
