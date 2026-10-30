import { redirect } from "next/navigation";
import Link from "next/link";
import { generateReportShell, issueReport, reviewReport } from "@/app/(dashboard)/reports/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { ReportGenerationForm } from "@/components/reports/report-generation-form";
import { ReportOutputStatus } from "@/components/reports/report-output-status";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { requireProfile } from "@/lib/auth/current-user";
import { formatDate } from "@/lib/format/date";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type ReportsPageProps = {
  searchParams?: Promise<{
    created?: string;
    issued?: string;
    error?: string;
    reviewed?: string;
    status?: string;
  }>;
};

const reportStatusLabel = {
  DRAFT: "Draft",
  GENERATED: "Generated",
  REVIEWED: "Reviewed",
  ISSUED: "Issued",
  VOID: "Void"
};

const reportStatusFilters = [
  { key: "active", label: "Needs action" },
  { key: "GENERATED", label: "Needs review" },
  { key: "REVIEWED", label: "Ready to issue" },
  { key: "ISSUED", label: "Issued" },
  { key: "all", label: "All reports" }
];

const activeReportStatuses = new Set(["GENERATED", "REVIEWED"]);

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: jobs }, { data: reports, error: reportsError }, { data: templates, error: templatesError }] = await Promise.all([
    supabase
      .from("maintenance_jobs")
      .select("id,job_number,scheduled_date,clients(name),sites(name)")
      .eq("status", "UNDER_REVIEW")
      .order("scheduled_date", { ascending: false }),
    supabase
      .from("reports")
      .select("id,job_id,report_number,title,status,generated_at,maintenance_jobs(job_number,clients(name),sites(name)),report_templates(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("report_templates")
      .select("id,name,description,is_default,layout")
      .eq("active", true)
      .eq("report_type", "MAINTENANCE")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })
  ]);
  const reportJobIds = reports?.map((report) => report.job_id).filter(Boolean) ?? [];
  const { data: findings, error: findingsError } =
    reportJobIds.length > 0
      ? await supabase
          .from("findings")
          .select("id,job_id,title,severity,status")
          .in("job_id", reportJobIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
  const { data: jobEquipment, error: jobEquipmentError } =
    reportJobIds.length > 0
      ? await supabase
          .from("job_equipment")
          .select("id,job_id")
          .in("job_id", reportJobIds)
      : { data: [], error: null };
  const jobEquipmentIds = jobEquipment?.map((asset) => asset.id) ?? [];
  const { data: inspections, error: inspectionsError } =
    jobEquipmentIds.length > 0
      ? await supabase
          .from("inspections")
          .select("id,job_id,job_equipment_id")
          .in("job_equipment_id", jobEquipmentIds)
      : { data: [], error: null };
  const inspectionIds = inspections?.map((inspection) => inspection.id) ?? [];
  const { data: inspectionResults, error: resultsError } =
    inspectionIds.length > 0
      ? await supabase
          .from("inspection_results")
          .select("id,inspection_id,result_status")
          .in("inspection_id", inspectionIds)
      : { data: [], error: null };

  const findingsByJobId = new Map<string, NonNullable<typeof findings>>();
  const inspectionJobIdById = new Map(inspections?.map((inspection) => [inspection.id, inspection.job_id]) ?? []);
  const checklistResultCountByJobId = new Map<string, number>();

  findings?.forEach((finding) => {
    const current = findingsByJobId.get(finding.job_id) ?? [];
    findingsByJobId.set(finding.job_id, [...current, finding]);
  });

  inspectionResults?.forEach((result) => {
    const jobId = inspectionJobIdById.get(result.inspection_id);

    if (jobId) {
      checklistResultCountByJobId.set(jobId, (checklistResultCountByJobId.get(jobId) ?? 0) + 1);
    }
  });

  const reportedJobIds = new Set(reports?.filter((report) => report.status !== "VOID").map((report) => report.job_id) ?? []);
  const reportableJobs = jobs?.filter((job) => !reportedJobIds.has(job.id)) ?? [];
  const sortedTemplates = templates ?? [];
  const defaultTemplateId = sortedTemplates.find((template) => template.is_default)?.id ?? sortedTemplates[0]?.id ?? "";
  const selectedStatus = reportStatusFilters.some((filter) => filter.key === params?.status) ? params?.status ?? "active" : "active";
  const reportCounts = new Map<string, number>();
  const filteredReports =
    reports?.filter((report) => {
      reportCounts.set(report.status, (reportCounts.get(report.status) ?? 0) + 1);

      if (selectedStatus === "all") {
        return true;
      }

      if (selectedStatus === "active") {
        return activeReportStatuses.has(report.status);
      }

      return report.status === selectedStatus;
    }) ?? [];
  const activeReportCount = reports?.filter((report) => activeReportStatuses.has(report.status)).length ?? 0;
  const generatedReportCount = reports?.filter((report) => report.status === "GENERATED").length ?? 0;
  const reviewedReportCount = reports?.filter((report) => report.status === "REVIEWED").length ?? 0;
  const issuedReportCount = reports?.filter((report) => report.status === "ISSUED").length ?? 0;
  const filterCountByKey = (key: string) => {
    if (key === "all") {
      return reports?.length ?? 0;
    }

    if (key === "active") {
      return activeReportCount;
    }

    return reportCounts.get(key) ?? 0;
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Reports" description="Move completed field work through evidence review, report approval, and client issue." />
      <div className="workflow-stepper" aria-label="Report workflow">
        <div className="workflow-step workflow-step-complete"><span>1</span><div><strong>Field evidence</strong><small>Technician submission</small></div></div>
        <div className="workflow-step workflow-step-current"><span>2</span><div><strong>Create report</strong><small>Build from reviewed evidence</small></div></div>
        <div className="workflow-step"><span>3</span><div><strong>Review report</strong><small>Approve content</small></div></div>
        <div className="workflow-step"><span>4</span><div><strong>Issue to client</strong><small>Publish approved report</small></div></div>
      </div>
      <div className="workflow-summary-grid" aria-label="Report workflow summary">
        <Link className="workflow-summary-card" href="/reports?status=all"><span>Field jobs ready</span><strong>{reportableJobs.length}</strong><small>Completed management review</small></Link>
        <Link className="workflow-summary-card" href="/reports?status=GENERATED"><span>Needs review</span><strong>{generatedReportCount}</strong><small>Report content awaiting approval</small></Link>
        <Link className="workflow-summary-card" href="/reports?status=REVIEWED"><span>Ready to issue</span><strong>{reviewedReportCount}</strong><small>Approved for client delivery</small></Link>
        <Link className="workflow-summary-card" href="/reports?status=ISSUED"><span>Issued reports</span><strong>{issuedReportCount}</strong><small>Visible in the client portal</small></Link>
      </div>
      {params?.created ? (
        <SuccessState message="Report shell generated. Open it to review field and checklist evidence." />
      ) : null}
      {params?.reviewed ? (
        <SuccessState message="Report reviewed. It is ready to issue to the client portal." />
      ) : null}
      {params?.issued ? (
        <SuccessState message="Report issued. The maintenance job is closed and the report is visible to the client." />
      ) : null}
      {params?.error ? (
        <ErrorState
          title="Report not generated"
          message={
            params.error === "missing-job"
              ? "Choose a job under management review."
              : params.error === "missing-template"
                ? "Choose a report template."
                : params.error === "template-not-found"
                  ? "The selected report template is unavailable."
              : params.error === "job-not-under-review"
                ? "Start management review before generating a report."
                : params.error === "report-exists"
                  ? "That job already has a report."
                  : "The report shell could not be created."
          }
        />
      ) : null}
      <Card className="workflow-action-card">
        <div className="workflow-section-heading"><div><span className="record-card-kicker">STEP 2 · CREATE</span><h2 style={{ fontSize: "1rem", margin: "0.25rem 0 0" }}>Create report from field evidence</h2></div><span className="record-status">{reportableJobs.length} ready</span></div>
        <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Choose a job that has completed management review, select its report template, and create the report for content approval. This creates the working report record; it does not publish anything to the client.
        </div>
        <ReportGenerationForm
          action={generateReportShell}
          defaultTemplateId={defaultTemplateId}
          jobs={reportableJobs}
          templates={sortedTemplates}
        />
      </Card>
      <div className="workflow-section-heading workflow-section-heading-spaced"><div><span className="record-card-kicker">STEPS 3–4 · DELIVERY</span><h2 style={{ fontSize: "1rem", margin: "0.25rem 0 0" }}>Review and issue queue</h2></div><span className="record-status">{activeReportCount} active</span></div>
      {reportsError ? (
        <ErrorState title="Reports unavailable" message="The report list could not be loaded." />
      ) : findingsError || jobEquipmentError || inspectionsError || resultsError || templatesError ? (
        <ErrorState title="Evidence unavailable" message="Captured findings could not be loaded." />
      ) : reports && reports.length > 0 ? (
        <>
        <FilterBar
          description="Needs review means the report content still requires approval. Ready to issue means it has been approved and can be published to the client portal."
          items={reportStatusFilters.map((filter) => ({
            count: filterCountByKey(filter.key),
            href: filter.key === "active" ? "/reports" : `/reports?status=${filter.key}`,
            key: filter.key,
            label: filter.label
          }))}
          selectedKey={selectedStatus}
        />
        {filteredReports.length > 0 ? (
        <>
        <div className="report-review-grid" aria-label="Report review queue">
          {filteredReports.map((report) => {
            const reportFindings = findingsByJobId.get(report.job_id) ?? [];
            const checklistResultCount = checklistResultCountByJobId.get(report.job_id) ?? 0;
            return <Card className="report-review-card" key={report.id}>
              <div className="record-card-heading"><div><span className="record-card-kicker">REPORT REVIEW</span><Link href={`/reports/${report.id}`}><h2>{report.report_number}</h2></Link></div><StatusBadge>{reportStatusLabel[report.status] ?? report.status}</StatusBadge></div>
              <p className="report-review-title">{report.title ?? "Untitled maintenance report"}</p>
              <div className="record-card-facts"><div><span>Job / site</span><strong>{report.maintenance_jobs?.job_number ?? "Not set"} · {report.maintenance_jobs?.sites?.name ?? "Not set"}</strong></div><div><span>Client</span><strong>{report.maintenance_jobs?.clients?.name ?? "Not set"}</strong></div></div>
              <div className="report-evidence-summary"><span>{reportFindings.length} finding{reportFindings.length === 1 ? "" : "s"}</span><span>{checklistResultCount} checklist result{checklistResultCount === 1 ? "" : "s"}</span></div>
              <div className="report-review-actions"><Link href={`/reports/${report.id}`} className="maintenance-action-link">Review report →</Link>{report.status === "GENERATED" ? <form action={reviewReport}><input name="report_id" type="hidden" value={report.id} /><Button type="submit" variant="secondary" pendingLabel="Approving report…">Approve for issue</Button></form> : null}{report.status === "REVIEWED" ? <form action={issueReport}><input name="report_id" type="hidden" value={report.id} /><Button type="submit" pendingLabel="Issuing to client…">Issue to client</Button></form> : null}</div>
            </Card>;
          })}
        </div>
        <div className="legacy-record-table">
        <Card className="table-scroll" style={{ padding: 0 }}>
          <table className="data-table">
            <colgroup>
              <col style={{ width: 150 }} />
              <col style={{ width: 210 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 230 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 130 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Report</th>
                <th>Title</th>
                <th>Job</th>
                <th>Client</th>
                <th>Site</th>
                <th>Template</th>
                <th>Evidence</th>
                <th>Generated</th>
                <th>Status</th>
                <th>Output</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => {
                const reportFindings = findingsByJobId.get(report.job_id) ?? [];
                const checklistResultCount = checklistResultCountByJobId.get(report.job_id) ?? 0;
                const evidenceParts = [];

                if (reportFindings.length > 0) {
                  evidenceParts.push(
                    `${reportFindings.length} finding${reportFindings.length === 1 ? "" : "s"}: ${reportFindings
                      .slice(0, 2)
                      .map((finding) => `${finding.title} - ${finding.severity} - ${finding.status}`)
                      .join("; ")}${reportFindings.length > 2 ? `; +${reportFindings.length - 2} more` : ""}`
                  );
                }

                if (checklistResultCount > 0) {
                  evidenceParts.push(`${checklistResultCount} checklist result${checklistResultCount === 1 ? "" : "s"}`);
                }

                const evidenceSummary =
                  evidenceParts.length > 0 ? evidenceParts.join(" / ") : "No evidence";

                return (
                  <tr key={report.id}>
                    <td>
                      <Link href={`/reports/${report.id}`}>
                        <strong>{report.report_number}</strong>
                      </Link>
                    </td>
                    <td>
                      {report.title ?? "Not set"}
                    </td>
                    <td>
                      {report.maintenance_jobs?.job_number ?? "Not set"}
                    </td>
                    <td>
                      {report.maintenance_jobs?.clients?.name ?? "Not set"}
                    </td>
                    <td>
                      {report.maintenance_jobs?.sites?.name ?? "Not set"}
                    </td>
                    <td>
                      {report.report_templates?.name ?? "Standard Maintenance Report"}
                    </td>
                    <td>
                      {evidenceSummary}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {formatDate(report.generated_at)}
                    </td>
                    <td>
                      <StatusBadge>{reportStatusLabel[report.status] ?? report.status}</StatusBadge>
                    </td>
                    <td>
                      <ReportOutputStatus reportId={report.id} status={report.status} />
                    </td>
                    <td>
                      {report.status === "GENERATED" ? (
                        <form action={reviewReport}>
                          <input name="report_id" type="hidden" value={report.id} />
                          <Button type="submit" variant="secondary">
                            Mark Reviewed
                          </Button>
                        </form>
                      ) : null}
                      {report.status === "REVIEWED" ? (
                        <form action={issueReport}>
                          <input name="report_id" type="hidden" value={report.id} />
                          <Button type="submit">Issue Report</Button>
                        </form>
                      ) : null}
                      {report.status === "ISSUED" ? "Issued and job closed" : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        </div>
        </>
        ) : (
          <EmptyState title="No reports in this view" message="Choose another status filter or generate a new report shell." />
        )}
        </>
      ) : (
        <EmptyState title="No reports yet" message="Start management review on a job, then generate the first report shell." />
      )}
    </div>
  );
}
