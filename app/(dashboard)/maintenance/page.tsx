import { redirect } from "next/navigation";
import Link from "next/link";
import { closeJobFromIssuedReport, createPlanAndJob, startJobReview } from "@/app/(dashboard)/maintenance/actions";
import { CreateJobForm } from "@/app/(dashboard)/maintenance/create-job-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { requireProfile } from "@/lib/auth/current-user";
import { formatDate } from "@/lib/format/date";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type MaintenancePageProps = {
  searchParams?: Promise<{
    created?: string;
    closed?: string;
    error?: string;
    review?: string;
    status?: string;
    page?: string;
  }>;
};

const jobStatusLabel = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Awaiting review",
  UNDER_REVIEW: "Ready for report",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

const reportStatusLabel = {
  DRAFT: "Draft",
  GENERATED: "Generated",
  REVIEWED: "Reviewed",
  ISSUED: "Issued",
  VOID: "Void"
};

const jobStatusFilters = [
  { key: "active", label: "Active work" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "SUBMITTED", label: "Awaiting review" },
  { key: "UNDER_REVIEW", label: "Ready for report" },
  { key: "COMPLETED", label: "Completed" },
  { key: "all", label: "All jobs" }
];

const activeJobStatuses = new Set(["SCHEDULED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW"]);

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createClient();
  const [
    { data: clients },
    { data: sites },
    { data: equipment },
    { data: technicians },
    { data: jobs, error: jobsError },
    { data: reports, error: reportsError }
  ] = await Promise.all([
    supabase.from("clients").select("id,name").eq("active", true).order("name", { ascending: true }),
    supabase.from("sites").select("id,name,client_id").eq("active", true).order("name", { ascending: true }),
    supabase
      .from("equipment")
      .select("id,asset_code,location_description,status,buildings(name,site_id,sites(name,clients(name))),equipment_types(name,code)")
      .eq("status", "ACTIVE")
      .order("asset_code", { ascending: true }),
    supabase
      .from("profiles")
      .select("id,full_name")
      .eq("role", "TECHNICIAN")
      .eq("active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("maintenance_jobs")
      .select("id,job_number,scheduled_date,completed_at,status,assigned_technician_id,clients(name),sites(name),maintenance_plans(name,frequency)")
      .order("scheduled_date", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("id,job_id,report_number,status,issued_at")
      .order("created_at", { ascending: false })
  ]);
  const jobIds = jobs?.map((job) => job.id) ?? [];
  const { data: findings, error: findingsError } =
    jobIds.length > 0
      ? await supabase
          .from("findings")
          .select("id,job_id,severity,status")
          .in("job_id", jobIds)
      : { data: [], error: null };
  const { data: jobEquipment, error: jobEquipmentError } =
    jobIds.length > 0
      ? await supabase
          .from("job_equipment")
          .select("id,job_id,status,equipment(asset_code,location_description,equipment_types(name,code))")
          .in("job_id", jobIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

  const hasSetup = Boolean(clients?.length && sites?.length);
  const clientOptions = clients?.map((client) => ({ id: client.id, name: client.name })) ?? [];
  const siteOptions = sites?.map((site) => ({ id: site.id, clientId: site.client_id, name: site.name })) ?? [];
  const equipmentOptions =
    equipment?.map((asset) => ({
      id: asset.id,
      assetCode: asset.asset_code,
      typeName: asset.equipment_types?.name ?? "Asset",
      clientName: asset.buildings?.sites?.clients?.name ?? "Client",
      siteId: asset.buildings?.site_id ?? "",
      siteName: asset.buildings?.sites?.name ?? "Site"
    })) ?? [];
  const technicianOptions =
    technicians?.map((technician) => ({ id: technician.id, fullName: technician.full_name })) ?? [];
  const techniciansById = new Map(technicians?.map((technician) => [technician.id, technician.full_name]) ?? []);
  const findingsByJobId = new Map<string, NonNullable<typeof findings>>();
  const equipmentByJobId = new Map<string, NonNullable<typeof jobEquipment>>();
  const reportsByJobId = new Map<string, NonNullable<typeof reports>[number]>();

  findings?.forEach((finding) => {
    const current = findingsByJobId.get(finding.job_id) ?? [];
    findingsByJobId.set(finding.job_id, [...current, finding]);
  });

  jobEquipment?.forEach((asset) => {
    const current = equipmentByJobId.get(asset.job_id) ?? [];
    equipmentByJobId.set(asset.job_id, [...current, asset]);
  });

  reports?.forEach((report) => {
    if (!reportsByJobId.has(report.job_id) && report.status !== "VOID") {
      reportsByJobId.set(report.job_id, report);
    }
  });
  const selectedStatus = jobStatusFilters.some((filter) => filter.key === params?.status) ? params?.status ?? "active" : "active";
  const jobCounts = new Map<string, number>();
  const filteredJobs =
    jobs?.filter((job) => {
      jobCounts.set(job.status, (jobCounts.get(job.status) ?? 0) + 1);

      if (selectedStatus === "all") {
        return true;
      }

      if (selectedStatus === "active") {
        return activeJobStatuses.has(job.status);
      }

      return job.status === selectedStatus;
    }) ?? [];
  const activeJobCount = jobs?.filter((job) => activeJobStatuses.has(job.status)).length ?? 0;
  const filterCountByKey = (key: string) => {
    if (key === "all") {
      return jobs?.length ?? 0;
    }

    if (key === "active") {
      return activeJobCount;
    }

    return jobCounts.get(key) ?? 0;
  };
  const pageSize = 50;
  const requestedPage = Math.max(1, Number.parseInt(params?.page ?? "1", 10) || 1);
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(filteredJobs.length / pageSize)));
  const pagedJobs = filteredJobs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Maintenance" description="Move planned work through technician delivery, evidence review, reporting, and closure." />
      <div className="register-summary"><strong>Maintenance delivery queue</strong><span>Schedule work, monitor field completion, review evidence, and close issued work.</span></div>
      {params?.created ? (
        <SuccessState message="Maintenance plan and job created." />
      ) : null}
      {params?.review ? (
        <SuccessState message="Job moved under management review." />
      ) : null}
      {params?.closed ? (
        <SuccessState message="Job closed from issued report." />
      ) : null}
      {params?.error ? (
        <ErrorState
          title="Maintenance job not saved"
          message={
            params.error === "missing-required"
              ? "Choose a client, site, frequency, and dates."
              : params.error === "missing-job"
                ? "Choose a submitted job to review."
                : params.error === "missing-issued-report"
                  ? "Only jobs with issued reports can be closed this way."
                  : params.error === "equipment-site-mismatch"
                    ? "The selected asset must belong to the selected site."
                    : params.error === "incomplete-checklists"
                      ? "Complete assigned asset checklists before starting management review."
                      : params.error === "client-site-mismatch"
                        ? "Choose a site that belongs to the selected client."
                      : "The maintenance job could not be saved."
          }
        />
      ) : null}
      <Card className="workflow-action-card">
        <div className="workflow-section-heading"><div><span className="record-card-kicker">PLAN NEW WORK</span><h2 style={{ fontSize: "1rem", margin: "0.25rem 0 0" }}>Schedule a maintenance visit</h2></div><span className="record-status">Start here</span></div>
        <p style={{ color: "var(--muted)", margin: "0 0 1rem" }}>Choose the client, site, technician, asset, frequency, and service window. The job will enter the Scheduled stage for field delivery.</p>
        <CreateJobForm
          action={createPlanAndJob}
          clients={clientOptions}
          equipment={equipmentOptions}
          sites={siteOptions}
          technicians={technicianOptions}
        />
        {!hasSetup ? (
          <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.75rem" }}>
            Create a client and at least one client site before scheduling maintenance work.
          </div>
        ) : null}
      </Card>
      {jobsError || reportsError || findingsError || jobEquipmentError ? (
        <ErrorState title="Jobs unavailable" message="The maintenance job list could not be loaded." />
      ) : jobs && jobs.length > 0 ? (
        <>
        <FilterBar
          description="Active work shows scheduled, in-progress, submitted, and ready-for-report jobs. Use Completed or All jobs for history."
          items={jobStatusFilters.map((filter) => ({
            count: filterCountByKey(filter.key),
            href: filter.key === "active" ? "/maintenance" : `/maintenance?status=${filter.key}`,
            key: filter.key,
            label: filter.label
          }))}
          selectedKey={selectedStatus}
        />
        {filteredJobs.length > 0 ? (
        <>
        <div className="maintenance-legacy-table">
        <Card className="table-scroll" style={{ padding: 0 }}>
          <table className="data-table">
            <colgroup>
              <col style={{ width: 120 }} />
              <col style={{ width: 86 }} />
              <col style={{ width: 92 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 104 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 112 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 132 }} />
              <col style={{ width: 150 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Job</th>
                <th>Client</th>
                <th>Site</th>
                <th>Assigned</th>
                <th>Plan</th>
                <th>Frequency</th>
                <th>Scheduled</th>
                <th>Completed</th>
                <th>Status</th>
                <th>Assets</th>
                <th>Evidence</th>
                <th>Review</th>
                <th>Report</th>
              </tr>
            </thead>
            <tbody>
              {pagedJobs.map((job) => {
                const report = reportsByJobId.get(job.id);
                const jobFindings = findingsByJobId.get(job.id) ?? [];
                const jobAssets = equipmentByJobId.get(job.id) ?? [];
                const criticalFindings = jobFindings.filter((finding) => finding.severity === "CRITICAL").length;
                const completedAssets = jobAssets.filter((asset) => asset.status === "COMPLETED").length;
                const assetChecklistsComplete = jobAssets.length === 0 || completedAssets === jobAssets.length;

                return (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/maintenance/${job.id}`}>
                        <strong>{job.job_number}</strong>
                      </Link>
                    </td>
                    <td>{job.clients?.name ?? "Not set"}</td>
                    <td>{job.sites?.name ?? "Not set"}</td>
                    <td>
                      {job.assigned_technician_id ? techniciansById.get(job.assigned_technician_id) ?? "Assigned" : "Unassigned"}
                    </td>
                    <td>
                      {job.maintenance_plans?.name ?? "Ad hoc"}
                    </td>
                    <td>
                      {job.maintenance_plans?.frequency ?? "Not set"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{job.scheduled_date}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(job.completed_at)}</td>
                    <td>
                      <StatusBadge>{jobStatusLabel[job.status] ?? job.status}</StatusBadge>
                    </td>
                    <td>
                      {jobAssets.length > 0 ? (
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong>{jobAssets.length} asset{jobAssets.length === 1 ? "" : "s"}</strong>
                          <span style={{ color: assetChecklistsComplete ? "var(--muted)" : "#8a1f17" }}>
                            {completedAssets}/{jobAssets.length} checklist complete
                          </span>
                          {jobAssets.slice(0, 2).map((asset) => (
                            <span key={asset.id} style={{ color: "var(--muted)" }}>
                              {asset.equipment?.asset_code ?? "Asset"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "No assets"
                      )}
                    </td>
                    <td>
                      {jobFindings.length > 0 ? (
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong>{jobFindings.length} finding{jobFindings.length === 1 ? "" : "s"}</strong>
                          {criticalFindings > 0 ? <span style={{ color: "#8a1f17" }}>{criticalFindings} critical</span> : null}
                        </div>
                      ) : (
                        "No findings"
                      )}
                    </td>
                    <td>
                      {job.status === "SUBMITTED" ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <span>Submitted for review</span>
                          {assetChecklistsComplete ? (
                            <form action={startJobReview}>
                              <input name="job_id" type="hidden" value={job.id} />
                              <Button type="submit" variant="secondary">
                                Start Review
                              </Button>
                            </form>
                          ) : (
                            <span style={{ color: "#8a1f17" }}>Complete assigned asset checklists first</span>
                          )}
                        </div>
                      ) : null}
                      {job.status === "UNDER_REVIEW" ? (
                        <Link href="/reports" style={{ color: "var(--accent)", fontWeight: 700 }}>
                          Generate report
                        </Link>
                      ) : null}
                      {job.status === "COMPLETED" ? "Closed" : null}
                      {report?.status === "ISSUED" && job.status !== "COMPLETED" ? (
                        <form action={closeJobFromIssuedReport}>
                          <input name="job_id" type="hidden" value={job.id} />
                          <Button type="submit" variant="secondary">
                            Close Job
                          </Button>
                        </form>
                      ) : null}
                      {job.status !== "SUBMITTED" && job.status !== "UNDER_REVIEW" && job.status !== "COMPLETED" && report?.status !== "ISSUED" ? "Not ready" : null}
                    </td>
                    <td>
                      {report ? (
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong>{report.report_number}</strong>
                          <span style={{ color: "var(--muted)" }}>{reportStatusLabel[report.status] ?? report.status} {report.issued_at ? `- ${formatDate(report.issued_at)}` : ""}</span>
                          <Link href={`/reports/${report.id}`} style={{ color: "var(--accent)", fontWeight: 700 }}>
                            Open report
                          </Link>
                        </div>
                      ) : (
                        "No report"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        </div>
        <PaginationControls basePath="/maintenance" page={page} pageSize={pageSize} query={{ status: selectedStatus }} total={filteredJobs.length} />
        </>
        ) : (
          <EmptyState title="No jobs in this view" message="Choose another status filter or create a new maintenance job." />
        )}
        </>
      ) : (
        <EmptyState title="No jobs yet" message="Create the first maintenance plan and scheduled job." />
      )}
    </div>
  );
}
