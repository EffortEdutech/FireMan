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
import { SuccessState } from "@/components/ui/states";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { fetchIssuedReportData } from "@/lib/reports/issued-report-data";
import { reportTemplateStats } from "@/lib/reports/report-template-stats";
import { createClient } from "@/lib/supabase/server";

type ReportDetailPageProps = {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<{
    created?: string;
  }>;
};

const reportStatusLabel = {
  DRAFT: "Draft",
  GENERATED: "Generated",
  REVIEWED: "Reviewed",
  ISSUED: "Issued",
  VOID: "Void"
};

function countCriticalFindings(findings: { severity: string }[]) {
  return findings.filter((finding) => finding.severity === "CRITICAL").length;
}

function countChecklistAttention(
  groups: {
    items: {
      resultStatus: string | null;
    }[];
  }[]
) {
  return groups.reduce(
    (count, group) =>
      count +
      group.items.filter((item) => item.resultStatus === "FAIL" || item.resultStatus === "ATTENTION").length,
    0
  );
}

export default async function ReportDetailPage({ params, searchParams }: ReportDetailPageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const { reportId } = await params;
  const pageParams = await searchParams;
  const supabase = await createClient();
  const { data: reportData, error } = await fetchIssuedReportData(supabase, reportId);

  if (error || !reportData) {
    notFound();
  }

  const criticalFindingCount = countCriticalFindings(reportData.findings);
  const checklistAttentionCount = countChecklistAttention(reportData.checklistGroups);
  const hasLoadWarnings = Object.values(reportData.loadErrors).some(Boolean);
  const canReview = reportData.report.status === "GENERATED";
  const canIssue = reportData.report.status === "REVIEWED";
  const templateStats = reportTemplateStats(reportData.layout);

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

      {pageParams?.created ? (
        <SuccessState message="Report shell generated. Review the evidence below, then mark it reviewed when ready." />
      ) : null}

      <Card className="no-print">
        <div style={{ alignItems: "flex-start", display: "flex", gap: "1rem", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: "1rem", margin: 0 }}>Review workspace</h2>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 4 }}>
              Confirm the report evidence, checklist results, and output before moving to the next status.
            </div>
          </div>
          <StatusBadge>{reportStatusLabel[reportData.report.status] ?? reportData.report.status}</StatusBadge>
        </div>

        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: "1rem" }}>
          {[
            ["Client", reportData.client.name],
            ["Site", reportData.site.name],
            ["Job", reportData.job.jobNumber],
            ["Assets", `${reportData.assets.length}`],
            ["Findings", `${reportData.findings.length}`],
            ["Checklist Results", `${reportData.summary.checklistResultCount}`]
          ].map(([label, value]) => (
            <div key={label} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem" }}>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 700 }}>{label}</div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", display: "grid", gap: "0.75rem", marginTop: "1rem", paddingTop: "1rem" }}>
          <div style={{ alignItems: "flex-start", display: "flex", gap: "1rem", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Report template used</h3>
              <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 4 }}>
                This report keeps the template version selected when the shell was generated.
              </div>
            </div>
            {reportData.report.templateId ? (
              <Link
                href={`/report-templates/${reportData.report.templateId}`}
                style={{ color: "var(--accent)", fontSize: "0.875rem", fontWeight: 700, whiteSpace: "nowrap" }}
              >
                Open Setting
              </Link>
            ) : null}
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
        </div>

        <div style={{ display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
          {criticalFindingCount > 0 ? (
            <div style={{ color: "#8a1f17" }}>{criticalFindingCount} critical finding{criticalFindingCount === 1 ? "" : "s"} included.</div>
          ) : null}
          {checklistAttentionCount > 0 ? (
            <div style={{ color: "#8a1f17" }}>
              {checklistAttentionCount} checklist result{checklistAttentionCount === 1 ? "" : "s"} need attention or failed.
            </div>
          ) : null}
          {hasLoadWarnings ? (
            <div style={{ color: "#8a1f17" }}>Some evidence could not be loaded. Recheck before reviewing or issuing.</div>
          ) : null}
          {!criticalFindingCount && !checklistAttentionCount && !hasLoadWarnings ? (
            <div style={{ color: "var(--muted)" }}>No critical findings, failed checklist results, or evidence load warnings detected.</div>
          ) : null}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", display: "grid", gap: "0.75rem", marginTop: "1rem", paddingTop: "1rem" }}>
          {canReview ? (
            <form action={reviewReport}>
              <input name="report_id" type="hidden" value={reportData.report.id} />
              <Button type="submit">
                Mark Reviewed
              </Button>
            </form>
          ) : null}
          {canIssue ? (
            <form action={issueReport}>
              <input name="report_id" type="hidden" value={reportData.report.id} />
              <Button type="submit">Issue Report</Button>
            </form>
          ) : null}
          {reportData.report.status === "ISSUED" ? (
            <div>Issued reports are visible to the scoped client portal. The maintenance job is closed after issue.</div>
          ) : null}
          {reportData.report.status !== "GENERATED" && reportData.report.status !== "REVIEWED" && reportData.report.status !== "ISSUED" ? (
            <div style={{ color: "var(--muted)" }}>No action is available for this report state.</div>
          ) : null}
        </div>
      </Card>

      <ReportLayoutRenderer data={reportData} layout={reportData.layout} />
      <ReportOutputNote />
    </div>
  );
}
