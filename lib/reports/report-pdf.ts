import { formatDate } from "@/lib/format/date";
import type { IssuedReportData } from "@/lib/reports/issued-report-data";
import type { ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";

const page = {
  width: 595.28,
  height: 841.89,
  margin: 48
};

type PdfLine = {
  size?: number;
  text: string;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7e]/g, "-")
    .trim();
}

function escapePdfText(value: string) {
  return normalizeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
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

function wrapText(text: string, maxChars: number) {
  const words = normalizeText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function summaryLines(data: IssuedReportData, section: ReportLayoutSection): PdfLine[] {
  const fields = [...(section.binding.fields ?? []), "findingCount", "checklistResultCount"];

  return fields.map((field) => ({
    text: `  ${renderSummaryLabel(field)}: ${renderSummaryValue(data, field)}`
  }));
}

function assetLines(data: IssuedReportData): PdfLine[] {
  if (data.assets.length === 0) {
    return [{ text: "This report has no assigned assets attached." }];
  }

  return data.assets.flatMap((asset, index) => [
    { size: 11, text: `  Asset ${index + 1}: ${asset.assetCode}` },
    { text: `    Type: ${asset.equipmentType}` },
    { text: `    System: ${asset.systemName}` },
    { text: `    Location: ${asset.location}` },
    { text: `    Inspection status: ${asset.inspectionStatus}` }
  ]);
}

function findingLines(data: IssuedReportData): PdfLine[] {
  if (data.loadErrors.findings) {
    return [{ text: "Captured findings could not be loaded." }];
  }

  if (data.findings.length === 0) {
    return [{ text: "This report was generated without field findings." }];
  }

  return data.findings.flatMap((finding, index) => [
    { size: 11, text: `  Finding ${index + 1}: ${finding.title}` },
    { text: `    Severity: ${finding.severity}` },
    { text: `    Status: ${finding.status}` },
    { text: `    Captured: ${formatDate(finding.createdAt)}` },
    ...(finding.description ? [{ text: `    Description: ${finding.description}` }] : []),
    ...(finding.recommendation ? [{ text: `    Recommendation: ${finding.recommendation}` }] : []),
    ...(finding.photos.length > 0
      ? [
          { text: `    Photos: ${finding.photos.length}` },
          ...finding.photos.map((photo, photoIndex) => ({
            text: `      Photo ${photoIndex + 1}: ${photo.caption ?? photo.storagePath}`
          }))
        ]
      : []),
    ...(data.loadErrors.findingPhotos ? [{ text: "    Some finding photos could not be loaded." }] : [])
  ]);
}

function checklistLines(data: IssuedReportData): PdfLine[] {
  if (data.loadErrors.inspections || data.loadErrors.templateItems || data.loadErrors.inspectionResults) {
    return [{ text: "Structured checklist results could not be loaded." }];
  }

  if (data.checklistGroups.length === 0) {
    return [{ text: "This report has no structured checklist results attached." }];
  }

  return data.checklistGroups.flatMap((group, index) => [
    { size: 11, text: `  Checklist ${index + 1}: ${group.assetCode}` },
    { text: `    Template: ${group.checklistName}` },
    { text: `    Status: ${group.status}` },
    ...group.items.map((item) => ({
      text: `    - ${item.prompt}: ${item.resultStatus ?? "Not answered"}`
    }))
  ]);
}

function signatureLines(section: ReportLayoutSection): PdfLine[] {
  return [
    { text: "Prepared by: ________________________________ Date: ____________" },
    { text: "Client acknowledgement: _____________________ Date: ____________" },
    ...(section.content.description ? [{ text: section.content.description }] : [])
  ];
}

function sectionLines(data: IssuedReportData, section: ReportLayoutSection): PdfLine[] {
  switch (section.blockType) {
    case "summary_grid":
      return summaryLines(data, section);
    case "asset_table":
      return assetLines(data);
    case "field_evidence":
      return findingLines(data);
    case "checklist_evidence":
      return checklistLines(data);
    case "signature_box":
      return signatureLines(section);
    case "static_text":
      return section.content.description ? [{ text: section.content.description }] : [];
    case "header":
      return [];
  }
}

export function buildReportPdfTextLines(data: IssuedReportData, layout: ReportLayoutDefinition) {
  return buildDocumentLines(data, layout).map((line) => normalizeText(line.text));
}

function buildDocumentLines(data: IssuedReportData, layout: ReportLayoutDefinition): PdfLine[] {
  const lines: PdfLine[] = [
    { size: 10, text: "FireMaint Formal Maintenance Report" },
    { size: 18, text: data.report.reportNumber },
    { size: 12, text: data.report.title ?? "Maintenance report" },
    { size: 10, text: `Status: ${data.report.status}` },
    { size: 10, text: `Client: ${data.client.name} | Site: ${data.site.name}` },
    { text: "" }
  ];

  layout.sections
    .filter((section) => section.blockType !== "header")
    .forEach((section, index) => {
      lines.push({
        size: 13,
        text: `${index + 1}. ${section.content.title ?? section.sectionId}`
      });
      lines.push(...sectionLines(data, section));
      lines.push({ text: "" });
    });

  return lines;
}

function paginate(lines: PdfLine[]) {
  const pages: string[][] = [[]];
  let y = page.height - page.margin;
  const lineHeight = 14;

  lines.forEach((line) => {
    const size = line.size ?? 10;
    const wrapped = wrapText(line.text, size >= 13 ? 72 : 92);

    wrapped.forEach((text, index) => {
      if (y < page.margin) {
        pages.push([]);
        y = page.height - page.margin;
      }

      const currentPage = pages.at(-1);

      if (!currentPage) {
        throw new Error("PDF pagination failed");
      }

      currentPage.push(`BT /F1 ${size} Tf ${page.margin} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`);
      y -= index === wrapped.length - 1 && line.text === "" ? 8 : lineHeight;
    });
  });

  return pages;
}

function footerCommands(data: IssuedReportData, pageNumber: number, pageCount: number) {
  const left = `${data.report.reportNumber} | ${data.client.name} | ${data.site.name}`;
  const right = `Page ${pageNumber} of ${pageCount}`;

  return [
    `0.80 w 48 42 m ${page.width - 48} 42 l S`,
    `BT /F1 8 Tf 48 28 Td (${escapePdfText(left)}) Tj ET`,
    `BT /F1 8 Tf ${page.width - 104} 28 Td (${escapePdfText(right)}) Tj ET`
  ];
}

function pdfObject(id: number, content: string) {
  return `${id} 0 obj\n${content}\nendobj\n`;
}

export function renderReportPdf(data: IssuedReportData, layout: ReportLayoutDefinition) {
  const pageStreams = paginate(buildDocumentLines(data, layout));
  const pageCount = pageStreams.length;
  const pageObjectStart = 4;
  const contentObjectStart = pageObjectStart + pageCount;
  const objects: string[] = [
    pdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    pdfObject(2, `<< /Type /Pages /Kids [${pageStreams.map((_, index) => `${pageObjectStart + index} 0 R`).join(" ")}] /Count ${pageCount} >>`),
    pdfObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
  ];

  pageStreams.forEach((_, index) => {
    objects.push(
      pdfObject(
        pageObjectStart + index,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${
          contentObjectStart + index
        } 0 R >>`
      )
    );
  });

  pageStreams.forEach((stream, index) => {
    const content = [...stream, ...footerCommands(data, index + 1, pageCount)].join("\n");
    objects.push(pdfObject(contentObjectStart + index, `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`));
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += object;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
