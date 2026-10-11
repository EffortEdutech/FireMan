import { formatDate } from "@/lib/format/date";
import type { IssuedReportData } from "@/lib/reports/issued-report-data";
import type { ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
  const fields = section.binding.fields ?? [];
  const summaryFields = [...fields, "findingCount", "checklistResultCount"];

  return `
    <div class="summary-grid">
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

function renderAssetTable(data: IssuedReportData) {
  if (data.assets.length === 0) {
    return `<p class="muted">This report has no assigned assets attached.</p>`;
  }

  return `
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
        ${data.assets
          .map(
            (asset) => `
              <tr>
                <td><strong>${escapeHtml(asset.assetCode)}</strong></td>
                <td>${escapeHtml(asset.equipmentType)}</td>
                <td>${escapeHtml(asset.systemName)}</td>
                <td>${escapeHtml(asset.location)}</td>
                <td>${escapeHtml(asset.inspectionStatus)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderFieldEvidence(data: IssuedReportData) {
  if (data.loadErrors.findings) {
    return `<p class="muted">Captured findings could not be loaded.</p>`;
  }

  if (data.findings.length === 0) {
    return `<p class="muted">This report was generated without field findings.</p>`;
  }

  const photoWarning = data.loadErrors.findingPhotos ? `<p class="muted">Some finding photos could not be loaded.</p>` : "";

  return (
    photoWarning +
    data.findings
    .map(
      (finding) => `
        <div class="evidence-item">
          <div class="row">
            <strong>${escapeHtml(finding.title)}</strong>
            <span class="badge">${escapeHtml(finding.severity)}</span>
          </div>
          <div class="muted">${escapeHtml(finding.status)} / ${escapeHtml(formatDate(finding.createdAt))}</div>
          ${finding.description ? `<p>${escapeHtml(finding.description)}</p>` : ""}
          ${finding.recommendation ? `<p class="muted">Recommendation: ${escapeHtml(finding.recommendation)}</p>` : ""}
          ${
            finding.photos.length > 0
              ? `<div class="photo-grid">
                  ${finding.photos
                    .map(
                      (photo, index) => `
                        <figure class="photo-card">
                          ${
                            photo.signedUrl
                              ? `<img alt="${escapeHtml(photo.caption ?? `${finding.title} photo ${index + 1}`)}" src="${escapeHtml(photo.signedUrl)}" />`
                              : `<div class="photo-placeholder">Photo unavailable</div>`
                          }
                          <figcaption>${escapeHtml(photo.caption ?? `Photo ${index + 1}`)}</figcaption>
                        </figure>
                      `
                    )
                    .join("")}
                </div>`
              : ""
          }
        </div>
      `
    )
    .join("")
  );
}

function renderChecklistEvidence(data: IssuedReportData) {
  if (data.loadErrors.inspections || data.loadErrors.templateItems || data.loadErrors.inspectionResults) {
    return `<p class="muted">Structured checklist results could not be loaded.</p>`;
  }

  if (data.checklistGroups.length === 0) {
    return `<p class="muted">This report has no structured checklist results attached.</p>`;
  }

  return data.checklistGroups
    .map(
      (group) => `
        <div class="checklist-group">
          <div class="row">
            <div>
              <strong>${escapeHtml(group.assetCode)}</strong>
              <div class="muted">${escapeHtml(group.checklistName)}</div>
            </div>
            <span class="badge">${escapeHtml(group.status)}</span>
          </div>
          ${group.items
            .map(
              (item) => `
                <div class="checklist-item">
                  <span>${escapeHtml(item.prompt)}</span>
                  <span class="badge">${escapeHtml(item.resultStatus ?? "Not answered")}</span>
                </div>
              `
            )
            .join("")}
        </div>
      `
    )
    .join("");
}

function renderSignatureBox(section: ReportLayoutSection) {
  return `
    <div class="signature-grid">
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
      return renderAssetTable(data);
    case "field_evidence":
      return renderFieldEvidence(data);
    case "checklist_evidence":
      return renderChecklistEvidence(data);
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

      .checklist-item {
        align-items: center;
        border-top: 1px solid #d9e1e7;
        display: grid;
        gap: 12px;
        grid-template-columns: minmax(0, 1fr) auto;
        padding-top: 10px;
        margin-top: 10px;
      }

      .evidence-item {
        border-bottom: 1px solid #d9e1e7;
        padding: 0 0 12px;
        margin-bottom: 12px;
      }

      .label,
      .muted {
        color: #52616b;
      }

      .photo-card {
        margin: 0;
      }

      .photo-card figcaption {
        color: #52616b;
        font-size: 13px;
        margin-top: 6px;
      }

      .photo-card img,
      .photo-placeholder {
        aspect-ratio: 4 / 3;
        border-radius: 6px;
        width: 100%;
      }

      .photo-card img {
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
          </div>
          <span class="badge">${escapeHtml(data.report.status)}</span>
        </div>
      </header>
      ${renderSections(data, layout)}
    </main>
  </body>
</html>`;
}
