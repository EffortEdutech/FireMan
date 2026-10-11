import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { ReportOutputStatus } from "@/components/reports/report-output-status";
import { requireProfile } from "@/lib/auth/current-user";
import { formatDate } from "@/lib/format/date";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type ClientDashboardPageProps = {
  searchParams?: Promise<{
    evidence?: string;
  }>;
};

const evidenceFilters = [
  { key: "all", label: "All issued" },
  { key: "findings", label: "With findings" },
  { key: "checklist", label: "With checklist" },
  { key: "no-evidence", label: "No evidence" }
];

export default async function ClientDashboardPage({ searchParams }: ClientDashboardPageProps) {
  const profile = await requireProfile();

  if (!canAccessClientPortal(profile.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createClient();
  const { data: reports, error } = await supabase
    .from("reports")
    .select("id,job_id,report_number,title,issued_at,status,maintenance_jobs(job_number,scheduled_date,sites(name))")
    .eq("status", "ISSUED")
    .order("issued_at", { ascending: false });
  const reportJobIds = reports?.map((report) => report.job_id).filter(Boolean) ?? [];
  const { data: findings, error: findingsError } =
    reportJobIds.length > 0
      ? await supabase
          .from("findings")
          .select("id,job_id,title,severity,status,recommendation")
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
  const selectedEvidence = evidenceFilters.some((filter) => filter.key === params?.evidence) ? params?.evidence ?? "all" : "all";
  const filteredReports =
    reports?.filter((report) => {
      const findingCount = findingsByJobId.get(report.job_id)?.length ?? 0;
      const checklistResultCount = checklistResultCountByJobId.get(report.job_id) ?? 0;

      if (selectedEvidence === "findings") {
        return findingCount > 0;
      }

      if (selectedEvidence === "checklist") {
        return checklistResultCount > 0;
      }

      if (selectedEvidence === "no-evidence") {
        return findingCount === 0 && checklistResultCount === 0;
      }

      return true;
    }) ?? [];
  const reportCount = reports?.length ?? 0;
  const reportsWithFindings = reports?.filter((report) => (findingsByJobId.get(report.job_id)?.length ?? 0) > 0).length ?? 0;
  const reportsWithChecklist = reports?.filter((report) => (checklistResultCountByJobId.get(report.job_id) ?? 0) > 0).length ?? 0;
  const reportsWithNoEvidence =
    reports?.filter((report) => {
      const findingCount = findingsByJobId.get(report.job_id)?.length ?? 0;
      const checklistResultCount = checklistResultCountByJobId.get(report.job_id) ?? 0;

      return findingCount === 0 && checklistResultCount === 0;
    }).length ?? 0;
  const filterCountByKey = (key: string) => {
    if (key === "findings") {
      return reportsWithFindings;
    }

    if (key === "checklist") {
      return reportsWithChecklist;
    }

    if (key === "no-evidence") {
      return reportsWithNoEvidence;
    }

    return reportCount;
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Client Dashboard" description="Review issued maintenance reports and attached evidence." />
      {error ? (
        <EmptyState title="Reports unavailable" message="Issued reports could not be loaded." />
      ) : findingsError || jobEquipmentError || inspectionsError || resultsError ? (
        <EmptyState title="Evidence unavailable" message="Report evidence could not be loaded." />
      ) : reports && reports.length > 0 ? (
        <>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Issued reports</div>
              <strong style={{ display: "block", fontSize: "1.5rem", marginTop: 4 }}>{reportCount}</strong>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>With findings</div>
              <strong style={{ display: "block", fontSize: "1.5rem", marginTop: 4 }}>{reportsWithFindings}</strong>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>With checklist</div>
              <strong style={{ display: "block", fontSize: "1.5rem", marginTop: 4 }}>{reportsWithChecklist}</strong>
            </div>
          </div>
        </Card>
        <FilterBar
          description="Use evidence filters to quickly find reports with field findings or structured checklist results."
          items={evidenceFilters.map((filter) => ({
            count: filterCountByKey(filter.key),
            href: filter.key === "all" ? "/client/dashboard" : `/client/dashboard?evidence=${filter.key}`,
            key: filter.key,
            label: filter.label
          }))}
          selectedKey={selectedEvidence}
        />
        {filteredReports.length > 0 ? (
        <Card className="table-scroll" style={{ padding: 0 }}>
          <table className="data-table">
            <colgroup>
              <col style={{ width: 150 }} />
              <col style={{ width: 220 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 260 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 110 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Report</th>
                <th>Title</th>
                <th>Job</th>
                <th>Site</th>
                <th>Evidence</th>
                <th>Issued</th>
                <th>Output</th>
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
                      <Link href={`/client/reports/${report.id}`}>
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
                      {report.maintenance_jobs?.sites?.name ?? "Not set"}
                    </td>
                    <td>
                      {evidenceSummary}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {formatDate(report.issued_at)}
                    </td>
                    <td>
                      <ReportOutputStatus reportId={report.id} status={report.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        ) : (
          <EmptyState title="No reports in this view" message="Choose another evidence filter to see issued reports." />
        )}
        </>
      ) : (
        <EmptyState title="No issued reports loaded" message="Client data stays read-only and RLS-scoped." />
      )}
    </div>
  );
}
