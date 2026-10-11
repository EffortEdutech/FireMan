import { redirect } from "next/navigation";
import Link from "next/link";
import { generateReportShell, issueReport, reviewReport } from "@/app/(dashboard)/reports/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
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

const fieldStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
};

const reportStatusLabel = {
  DRAFT: "Draft",
  GENERATED: "Generated",
  REVIEWED: "Reviewed",
  ISSUED: "Issued",
  VOID: "Void"
};

const reportStatusFilters = [
  { key: "active", label: "Action needed" },
  { key: "GENERATED", label: "Generated" },
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
      .select("id,name,description,is_default")
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
  const hasJobs = reportableJobs.length > 0;
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
      <PageHeader title="Reports" description="Generate, review, and issue report records from completed maintenance evidence." />
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
      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>1. Generate report shell</h2>
        <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Select a job that is under management review and has no active report yet.
        </div>
        <form action={generateReportShell} style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <select aria-label="Maintenance job" disabled={!hasJobs} name="job_id" required style={fieldStyle}>
              <option value="">{hasJobs ? "Select job under review" : "No reviewed jobs ready for report"}</option>
              {reportableJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.job_number} - {job.clients?.name ?? "Client"} / {job.sites?.name ?? "Site"}
                </option>
              ))}
            </select>
            <select aria-label="Report template" disabled={!hasJobs || !templates || templates.length === 0} name="template_id" required style={fieldStyle}>
              <option value="">{templates && templates.length > 0 ? "Select report template" : "No report templates"}</option>
              {templates?.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
            <input aria-label="Report title" disabled={!hasJobs} name="title" placeholder="Report title" style={fieldStyle} />
          </div>
          <div>
            <Button disabled={!hasJobs} type="submit">
              Generate Report Shell
            </Button>
          </div>
        </form>
      </Card>
      <h2 style={{ fontSize: "1rem", margin: "0.5rem 0 0" }}>2. Review and issue reports</h2>
      {reportsError ? (
        <ErrorState title="Reports unavailable" message="The report list could not be loaded." />
      ) : findingsError || jobEquipmentError || inspectionsError || resultsError || templatesError ? (
        <ErrorState title="Evidence unavailable" message="Captured findings could not be loaded." />
      ) : reports && reports.length > 0 ? (
        <>
        <FilterBar
          description="Action needed shows generated reports awaiting review and reviewed reports ready to issue. Use Issued or All reports for history."
          items={reportStatusFilters.map((filter) => ({
            count: filterCountByKey(filter.key),
            href: filter.key === "active" ? "/reports" : `/reports?status=${filter.key}`,
            key: filter.key,
            label: filter.label
          }))}
          selectedKey={selectedStatus}
        />
        {filteredReports.length > 0 ? (
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
