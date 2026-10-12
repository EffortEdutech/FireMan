import { formatDate } from "@/lib/format/date";
import type { IssuedReportData } from "@/lib/reports/issued-report-data";
import type { ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";
import { reportTemplateStats } from "@/lib/reports/report-template-stats";
import sharp from "sharp";

const page = {
  width: 595.28,
  height: 841.89,
  margin: 48
};

type PdfLine = {
  imageId?: string;
  size?: number;
  text: string;
};

type PdfImageAsset = {
  data: Buffer;
  height: number;
  id: string;
  width: number;
};

type PaginatedPage = {
  commands: string[];
  imageIds: Set<string>;
};

type PdfObject = {
  id: number;
  content: Buffer;
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
  const fields = sectionFields(section, ["clientName", "siteName", "jobNumber", "scheduledDate", "generatedAt", "issuedAt"]);

  return fields.map((field) => ({
    text: `  ${renderSummaryLabel(field)}: ${renderSummaryValue(data, field)}`
  }));
}

function sectionPhotoLimit(section: ReportLayoutSection) {
  const columns = Number(section.options?.columns ?? 2);
  const rows = Number(section.options?.photoRows ?? 2);
  const clampedColumns = Number.isFinite(columns) ? Math.min(4, Math.max(1, Math.round(columns))) : 2;
  const clampedRows = Number.isFinite(rows) ? Math.min(8, Math.max(1, Math.round(rows))) : 2;

  return clampedColumns * clampedRows;
}

function sectionFields(section: ReportLayoutSection, fallback: string[]) {
  return section.binding.fields && section.binding.fields.length > 0 ? section.binding.fields : fallback;
}

function hasField(section: ReportLayoutSection, field: string, fallback: string[]) {
  return sectionFields(section, fallback).includes(field);
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

function assetFieldLabel(field: string) {
  const labels: Record<string, string> = {
    assetCode: "Asset",
    equipmentType: "Type",
    inspectionStatus: "Inspection status",
    location: "Location",
    systemName: "System"
  };

  return labels[field] ?? field;
}

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

function assetLines(data: IssuedReportData, section: ReportLayoutSection): PdfLine[] {
  if (data.assets.length === 0) {
    return [{ text: "This report has no assigned assets attached." }];
  }

  const fields = sectionFields(section, ["assetCode", "equipmentType", "systemName", "location", "inspectionStatus"]);

  return data.assets.flatMap((asset, index) => [
    { size: 11, text: `  Asset ${index + 1}: ${asset.assetCode}` },
    ...fields
      .filter((field) => field !== "assetCode")
      .map((field) => ({
        text: `    ${assetFieldLabel(field)}: ${assetFieldValue(asset, field)}`
      }))
  ]);
}

function findingLines(data: IssuedReportData, section: ReportLayoutSection): PdfLine[] {
  if (data.loadErrors.findings) {
    return [{ text: "Captured findings could not be loaded." }];
  }

  if (data.findings.length === 0) {
    return [{ text: "This report was generated without field findings." }];
  }

  const photoLimit = sectionPhotoLimit(section);
  const showCaptions = section.options?.showCaptions !== false;
  const fieldFallback = ["title", "severity", "status", "description", "recommendation", "createdAt"];
  const showCreatedAt = hasField(section, "createdAt", fieldFallback);
  const showDescription = hasField(section, "description", fieldFallback);
  const showRecommendation = hasField(section, "recommendation", fieldFallback);
  const showSeverity = hasField(section, "severity", fieldFallback);
  const showStatus = hasField(section, "status", fieldFallback);
  const showTitle = hasField(section, "title", fieldFallback);

  return data.findings.flatMap((finding, index) => {
    const visiblePhotos = finding.photos.slice(0, photoLimit);
    const hiddenPhotoCount = finding.photos.length - visiblePhotos.length;

    return [
      { size: 11, text: `  Finding ${index + 1}: ${showTitle ? finding.title : "Finding evidence"}` },
      ...(showSeverity ? [{ text: `    Severity: ${finding.severity}` }] : []),
      ...(showStatus ? [{ text: `    Status: ${finding.status}` }] : []),
      ...(showCreatedAt ? [{ text: `    Captured: ${formatDate(finding.createdAt)}` }] : []),
      ...(showDescription && finding.description ? [{ text: `    Description: ${finding.description}` }] : []),
      ...(showRecommendation && finding.recommendation ? [{ text: `    Recommendation: ${finding.recommendation}` }] : []),
      ...(visiblePhotos.length > 0
        ? [
            { text: `    Photos: ${visiblePhotos.length}${finding.photos.length > visiblePhotos.length ? ` of ${finding.photos.length}` : ""}` },
            ...visiblePhotos.flatMap((photo, photoIndex) => [
              ...(showCaptions
                ? [
                    {
                      text: `      Photo ${photoIndex + 1}: ${photo.caption ?? photo.storagePath}`
                    }
                  ]
                : []),
              {
                imageId: photo.id,
                text: ""
              }
            ])
          ]
        : []),
      ...(hiddenPhotoCount > 0 ? [{ text: `    Hidden by template layout: ${hiddenPhotoCount} additional photo${hiddenPhotoCount === 1 ? "" : "s"}` }] : []),
      ...(data.loadErrors.findingPhotos ? [{ text: "    Some finding photos could not be loaded." }] : [])
    ];
  });
}

function checklistLines(data: IssuedReportData, section: ReportLayoutSection): PdfLine[] {
  if (data.loadErrors.inspections || data.loadErrors.templateItems || data.loadErrors.inspectionResults) {
    return [{ text: "Structured checklist results could not be loaded." }];
  }

  if (data.checklistGroups.length === 0) {
    return [{ text: "This report has no structured checklist results attached." }];
  }

  const fields = sectionFields(section, ["assetCode", "checklistName", "status", "items"]);
  const showItems = fields.includes("items");

  return data.checklistGroups.flatMap((group, index) => {
    const counts = checklistCounts(group.items);

    return [
      { size: 11, text: `  Checklist ${index + 1}: ${group.assetCode}` },
      { text: `    Template: ${group.checklistName}` },
      { text: `    Status: ${group.status}` },
      {
        text: `    Result summary: ${counts.pass} PASS | ${counts.fail} FAIL | ${counts.attention} ATTENTION | ${counts.open} OPEN | ${counts.na} NA`
      },
      ...(showItems
        ? group.items.map((item) => ({
            text: `    - ${item.prompt}: ${item.resultStatus ?? "Not answered"}`
          }))
        : [])
    ];
  });
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
      return assetLines(data, section);
    case "field_evidence":
      return findingLines(data, section);
    case "checklist_evidence":
      return checklistLines(data, section);
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
  const templateStats = reportTemplateStats(layout);
  const lines: PdfLine[] = [
    { size: 10, text: "FireMaint Formal Maintenance Report" },
    { size: 18, text: data.report.reportNumber },
    { size: 12, text: data.report.title ?? "Maintenance report" },
    { size: 10, text: `Status: ${data.report.status}` },
    { size: 10, text: `Template: ${data.report.templateName}` },
    { size: 10, text: "Template version behavior: Frozen on report" },
    { size: 10, text: `Template sections: ${templateStats.sectionCount} | Selected fields: ${templateStats.fieldCount}` },
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

function paginate(lines: PdfLine[], imageAssets = new Map<string, PdfImageAsset>()) {
  const pages: PaginatedPage[] = [{ commands: [], imageIds: new Set() }];
  let y = page.height - page.margin;
  const lineHeight = 14;

  lines.forEach((line) => {
    if (line.imageId) {
      const image = imageAssets.get(line.imageId);

      if (!image) {
        return;
      }

      const maxWidth = 180;
      const maxHeight = 135;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;

      if (y - height < page.margin) {
        pages.push({ commands: [], imageIds: new Set() });
        y = page.height - page.margin;
      }

      const currentPage = pages.at(-1);

      if (!currentPage) {
        throw new Error("PDF pagination failed");
      }

      y -= height;
      currentPage.imageIds.add(line.imageId);
      currentPage.commands.push(`q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${page.margin + 24} ${y.toFixed(2)} cm /${imageResourceName(line.imageId)} Do Q`);
      y -= 8;
      return;
    }

    const size = line.size ?? 10;
    const wrapped = wrapText(line.text, size >= 13 ? 72 : 92);

    wrapped.forEach((text, index) => {
      if (y < page.margin) {
        pages.push({ commands: [], imageIds: new Set() });
        y = page.height - page.margin;
      }

      const currentPage = pages.at(-1);

      if (!currentPage) {
        throw new Error("PDF pagination failed");
      }

      currentPage.commands.push(`BT /F1 ${size} Tf ${page.margin} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`);
      y -= index === wrapped.length - 1 && line.text === "" ? 8 : lineHeight;
    });
  });

  return pages;
}

function imageResourceName(imageId: string) {
  return `Im${imageId.replace(/[^a-z0-9]+/gi, "").slice(0, 24)}`;
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

function pdfObject(id: number, content: string | Buffer): PdfObject {
  return {
    id,
    content: Buffer.concat([Buffer.from(`${id} 0 obj\n`, "latin1"), Buffer.isBuffer(content) ? content : Buffer.from(content, "latin1"), Buffer.from("\nendobj\n", "latin1")])
  };
}

function renderPdfDocument(data: IssuedReportData, layout: ReportLayoutDefinition, imageAssets = new Map<string, PdfImageAsset>()) {
  const pageStreams = paginate(buildDocumentLines(data, layout), imageAssets);
  const pageCount = pageStreams.length;
  const pageObjectStart = 4;
  const contentObjectStart = pageObjectStart + pageCount;
  const imageObjectStart = contentObjectStart + pageCount;
  const imageObjectIds = new Map<string, number>();

  Array.from(imageAssets.keys()).forEach((imageId, index) => {
    imageObjectIds.set(imageId, imageObjectStart + index);
  });

  const objects: PdfObject[] = [
    pdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    pdfObject(2, `<< /Type /Pages /Kids [${pageStreams.map((_, index) => `${pageObjectStart + index} 0 R`).join(" ")}] /Count ${pageCount} >>`),
    pdfObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
  ];

  pageStreams.forEach((stream, index) => {
    const xObjects = Array.from(stream.imageIds)
      .map((imageId) => {
        const objectId = imageObjectIds.get(imageId);
        return objectId ? `/${imageResourceName(imageId)} ${objectId} 0 R` : "";
      })
      .filter(Boolean)
      .join(" ");
    const resources = xObjects
      ? `<< /Font << /F1 3 0 R >> /XObject << ${xObjects} >> >>`
      : "<< /Font << /F1 3 0 R >> >>";

    objects.push(
      pdfObject(
        pageObjectStart + index,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources ${resources} /Contents ${contentObjectStart + index} 0 R >>`
      )
    );
  });

  pageStreams.forEach((stream, index) => {
    const content = [...stream.commands, ...footerCommands(data, index + 1, pageCount)].join("\n");
    objects.push(pdfObject(contentObjectStart + index, `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`));
  });

  Array.from(imageAssets.values()).forEach((image) => {
    const header = Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`,
      "latin1"
    );
    const footer = Buffer.from("\nendstream", "latin1");
    objects.push(pdfObject(imageObjectIds.get(image.id) ?? imageObjectStart, Buffer.concat([header, image.data, footer])));
  });

  let pdf = Buffer.from("%PDF-1.4\n", "latin1");
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf = Buffer.concat([pdf, object.content]);
  });

  const xrefOffset = pdf.length;
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    trailer += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.concat([pdf, Buffer.from(trailer, "latin1")]);
}

export function renderReportPdf(data: IssuedReportData, layout: ReportLayoutDefinition) {
  return renderPdfDocument(data, layout);
}

function readJpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (marker && [0xc0, 0xc1, 0xc2].includes(marker) && offset + 8 < buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }

    offset += 2 + length;
  }

  return null;
}

async function fetchPdfPhotoAssets(data: IssuedReportData) {
  const assets = new Map<string, PdfImageAsset>();
  const photos = data.findings.flatMap((finding) => finding.photos).filter((photo) => photo.signedUrl);

  await Promise.all(
    photos.map(async (photo) => {
      if (!photo.signedUrl) {
        return;
      }

      try {
        const response = await fetch(photo.signedUrl);

        if (!response.ok) {
          return;
        }

        const originalBuffer = Buffer.from(await response.arrayBuffer());
        const buffer = readJpegDimensions(originalBuffer) ? originalBuffer : await sharp(originalBuffer).jpeg({ quality: 82 }).toBuffer();
        const dimensions = readJpegDimensions(buffer);

        if (!dimensions) {
          return;
        }

        assets.set(photo.id, {
          data: buffer,
          height: dimensions.height,
          id: photo.id,
          width: dimensions.width
        });
      } catch {
        // Keep report generation resilient; the text photo reference remains in the PDF.
      }
    })
  );

  return assets;
}

export async function renderReportPdfWithImages(data: IssuedReportData, layout: ReportLayoutDefinition) {
  const imageAssets = await fetchPdfPhotoAssets(data);
  return renderPdfDocument(data, layout, imageAssets);
}
