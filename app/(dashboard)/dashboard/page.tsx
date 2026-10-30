import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
import { Card } from "@/components/ui/card";
import { OperationsInbox } from "@/components/dashboard/operations-inbox";
import { createClient } from "@/lib/supabase/server";
import { fetchOperationalKpis } from "@/lib/dashboard/operational-kpis";
import { fetchAttentionQueues } from "@/lib/dashboard/attention-queues";
import { fetchScheduledIntelligence } from "@/lib/dashboard/scheduled-intelligence";
import { fetchMaintenanceTrends } from "@/lib/maintenance/history-trends";
import { fetchTechnicianWorkload } from "@/lib/maintenance/technician-workload";

function MetricCard({ href, label, value, note }: { href?: string; label: string; value: number | null; note?: string }) {
  const content = (
    <>
      <div style={{ color: "var(--muted)" }}>{label}</div>
      <strong style={{ display: "block", fontSize: "2rem", marginTop: 8 }}>{value ?? 0}</strong>
      {note ? <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 6 }}>{note}</div> : null}
    </>
  );

  return (
    <Card>
      {href ? (
        <Link href={href} style={{ color: "inherit", display: "block", textDecoration: "none" }}>
          {content}
        </Link>
      ) : (
        content
      )}
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: inboxRequests }, { data: inboxJobs }, { data: inboxReports }] = await Promise.all([
    supabase
      .from("service_requests")
      .select("id,request_reference,title,category,status,urgency,requester_company,site_description,next_action,updated_at")
      .order("updated_at", { ascending: true })
      .range(0, 49),
    supabase
      .from("maintenance_jobs")
      .select("id,job_number,status,scheduled_date,clients(name),sites(name)")
      .order("scheduled_date", { ascending: true })
      .range(0, 49),
    supabase
      .from("reports")
      .select("id,report_number,title,status,maintenance_jobs(job_number,clients(name),sites(name))")
      .order("created_at", { ascending: true })
      .range(0, 49)
  ]);
  const { data: kpis, error } = await fetchOperationalKpis(supabase);
  const { data: queues, error: queuesError } = await fetchAttentionQueues(supabase);
  const { data: schedule, error: scheduleError } = await fetchScheduledIntelligence(supabase);
  const { data: trends, error: trendsError } = await fetchMaintenanceTrends(supabase);
  const { data: workload, error: workloadError } = await fetchTechnicianWorkload(supabase);
  const metrics = kpis ?? {
    clients: 0,
    sites: 0,
    jobs: { scheduled: 0, inProgress: 0, awaitingReview: 0, underReview: 0, completed: 0, dueNext30Days: 0, overdue: 0 },
    reports: { generated: 0, reviewed: 0, issued: 0 },
    attention: { criticalFindings: 0, openFindings: 0 }
  };

  return (
    <div className="dashboard-page">
      <OperationsInbox now={new Date().toISOString()} requests={inboxRequests ?? []} jobs={inboxJobs ?? []} reports={inboxReports ?? []} />
      <section className={`dashboard-attention ${metrics.attention.criticalFindings > 0 || metrics.jobs.overdue > 0 ? "dashboard-attention-alert" : ""}`} aria-label="Management attention summary">
        <div>
          <strong>{metrics.attention.criticalFindings + metrics.jobs.overdue + metrics.jobs.awaitingReview + metrics.reports.reviewed} active management item{metrics.attention.criticalFindings + metrics.jobs.overdue + metrics.jobs.awaitingReview + metrics.reports.reviewed === 1 ? "" : "s"}</strong>
          <span>Review the queues below to keep field work and client delivery moving.</span>
        </div>
        <Link href="/maintenance" className="dashboard-action-link">Open operations</Link>
      </section>
      <section>
        <div className="dashboard-section-heading"><div><h2>Operational snapshot</h2><p>Current workload across the organisation.</p></div><Link href="/maintenance" className="dashboard-action-link">View all jobs</Link></div>
        <div className="dashboard-metrics">
        <MetricCard href="/maintenance?status=SCHEDULED" label="Scheduled Jobs" value={metrics.jobs.scheduled} note="Assigned or ready to start" />
        <MetricCard href="/maintenance?status=IN_PROGRESS" label="In Progress" value={metrics.jobs.inProgress} note="Active technician work" />
        <MetricCard href="/maintenance?status=SUBMITTED" label="Awaiting Review" value={metrics.jobs.awaitingReview} note="Submitted from field" />
        <MetricCard href="/maintenance?status=UNDER_REVIEW" label="Ready for Report" value={metrics.jobs.underReview} note="Management review started" />
        <MetricCard href="/maintenance?status=COMPLETED" label="Completed Jobs" value={metrics.jobs.completed} note="Closed after issue" />
        <MetricCard href="/maintenance" label="Due Next 30 Days" value={metrics.jobs.dueNext30Days} note="Scheduled maintenance window" />
        <MetricCard href="/maintenance" label="Overdue Jobs" value={metrics.jobs.overdue} note="Needs management attention" />
        <MetricCard href="/reports?status=ISSUED" label="Issued Reports" value={metrics.reports.issued} note="Visible to clients" />
        <MetricCard href="/reports?status=GENERATED" label="Generated Reports" value={metrics.reports.generated} note="Needs report review" />
        <MetricCard href="/reports?status=REVIEWED" label="Reviewed Reports" value={metrics.reports.reviewed} note="Ready to issue" />
        <MetricCard href="/clients" label="Clients" value={metrics.clients} note={`${metrics.sites} active site${metrics.sites === 1 ? "" : "s"}`} />
        <MetricCard href="/maintenance" label="Critical Findings" value={metrics.attention.criticalFindings} note={`${metrics.attention.openFindings} open finding${metrics.attention.openFindings === 1 ? "" : "s"}`} />
        </div>
      </section>
      {error ? <EmptyState title="Operational metrics unavailable" message="The dashboard could not load current operational counts." /> : null}
      {queuesError ? <EmptyState title="Management queues unavailable" message="Actionable work could not be loaded." /> : null}
      {scheduleError ? <EmptyState title="Schedule intelligence unavailable" message="Upcoming maintenance workload could not be loaded." /> : null}
      {trendsError ? <EmptyState title="Maintenance trends unavailable" message="Maintenance history could not be loaded." /> : null}
      {workloadError ? <EmptyState title="Technician workload unavailable" message="The next 30 days of assigned work could not be loaded." /> : null}
      {schedule ? <ScheduleIntelligence data={schedule} /> : null}
      {trends ? <MaintenanceTrends data={trends} /> : null}
      {workload ? <TechnicianWorkload data={workload} /> : null}
      {queues ? (
        <section>
          <div className="dashboard-section-heading"><div><h2>Management attention</h2><p>Items that need a decision or follow-up.</p></div><Link href="/reports" className="dashboard-action-link">Open reports</Link></div>
          <div className="dashboard-queues">
          <AttentionQueue title="Overdue jobs" empty="No overdue jobs." items={queues.overdueJobs.map((job) => ({
            href: `/maintenance/${job.id}`,
            title: job.jobNumber,
            detail: `${job.clientName} / ${job.siteName} · due ${job.scheduledDate}`
          }))} />
          <AttentionQueue title="Submitted for review" empty="No submitted jobs waiting for review." items={queues.submittedJobs.map((job) => ({
            href: `/maintenance/${job.id}`,
            title: job.jobNumber,
            detail: `${job.clientName} / ${job.siteName} · ${job.scheduledDate}`
          }))} />
          <AttentionQueue title="Critical findings" empty="No open critical findings." items={queues.criticalFindings.map((finding) => ({
            href: `/maintenance/${finding.jobId}`,
            title: finding.title,
            detail: `${finding.clientName} · ${finding.jobNumber}`
          }))} />
          <AttentionQueue title="Reports ready to issue" empty="No reviewed reports waiting for issue." items={queues.reviewedReports.map((report) => ({
            href: `/reports/${report.id}`,
            title: report.reportNumber,
            detail: `${report.title ?? "Maintenance report"} · ${report.jobNumber}`
          }))} />
          </div>
        </section>
      ) : null}
      <div className="dashboard-footer-actions"><Link href="/equipment" className="dashboard-action-link">Open asset register</Link><Link href="/clients" className="dashboard-action-link">Manage clients and sites</Link></div>
    </div>
  );
}

function ScheduleIntelligence({ data }: { data: NonNullable<Awaited<ReturnType<typeof fetchScheduledIntelligence>>["data"]> }) {
  return (
    <Card className="dashboard-panel">
      <div style={{ alignItems: "baseline", display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>Scheduled maintenance intelligence</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0.35rem 0 0" }}>
            Active workload by timing window and maintenance frequency.
          </p>
        </div>
        <Link href="/maintenance" style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 700 }}>Open maintenance</Link>
      </div>
      <div className="schedule-stats">
        <ScheduleStat label="Overdue" value={data.windows.overdue} />
        <ScheduleStat label="Next 7 days" value={data.windows.next7Days} />
        <ScheduleStat label="Days 8–30" value={data.windows.next30Days} />
        <ScheduleStat label="Days 31–90" value={data.windows.later} />
      </div>
      <div className="schedule-details">
        <div>
          <strong>Overdue ageing</strong>
          <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 4 }}>
            {data.ageing.oldestOverdueDate ? `Oldest active job: ${data.ageing.oldestOverdueDate} (${data.ageing.oldestOverdueDays} days)` : "No overdue active jobs."}
          </div>
        </div>
        <div>
          <strong>Frequency mix</strong>
          <div style={{ color: "var(--muted)", display: "flex", flexWrap: "wrap", fontSize: "0.875rem", gap: "0.5rem", marginTop: 4 }}>
            {data.frequencies.length > 0 ? data.frequencies.map((item) => <span key={item.frequency}>{item.frequency}: {item.count}</span>) : <span>No active scheduled work.</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ScheduleStat({ label, value }: { label: string; value: number }) {
  return <div className="schedule-stat"><div>{label}</div><strong>{value}</strong></div>;
}

function MaintenanceTrends({ data }: { data: NonNullable<Awaited<ReturnType<typeof fetchMaintenanceTrends>>["data"]> }) {
  const max = Math.max(...data.completedByMonth.map((item) => item.count), 1);
  return (
    <Card className="dashboard-panel">
      <div className="dashboard-section-heading">
        <div><h2>Maintenance history</h2><p>Recent completed work and finding patterns.</p></div>
        <Link href="/maintenance?status=COMPLETED" className="dashboard-action-link">View completed work</Link>
      </div>
      <div className="trend-months" aria-label="Completed jobs by month">
        {data.completedByMonth.map((item) => <div key={item.month} className="trend-month"><div className="trend-bar-track"><div className="trend-bar" style={{ height: `${Math.max((item.count / max) * 100, item.count ? 12 : 0)}%` }} /></div><strong>{item.count}</strong><span>{item.month}</span></div>)}
      </div>
      <div className="schedule-details">
        <div><strong>Finding severity mix</strong><div className="trend-inline-list">{data.findingsBySeverity.length ? data.findingsBySeverity.map((item) => <span key={item.severity}>{item.severity}: {item.count}</span>) : <span>No findings recorded.</span>}</div></div>
        <div><strong>Unresolved findings</strong><div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 4 }}>{data.unresolved.count ? `${data.unresolved.count} open or in progress; oldest is ${data.unresolved.oldestDays} days old.` : "No unresolved findings."}</div></div>
      </div>
    </Card>
  );
}

function TechnicianWorkload({ data }: { data: NonNullable<Awaited<ReturnType<typeof fetchTechnicianWorkload>>["data"]> }) {
  return (
    <Card className="dashboard-panel">
      <div className="dashboard-section-heading"><div><h2>Technician workload</h2><p>Assigned operational work in the next 30 days.</p></div><Link href="/maintenance" className="dashboard-action-link">Manage assignments</Link></div>
      <div className="workload-list">
        {data.technicians.length ? data.technicians.map((technician) => (
          <div key={technician.id} className="workload-row"><strong>{technician.name}</strong><span>{technician.total} job{technician.total === 1 ? "" : "s"}</span><small>Scheduled {technician.scheduled} · Active {technician.active} · Review {technician.review}</small></div>
        )) : <p style={{ color: "var(--muted)", margin: 0 }}>No active technicians found.</p>}
      </div>
      <div className="workload-summary"><span>Unassigned work: <strong>{data.unassigned}</strong></span><span>Window total: <strong>{data.total}</strong></span></div>
    </Card>
  );
}

function AttentionQueue({
  title,
  empty,
  items
}: {
  title: string;
  empty: string;
  items: Array<{ href: string; title: string; detail: string }>;
}) {
  return (
    <Card className="dashboard-panel">
      <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>{title}</h2>
      {items.length === 0 ? (
        <p style={{ color: "var(--muted)", margin: 0 }}>{empty}</p>
      ) : (
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {items.map((item) => (
            <Link key={`${item.href}-${item.title}`} href={item.href} style={{ color: "inherit", textDecoration: "none" }}>
              <strong style={{ display: "block", fontSize: "0.9rem" }}>{item.title}</strong>
              <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{item.detail}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
