import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReportDownloadLinks } from "@/components/reports/report-download-links";
import { ReportLayoutRenderer } from "@/components/reports/report-layout-renderer";
import { PrintButton } from "@/components/ui/print-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { fetchIssuedReportData } from "@/lib/reports/issued-report-data";
import { standardMaintenanceReportLayout } from "@/lib/reports/standard-maintenance-report-layout";
import { createClient } from "@/lib/supabase/server";

type ClientReportPageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export default async function ClientReportPage({ params }: ClientReportPageProps) {
  const profile = await requireProfile();

  if (!canAccessClientPortal(profile.role)) {
    redirect("/dashboard");
  }

  const { reportId } = await params;
  const supabase = await createClient();
  const { data: reportData, error } = await fetchIssuedReportData(supabase, reportId, { issuedOnly: true });

  if (error || !reportData) {
    notFound();
  }

  return (
    <div className="print-sheet" style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
        <div>
          <Link className="no-print" href="/client/dashboard" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Back to client dashboard
          </Link>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.75rem" }}>{reportData.report.reportNumber}</h1>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>{reportData.report.title ?? "Maintenance report"}</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div className="no-print">
            <PrintButton />
          </div>
          <ReportDownloadLinks reportId={reportData.report.id} />
          <StatusBadge>Issued</StatusBadge>
        </div>
      </div>

      <ReportLayoutRenderer data={reportData} layout={standardMaintenanceReportLayout} />
    </div>
  );
}
