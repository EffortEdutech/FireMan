import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { issueReport, reviewReport } from "@/app/(dashboard)/reports/actions";
import { ReportDownloadLinks } from "@/components/reports/report-download-links";
import { ReportLayoutRenderer } from "@/components/reports/report-layout-renderer";
import { ReportOutputNote } from "@/components/reports/report-output-note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PrintButton } from "@/components/ui/print-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { fetchIssuedReportData } from "@/lib/reports/issued-report-data";
import { createClient } from "@/lib/supabase/server";

type ReportDetailPageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

const reportStatusLabel = {
  DRAFT: "Draft",
  GENERATED: "Generated",
  REVIEWED: "Reviewed",
  ISSUED: "Issued",
  VOID: "Void"
};

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const { reportId } = await params;
  const supabase = await createClient();
  const { data: reportData, error } = await fetchIssuedReportData(supabase, reportId);

  if (error || !reportData) {
    notFound();
  }

  return (
    <div className="print-sheet" style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
        <div>
          <Link className="no-print" href="/reports" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Back to reports
          </Link>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.75rem" }}>{reportData.report.reportNumber}</h1>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>{reportData.report.title ?? "Untitled report"}</div>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>Template: {reportData.report.templateName}</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div className="no-print">
            <PrintButton />
          </div>
          <ReportDownloadLinks reportId={reportData.report.id} />
          <StatusBadge>{reportStatusLabel[reportData.report.status] ?? reportData.report.status}</StatusBadge>
        </div>
      </div>

      <ReportLayoutRenderer data={reportData} layout={reportData.layout} />
      <ReportOutputNote />

      <Card className="no-print">
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>4. Report action</h2>
        {reportData.report.status === "GENERATED" ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Mark reviewed after confirming the field evidence and checklist evidence above.
            </div>
            <form action={reviewReport}>
              <input name="report_id" type="hidden" value={reportData.report.id} />
              <Button type="submit" variant="secondary">
                Mark Reviewed
              </Button>
            </form>
          </div>
        ) : null}
        {reportData.report.status === "REVIEWED" ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Issue this report to make it visible in the client portal. Issuing also closes the maintenance job.
            </div>
            <form action={issueReport}>
              <input name="report_id" type="hidden" value={reportData.report.id} />
              <Button type="submit">Issue Report</Button>
            </form>
          </div>
        ) : null}
        {reportData.report.status === "ISSUED" ? (
          <div>Issued reports are visible to the scoped client portal. The maintenance job is closed after issue.</div>
        ) : null}
        {reportData.report.status !== "GENERATED" && reportData.report.status !== "REVIEWED" && reportData.report.status !== "ISSUED" ? (
          <div style={{ color: "var(--muted)" }}>No action is available for this report state.</div>
        ) : null}
      </Card>
    </div>
  );
}
