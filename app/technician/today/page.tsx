import { redirect } from "next/navigation";
import Link from "next/link";
import { addFinding, startJob, submitJob } from "@/app/technician/today/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { AlertState, EmptyState, SuccessState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessTechnician } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type TechnicianTodayPageProps = {
  searchParams?: Promise<{
    error?: string;
    finding?: string;
    started?: string;
    status?: string;
    submitted?: string;
  }>;
};

const fieldStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
};

const jobStatusLabel = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

const technicianJobFilters = [
  { key: "active", label: "Action needed" },
  { key: "SCHEDULED", label: "Start jobs" },
  { key: "IN_PROGRESS", label: "Field work" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "all", label: "All today" }
];

const activeTechnicianStatuses = new Set(["SCHEDULED", "IN_PROGRESS"]);

export default async function TechnicianTodayPage({ searchParams }: TechnicianTodayPageProps) {
  const profile = await requireProfile();

  if (!canAccessTechnician(profile.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: jobs, error: jobsError }, { data: findings, error: findingsError }] = await Promise.all([
    supabase
      .from("maintenance_jobs")
      .select("id,job_number,scheduled_date,status,clients(name),sites(name)")
      .in("status", ["SCHEDULED", "IN_PROGRESS", "SUBMITTED"])
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("findings")
      .select("id,title,severity,status,created_at,maintenance_jobs(id,job_number),equipment(asset_code)")
      .order("created_at", { ascending: false })
  ]);
  const jobIds = jobs?.map((job) => job.id) ?? [];
  const { data: jobEquipment, error: jobEquipmentError } =
    jobIds.length > 0
      ? await supabase
          .from("job_equipment")
          .select("id,job_id,status,equipment_id,equipment(asset_code,location_description,equipment_types(name,code))")
          .in("job_id", jobIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };
  const jobEquipmentIds = jobEquipment?.map((asset) => asset.id) ?? [];
  const { data: inspections, error: inspectionsError } =
    jobEquipmentIds.length > 0
      ? await supabase
          .from("inspections")
          .select("id,job_equipment_id,status")
          .in("job_equipment_id", jobEquipmentIds)
      : { data: [], error: null };

  const inProgressJobs = jobs?.filter((job) => job.status === "IN_PROGRESS") ?? [];
  const findingsByJobId = new Map<string, number>();
  const equipmentByJobId = new Map<string, NonNullable<typeof jobEquipment>>();
  const inspectionsByAssetId = new Map(inspections?.map((inspection) => [inspection.job_equipment_id, inspection]) ?? []);
  const inProgressEquipment =
    jobEquipment?.filter((asset) => inProgressJobs.some((job) => job.id === asset.job_id)) ?? [];

  findings?.forEach((finding) => {
    const jobId = finding.maintenance_jobs?.id;
    const job = jobs?.find((item) => item.id === jobId);

    if (job) {
      findingsByJobId.set(job.id, (findingsByJobId.get(job.id) ?? 0) + 1);
    }
  });

  jobEquipment?.forEach((asset) => {
    const current = equipmentByJobId.get(asset.job_id) ?? [];
    equipmentByJobId.set(asset.job_id, [...current, asset]);
  });
  const selectedStatus = technicianJobFilters.some((filter) => filter.key === params?.status) ? params?.status ?? "active" : "active";
  const jobCounts = new Map<string, number>();
  const filteredJobs =
    jobs?.filter((job) => {
      jobCounts.set(job.status, (jobCounts.get(job.status) ?? 0) + 1);

      if (selectedStatus === "all") {
        return true;
      }

      if (selectedStatus === "active") {
        return activeTechnicianStatuses.has(job.status);
      }

      return job.status === selectedStatus;
    }) ?? [];
  const activeJobCount = jobs?.filter((job) => activeTechnicianStatuses.has(job.status)).length ?? 0;
  const filterCountByKey = (key: string) => {
    if (key === "all") {
      return jobs?.length ?? 0;
    }

    if (key === "active") {
      return activeJobCount;
    }

    return jobCounts.get(key) ?? 0;
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Today" description="Start assigned jobs and capture field findings." />
      {params?.started ? (
        <SuccessState message="Job started." />
      ) : null}
      {params?.finding ? (
        <SuccessState message="Finding captured." />
      ) : null}
      {params?.submitted ? (
        <SuccessState message="Job submitted for management review." />
      ) : null}
      {params?.error ? (
        <AlertState
          message={params.error === "job-not-started"
            ? "Start the job before capturing findings."
            : params.error === "equipment-not-assigned"
              ? "Choose an asset assigned to this job."
              : params.error === "photo-upload-failed"
                ? "Finding saved, but the photo upload failed. Retry the photo upload when connected."
                : params.error === "inspection-not-ready"
                  ? "Start this job and asset checklist before recording the result."
              : "Field action failed."}
        />
      ) : null}
      {jobsError || jobEquipmentError || inspectionsError ? (
        <EmptyState title="Jobs unavailable" message="The job queue could not be loaded." />
      ) : jobs && jobs.length > 0 ? (
        <>
        <FilterBar
          description="Action needed shows jobs to start and field work still in progress. Submitted jobs are locked for management review."
          items={technicianJobFilters.map((filter) => ({
            count: filterCountByKey(filter.key),
            href: filter.key === "active" ? "/technician/today" : `/technician/today?status=${filter.key}`,
            key: filter.key,
            label: filter.label
          }))}
          selectedKey={selectedStatus}
        />
        {filteredJobs.length > 0 ? (
        <Card className="table-scroll" style={{ padding: 0 }}>
          <table className="data-table">
            <colgroup>
              <col style={{ width: 150 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 130 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Job</th>
                <th>Client</th>
                <th>Site</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th>Assets</th>
                <th>Checklist</th>
                <th>Findings</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => {
                const jobAssets = equipmentByJobId.get(job.id) ?? [];
                const completedAssets = jobAssets.filter((asset) => asset.status === "COMPLETED").length;
                const startedInspections = jobAssets.filter((asset) => inspectionsByAssetId.has(asset.id)).length;
                const canSubmit = jobAssets.length === 0 || completedAssets === jobAssets.length;
                const checklistSummary =
                  jobAssets.length === 0
                    ? "No assets"
                    : completedAssets === jobAssets.length
                      ? `${completedAssets}/${jobAssets.length} complete`
                      : startedInspections > 0
                        ? `${completedAssets}/${jobAssets.length} complete`
                        : "Not started";

                return (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/technician/jobs/${job.id}`}>
                        <strong>{job.job_number}</strong>
                      </Link>
                    </td>
                    <td>{job.clients?.name ?? "Not set"}</td>
                    <td>{job.sites?.name ?? "Not set"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{job.scheduled_date}</td>
                    <td>
                      <StatusBadge>{jobStatusLabel[job.status] ?? job.status}</StatusBadge>
                    </td>
                    <td>
                      {jobAssets.length > 0 ? (
                        <div style={{ display: "grid", gap: 4 }}>
                          {jobAssets.map((asset) => (
                            <span key={asset.id}>
                              {asset.equipment?.asset_code ?? "Asset"} - {asset.status}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "No assets"
                      )}
                    </td>
                    <td>{checklistSummary}</td>
                    <td>{findingsByJobId.get(job.id) ?? 0}</td>
                    <td>
                      {job.status === "SCHEDULED" ? (
                        <form action={startJob}>
                          <input name="job_id" type="hidden" value={job.id} />
                          <input name="next" type="hidden" value={`/technician/jobs/${job.id}`} />
                          <Button type="submit">Start</Button>
                        </form>
                      ) : null}
                      {job.status === "IN_PROGRESS" ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          {!canSubmit ? (
                            <>
                              <Link
                                href={`/technician/jobs/${job.id}`}
                                style={{ color: "var(--accent)", fontSize: "0.875rem", fontWeight: 700 }}
                              >
                                Open checklist
                              </Link>
                              <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>Complete checklist first</span>
                            </>
                          ) : (
                            <form action={submitJob}>
                              <input name="job_id" type="hidden" value={job.id} />
                              <input name="next" type="hidden" value="/technician/today" />
                              <Button type="submit" variant="secondary">
                                Submit
                              </Button>
                            </form>
                          )}
                        </div>
                      ) : null}
                      {job.status === "SUBMITTED" ? (
                        "Submitted"
                      ) : null}
                      {job.status !== "SCHEDULED" && job.status !== "IN_PROGRESS" && job.status !== "SUBMITTED" ? (
                        "Open"
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        ) : (
          <EmptyState title="No jobs in this view" message="Choose another job filter or wait for a new assignment." />
        )}
        </>
      ) : (
        <EmptyState title="No assigned jobs" message="Scheduled and in-progress jobs will appear here." />
      )}
      <Card>
        <form action={addFinding} style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <input name="next" type="hidden" value="/technician/today" />
            <select aria-label="In-progress job" disabled={inProgressJobs.length === 0} name="job_id" required style={fieldStyle}>
              <option value="">{inProgressJobs.length > 0 ? "Select in-progress job" : "Start a job first"}</option>
              {inProgressJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.job_number} - {job.clients?.name ?? "Client"} / {job.sites?.name ?? "Site"}
                </option>
              ))}
            </select>
            <select aria-label="Assigned asset" disabled={inProgressEquipment.length === 0} name="equipment_id" style={fieldStyle}>
              <option value="">{inProgressEquipment.length > 0 ? "Optional assigned asset" : "No job assets assigned"}</option>
              {inProgressEquipment.map((asset) => {
                const job = inProgressJobs.find((item) => item.id === asset.job_id);

                return (
                  <option key={asset.id} value={asset.equipment_id}>
                    {job?.job_number ?? "Job"} - {asset.equipment?.asset_code ?? "Asset"}
                  </option>
                );
              })}
            </select>
            <input aria-label="Finding title" disabled={inProgressJobs.length === 0} name="title" placeholder="Finding title" required style={fieldStyle} />
            <select aria-label="Severity" disabled={inProgressJobs.length === 0} name="severity" style={fieldStyle}>
              <option value="OBSERVATION">Observation</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <input aria-label="Description" disabled={inProgressJobs.length === 0} name="description" placeholder="Description" style={fieldStyle} />
            <input aria-label="Recommendation" disabled={inProgressJobs.length === 0} name="recommendation" placeholder="Recommendation" style={fieldStyle} />
          </div>
          <div>
            <Button disabled={inProgressJobs.length === 0} type="submit">
              Capture Finding
            </Button>
          </div>
          {inProgressJobs.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Start a scheduled job before capturing findings. Submitted jobs are locked for management review.
            </div>
          ) : null}
        </form>
      </Card>
      {findingsError ? (
        <EmptyState title="Findings unavailable" message="Captured findings could not be loaded." />
      ) : findings && findings.length > 0 ? (
        <Card className="table-scroll" style={{ padding: 0 }}>
          <table className="data-table">
            <colgroup>
              <col style={{ width: 180 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Finding</th>
                <th>Job</th>
                <th>Asset</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((finding) => (
                <tr key={finding.id}>
                  <td>
                    <strong>{finding.title}</strong>
                  </td>
                  <td>
                    {finding.maintenance_jobs?.id ? (
                      <Link href={`/technician/jobs/${finding.maintenance_jobs.id}`}>
                        {finding.maintenance_jobs.job_number}
                      </Link>
                    ) : (
                      "Not set"
                    )}
                  </td>
                  <td>{finding.equipment?.asset_code ?? "Not set"}</td>
                  <td>{finding.severity}</td>
                  <td>{finding.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
