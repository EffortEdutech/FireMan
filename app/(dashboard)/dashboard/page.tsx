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

type DashboardView = "operations" | "overview" | "maintenance" | "history" | "technicians" | "attention";
const dashboardViews: Array<[DashboardView, string]> = [["operations", "Operations"], ["overview", "Overview"], ["maintenance", "Maintenance intelligence"], ["history", "Maintenance history"], ["technicians", "Technician workload"], ["attention", "Management attention"]];

function MetricCard({ href, label, value, note }: { href?: string; label: string; value: number | null; note?: string }) {
  const content = <><div style={{ color: "var(--muted)" }}>{label}</div><strong style={{ display: "block", fontSize: "2rem", marginTop: 8 }}>{value ?? 0}</strong>{note ? <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 6 }}>{note}</div> : null}</>;
  return <Card>{href ? <Link href={href} style={{ color: "inherit", display: "block", textDecoration: "none" }}>{content}</Link> : content}</Card>;
}

function PriorityMetric({ href, label, value, note, alert = false }: { href: string; label: string; value: number; note: string; alert?: boolean }) {
  return <Link className={`dashboard-priority-metric ${alert ? "dashboard-priority-metric-alert" : ""}`} href={href}><span>{label}</span><strong>{value}</strong><small>{note}</small></Link>;
}

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ view?: string }> }) {
  const supabase = await createClient();
  const requestedView = (await searchParams)?.view;
  const view: DashboardView = dashboardViews.some(([key]) => key === requestedView) ? requestedView as DashboardView : "operations";
  const [{ data: inboxRequests }, { data: inboxJobs }, { data: inboxReports }] = await Promise.all([
    supabase.from("service_requests").select("id,request_reference,title,category,status,urgency,requester_company,site_description,next_action,updated_at").order("updated_at", { ascending: true }).range(0, 49),
    supabase.from("maintenance_jobs").select("id,job_number,status,scheduled_date,clients(name),sites(name)").order("scheduled_date", { ascending: true }).range(0, 49),
    supabase.from("reports").select("id,report_number,title,status,maintenance_jobs(job_number,clients(name),sites(name))").order("created_at", { ascending: true }).range(0, 49)
  ]);
  const [{ data: kpis, error }, { data: queues, error: queuesError }, { data: schedule, error: scheduleError }, { data: trends, error: trendsError }, { data: workload, error: workloadError }] = await Promise.all([
    fetchOperationalKpis(supabase), fetchAttentionQueues(supabase), fetchScheduledIntelligence(supabase), fetchMaintenanceTrends(supabase), fetchTechnicianWorkload(supabase)
  ]);
  const metrics = kpis ?? { clients: 0, sites: 0, jobs: { scheduled: 0, inProgress: 0, awaitingReview: 0, underReview: 0, completed: 0, dueNext30Days: 0, overdue: 0 }, reports: { generated: 0, reviewed: 0, issued: 0 }, attention: { criticalFindings: 0, openFindings: 0 } };
  const activeItems = metrics.jobs.overdue + metrics.jobs.awaitingReview + metrics.reports.generated + metrics.reports.reviewed + metrics.attention.criticalFindings;

  return <div className="dashboard-page dashboard-command-page">
    <header className="dashboard-command-header"><div><p className="page-kicker">FAST COMMAND CENTER</p><h1>Operations Dashboard</h1><p>Choose a work area. Each view stays focused so important information is easy to find.</p></div></header>
    <nav className="dashboard-view-tabs" aria-label="Dashboard work areas">{dashboardViews.map(([key, label]) => <Link className={view === key ? "dashboard-view-tab-active" : ""} href={`/dashboard?view=${key}`} key={key}>{label}{key === "attention" ? <b>{activeItems}</b> : null}</Link>)}</nav>
    {error ? <EmptyState title="Operational metrics unavailable" message="The dashboard could not load current priority counts." /> : null}
    {queuesError ? <EmptyState title="Management queues unavailable" message="Actionable work could not be loaded." /> : null}
    {scheduleError ? <EmptyState title="Schedule intelligence unavailable" message="Upcoming maintenance workload could not be loaded." /> : null}
    {trendsError ? <EmptyState title="Maintenance trends unavailable" message="Maintenance history could not be loaded." /> : null}
    {workloadError ? <EmptyState title="Technician workload unavailable" message="The next 30 days of assigned work could not be loaded." /> : null}
    {view === "operations" ? <>
      <section className={`dashboard-attention ${activeItems > 0 ? "dashboard-attention-alert" : ""}`} aria-label="Immediate action summary"><div><strong>{activeItems} active management item{activeItems === 1 ? "" : "s"}</strong><span>Use the console below to select work and open its full workspace.</span></div><Link href="/reports" className="dashboard-action-link">Review reports</Link></section>
      <section aria-labelledby="priority-title"><div className="dashboard-section-heading"><div><h2 id="priority-title">Priority workload</h2><p>Only the counts that help you decide what to do next.</p></div><Link href="/reports" className="dashboard-action-link">Open reports</Link></div><div className="dashboard-priority-grid"><PriorityMetric href="/maintenance" label="Overdue jobs" value={metrics.jobs.overdue} note="Needs management attention" alert /><PriorityMetric href="/maintenance?status=SUBMITTED" label="Field review" value={metrics.jobs.awaitingReview} note="Submitted by technicians" /><PriorityMetric href="/reports?status=GENERATED" label="Reports to review" value={metrics.reports.generated} note="Content needs approval" /><PriorityMetric href="/reports?status=REVIEWED" label="Reports to issue" value={metrics.reports.reviewed} note="Approved for client delivery" /><PriorityMetric href="/maintenance" label="Critical findings" value={metrics.attention.criticalFindings} note={`${metrics.attention.openFindings} open finding${metrics.attention.openFindings === 1 ? "" : "s"}`} alert /><PriorityMetric href="/clients" label="Active clients" value={metrics.clients} note={`${metrics.sites} active site${metrics.sites === 1 ? "" : "s"}`} /></div></section>
      <OperationsInbox now={new Date().toISOString()} requests={inboxRequests ?? []} jobs={inboxJobs ?? []} reports={inboxReports ?? []} />
    </> : null}
    {view === "overview" ? <Overview metrics={metrics} /> : null}
    {view === "maintenance" && schedule ? <ScheduleIntelligence data={schedule} /> : null}
    {view === "history" && trends ? <MaintenanceTrends data={trends} /> : null}
    {view === "technicians" && workload ? <TechnicianWorkload data={workload} /> : null}
    {view === "attention" && queues ? <ManagementAttention queues={queues} /> : null}
  </div>;
}

function Overview({ metrics }: { metrics: any }) {
  return <section><div className="dashboard-section-heading"><div><h2>Operational overview</h2><p>All key totals are visible here without mixing them into the active work queue.</p></div><Link href="/maintenance" className="dashboard-action-link">View all jobs</Link></div><div className="dashboard-metrics"><MetricCard href="/maintenance?status=SCHEDULED" label="Scheduled jobs" value={metrics.jobs.scheduled} note="Assigned or ready to start" /><MetricCard href="/maintenance?status=IN_PROGRESS" label="In progress" value={metrics.jobs.inProgress} note="Active technician work" /><MetricCard href="/maintenance?status=SUBMITTED" label="Awaiting review" value={metrics.jobs.awaitingReview} note="Submitted from field" /><MetricCard href="/maintenance?status=UNDER_REVIEW" label="Ready for report" value={metrics.jobs.underReview} note="Management review started" /><MetricCard href="/maintenance?status=COMPLETED" label="Completed jobs" value={metrics.jobs.completed} note="Closed after issue" /><MetricCard href="/maintenance" label="Due next 30 days" value={metrics.jobs.dueNext30Days} note="Scheduled maintenance window" /><MetricCard href="/maintenance" label="Overdue jobs" value={metrics.jobs.overdue} note="Needs management attention" /><MetricCard href="/reports?status=ISSUED" label="Issued reports" value={metrics.reports.issued} note="Visible to clients" /><MetricCard href="/reports?status=GENERATED" label="Generated reports" value={metrics.reports.generated} note="Needs report review" /><MetricCard href="/reports?status=REVIEWED" label="Reviewed reports" value={metrics.reports.reviewed} note="Ready to issue" /><MetricCard href="/clients" label="Clients" value={metrics.clients} note={`${metrics.sites} active site${metrics.sites === 1 ? "" : "s"}`} /><MetricCard href="/maintenance" label="Critical findings" value={metrics.attention.criticalFindings} note={`${metrics.attention.openFindings} open finding${metrics.attention.openFindings === 1 ? "" : "s"}`} /></div></section>;
}

function ScheduleIntelligence({ data }: { data: any }) {
  return <Card className="dashboard-panel"><div className="dashboard-section-heading"><div><h2>Scheduled maintenance intelligence</h2><p>Active workload by timing window and maintenance frequency.</p></div><Link href="/maintenance" className="dashboard-action-link">Open maintenance</Link></div><div className="schedule-stats"><ScheduleStat label="Overdue" value={data.windows.overdue} /><ScheduleStat label="Next 7 days" value={data.windows.next7Days} /><ScheduleStat label="Days 8–30" value={data.windows.next30Days} /><ScheduleStat label="Days 31–90" value={data.windows.later} /></div><div className="schedule-details"><div><strong>Overdue ageing</strong><div className="dashboard-muted-detail">{data.ageing.oldestOverdueDate ? `Oldest active job: ${data.ageing.oldestOverdueDate} (${data.ageing.oldestOverdueDays} days)` : "No overdue active jobs."}</div></div><div><strong>Frequency mix</strong><div className="dashboard-muted-detail">{data.frequencies.length > 0 ? data.frequencies.map((item: any) => <span key={item.frequency}>{item.frequency}: {item.count} </span>) : "No active scheduled work."}</div></div></div></Card>;
}

function ScheduleStat({ label, value }: { label: string; value: number }) { return <div className="schedule-stat"><div>{label}</div><strong>{value}</strong></div>; }

function MaintenanceTrends({ data }: { data: any }) {
  const max = Math.max(...data.completedByMonth.map((item: any) => item.count), 1);
  return <Card className="dashboard-panel"><div className="dashboard-section-heading"><div><h2>Maintenance history</h2><p>Recent completed work and finding patterns.</p></div><Link href="/maintenance?status=COMPLETED" className="dashboard-action-link">View completed work</Link></div><div className="trend-months" aria-label="Completed jobs by month">{data.completedByMonth.map((item: any) => <div key={item.month} className="trend-month"><div className="trend-bar-track"><div className="trend-bar" style={{ height: `${Math.max((item.count / max) * 100, item.count ? 12 : 0)}%` }} /></div><strong>{item.count}</strong><span>{item.month}</span></div>)}</div><div className="schedule-details"><div><strong>Finding severity mix</strong><div className="trend-inline-list">{data.findingsBySeverity.length ? data.findingsBySeverity.map((item: any) => <span key={item.severity}>{item.severity}: {item.count}</span>) : "No findings recorded."}</div></div><div><strong>Unresolved findings</strong><div className="dashboard-muted-detail">{data.unresolved.count ? `${data.unresolved.count} open or in progress; oldest is ${data.unresolved.oldestDays} days old.` : "No unresolved findings."}</div></div></div></Card>;
}

function TechnicianWorkload({ data }: { data: any }) {
  return <Card className="dashboard-panel"><div className="dashboard-section-heading"><div><h2>Technician workload</h2><p>Assigned operational work in the next 30 days.</p></div><Link href="/maintenance" className="dashboard-action-link">Manage assignments</Link></div><div className="workload-list">{data.technicians.length ? data.technicians.map((technician: any) => <div key={technician.id} className="workload-row"><strong>{technician.name}</strong><span>{technician.total} job{technician.total === 1 ? "" : "s"}</span><small>Scheduled {technician.scheduled} · Active {technician.active} · Review {technician.review}</small></div>) : <p className="dashboard-muted-detail">No active technicians found.</p>}</div><div className="workload-summary"><span>Unassigned work: <strong>{data.unassigned}</strong></span><span>Window total: <strong>{data.total}</strong></span></div></Card>;
}

function ManagementAttention({ queues }: { queues: any }) {
  const groups = [{ title: "Overdue jobs", empty: "No overdue jobs.", items: queues.overdueJobs.map((job: any) => ({ href: `/maintenance/${job.id}`, title: job.jobNumber, detail: `${job.clientName} / ${job.siteName} · due ${job.scheduledDate}` })) }, { title: "Submitted for review", empty: "No submitted jobs waiting for review.", items: queues.submittedJobs.map((job: any) => ({ href: `/maintenance/${job.id}`, title: job.jobNumber, detail: `${job.clientName} / ${job.siteName} · ${job.scheduledDate}` })) }, { title: "Critical findings", empty: "No open critical findings.", items: queues.criticalFindings.map((finding: any) => ({ href: `/maintenance/${finding.jobId}`, title: finding.title, detail: `${finding.clientName} · ${finding.jobNumber}` })) }, { title: "Reports ready to issue", empty: "No reviewed reports waiting for issue.", items: queues.reviewedReports.map((report: any) => ({ href: `/reports/${report.id}`, title: report.reportNumber, detail: `${report.title ?? "Maintenance report"} · ${report.jobNumber}` })) }];
  return <section><div className="dashboard-section-heading"><div><h2>Management attention</h2><p>Items that need a decision or follow-up.</p></div><Link href="/reports" className="dashboard-action-link">Open reports</Link></div><div className="dashboard-queues">{groups.map((group) => <AttentionQueue key={group.title} {...group} />)}</div></section>;
}

function AttentionQueue({ title, empty, items }: { title: string; empty: string; items: Array<{ href: string; title: string; detail: string }> }) {
  return <Card className="dashboard-panel"><h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>{title}</h2>{items.length === 0 ? <p className="dashboard-muted-detail">{empty}</p> : <div style={{ display: "grid", gap: "0.65rem" }}>{items.map((item) => <Link key={`${item.href}-${item.title}`} href={item.href} style={{ color: "inherit", textDecoration: "none" }}><strong style={{ display: "block", fontSize: "0.9rem" }}>{item.title}</strong><span className="dashboard-muted-detail">{item.detail}</span></Link>)}</div>}</Card>;
}
