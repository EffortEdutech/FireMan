import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReportDownloadLinks } from "@/components/reports/report-download-links";
import { ReportLayoutRenderer } from "@/components/reports/report-layout-renderer";
import { ReportOutputNote } from "@/components/reports/report-output-note";
import { PrintButton } from "@/components/ui/print-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { fetchIssuedReportData } from "@/lib/reports/issued-report-data";
import { reportTemplateStats } from "@/lib/reports/report-template-stats";
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

  const templateStats = reportTemplateStats(reportData.layout);

  return (
    <div className="print-sheet" style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
        <div>
          <Link className="no-print" href="/client/dashboard" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Back to client dashboard
          </Link>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.75rem" }}>{reportData.report.reportNumber}</h1>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>{reportData.report.title ?? "Maintenance report"}</div>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>Template: {reportData.report.templateName}</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div className="no-print">
            <PrintButton />
          </div>
          <ReportDownloadLinks reportId={reportData.report.id} />
          <StatusBadge>Issued</StatusBadge>
        </div>
      </div>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          display: "grid",
          gap: "0.75rem",
          padding: "1rem"
        }}
      >
        <div>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>Report template used</h2>
          <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 4 }}>
            This issued report keeps the template version selected when the report was generated.
          </div>
        </div>
        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {[
            ["Template", reportData.report.templateName],
            ["Version Behavior", "Frozen on report"],
            ["Sections", `${templateStats.sectionCount}`],
            ["Selected Fields", `${templateStats.fieldCount}`]
          ].map(([label, value]) => (
            <div key={label} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem" }}>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 700 }}>{label}</div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <ReportLayoutRenderer data={reportData} layout={reportData.layout} />
      <ReportOutputNote />
    </div>
  );
}
