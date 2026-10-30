import Link from "next/link";
import { closeJobFromIssuedReport, startJobReview } from "@/app/(dashboard)/maintenance/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export type MaintenancePipelineJob = {
  id: string;
  jobNumber: string;
  clientName: string;
  siteName: string;
  scheduledDate: string;
  technicianName: string;
  planName: string;
  status: string;
  statusLabel: string;
  assetCount: number;
  completedAssetCount: number;
  findingCount: number;
  criticalFindingCount: number;
  checklistComplete: boolean;
  report: { id: string; number: string; status: string } | null;
};

const columns = [
  { key: "SCHEDULED", label: "Scheduled", hint: "Planned visits and upcoming work" },
  { key: "IN_PROGRESS", label: "In progress", hint: "Technician work currently underway" },
  { key: "SUBMITTED", label: "Field review", hint: "Evidence submitted by the field team" },
  { key: "UNDER_REVIEW", label: "Report preparation", hint: "Ready for management and reporting" },
  { key: "COMPLETED", label: "Completed", hint: "Closed maintenance history" }
];

export function MaintenancePipeline({ jobs, selectedStatus, overdueCount, reviewQueueCount }: {
  jobs: MaintenancePipelineJob[];
  selectedStatus: string;
  overdueCount: number;
  reviewQueueCount: number;
}) {
  const visibleColumns = columns.filter((column) => selectedStatus === "active" || selectedStatus === "all" || column.key === selectedStatus);

  return (
    <div className="maintenance-pipeline-shell">
      <div className="maintenance-operating-summary">
        <div><span>Visible jobs</span><strong>{jobs.length}</strong><small>{selectedStatus === "active" ? "active pipeline" : "current filter"}</small></div>
        <div><span>Review queue</span><strong>{reviewQueueCount}</strong><small>field and report review</small></div>
        <div className={overdueCount > 0 ? "maintenance-summary-alert" : ""}><span>Overdue</span><strong>{overdueCount}</strong><small>scheduled before today</small></div>
      </div>
      <div className="maintenance-pipeline">
        {visibleColumns.map((column) => {
          const columnJobs = jobs.filter((job) => job.status === column.key);
          return (
            <section className="maintenance-pipeline-column" key={column.key} aria-labelledby={`maintenance-column-${column.key}`}>
              <div className="maintenance-pipeline-column-heading"><div><h2 id={`maintenance-column-${column.key}`}>{column.label}</h2><p>{column.hint}</p></div><strong>{columnJobs.length}</strong></div>
              <div className="maintenance-pipeline-cards">
                {columnJobs.map((job) => <Card className="maintenance-job-card" key={job.id}>
                  <div className="maintenance-job-card-heading"><Link href={`/maintenance/${job.id}`}><strong>{job.jobNumber}</strong></Link><StatusBadge>{job.statusLabel}</StatusBadge></div>
                  <div className="maintenance-job-card-location">{job.clientName} · {job.siteName}</div>
                  <div className="maintenance-job-card-meta"><span>{job.planName}</span><span>{job.scheduledDate}</span><span>{job.technicianName}</span></div>
                  <div className="maintenance-job-card-evidence"><span>{job.assetCount ? `${job.completedAssetCount}/${job.assetCount} checklists` : "No assets"}</span><span className={job.criticalFindingCount ? "maintenance-critical" : ""}>{job.findingCount ? `${job.findingCount} finding${job.findingCount === 1 ? "" : "s"}${job.criticalFindingCount ? ` · ${job.criticalFindingCount} critical` : ""}` : "No findings"}</span></div>
                  <div className="maintenance-job-card-actions">
                    {job.status === "SUBMITTED" && job.checklistComplete ? <form action={startJobReview}><input name="job_id" type="hidden" value={job.id} /><Button type="submit" variant="secondary">Start review</Button></form> : null}
                    {job.status === "SUBMITTED" && !job.checklistComplete ? <span className="maintenance-critical">Complete assigned checklists first</span> : null}
                    {job.status === "UNDER_REVIEW" ? <Link href="/reports" className="maintenance-action-link">Generate report →</Link> : null}
                    {job.report?.status === "ISSUED" && job.status !== "COMPLETED" ? <form action={closeJobFromIssuedReport}><input name="job_id" type="hidden" value={job.id} /><Button type="submit" variant="secondary">Close job</Button></form> : null}
                    {job.report ? <Link href={`/reports/${job.report.id}`} className="maintenance-action-link">{job.report.number} · {job.report.status}</Link> : null}
                  </div>
                </Card>)}
                {!columnJobs.length ? <p className="maintenance-pipeline-empty">No jobs in this stage.</p> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
