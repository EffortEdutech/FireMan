import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { canAccessClientPortal, canAccessManagement } from "@/lib/permissions/roles";
import { fetchIssuedReportData } from "@/lib/reports/issued-report-data";
import { renderReportHtml } from "@/lib/reports/report-html";
import { renderReportPdfWithImages } from "@/lib/reports/report-pdf";
import { parseReportOutputFormat, reportOutputFilename } from "@/lib/reports/report-output";
import { buildReportManifest } from "@/lib/reports/report-manifest";
import { createClient } from "@/lib/supabase/server";

type DownloadReportRouteProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export async function GET(request: Request, { params }: DownloadReportRouteProps) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (!canAccessManagement(profile.role) && !canAccessClientPortal(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportId } = await params;
  const supabase = await createClient();
  const { data, error } = await fetchIssuedReportData(supabase, reportId, {
    issuedOnly: canAccessClientPortal(profile.role)
  });

  if (error || !data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const format = parseReportOutputFormat(new URL(request.url).searchParams.get("format"));

  if (format === "json") {
    return NextResponse.json(buildReportManifest(data), {
      headers: {
        "Content-Disposition": `attachment; filename="${reportOutputFilename(data.report.reportNumber, "json")}"`
      }
    });
  }

  if (format === "pdf") {
    const pdf = await renderReportPdfWithImages(data, data.layout);

    return new NextResponse(pdf, {
      headers: {
        "Content-Disposition": `attachment; filename="${reportOutputFilename(data.report.reportNumber, "pdf")}"`,
        "Content-Type": "application/pdf"
      }
    });
  }

  const html = renderReportHtml(data, data.layout);
  return new NextResponse(html, {
    headers: {
      "Content-Disposition": `attachment; filename="${reportOutputFilename(data.report.reportNumber, "html")}"`,
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
