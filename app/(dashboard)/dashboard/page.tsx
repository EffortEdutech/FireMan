import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
import { OperationsInbox } from "@/components/dashboard/operations-inbox";
import { createClient } from "@/lib/supabase/server";
import { fetchOperationalKpis } from "@/lib/dashboard/operational-kpis";

function PriorityMetric({ href, label, value, note, alert = false }: { href: string; label: string; value: number; note: string; alert?: boolean }) {
  return <Link className={`dashboard-priority-metric ${alert ? "dashboard-priority-metric-alert" : ""}`} href={href}><span>{label}</span><strong>{value}</strong><small>{note}</small></Link>;
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
  const metrics = kpis ?? {
    clients: 0,
    sites: 0,
    jobs: { scheduled: 0, inProgress: 0, awaitingReview: 0, underReview: 0, completed: 0, dueNext30Days: 0, overdue: 0 },
    reports: { generated: 0, reviewed: 0, issued: 0 },
    attention: { criticalFindings: 0, openFindings: 0 }
  };
  const activeItems = metrics.jobs.overdue + metrics.jobs.awaitingReview + metrics.reports.generated + metrics.reports.reviewed + metrics.attention.criticalFindings;

  return (
    <div className="dashboard-page dashboard-command-page">
      <header className="dashboard-command-header">
        <div><p className="page-kicker">FAST COMMAND CENTER</p><h1>Operations Dashboard</h1><p>Start with work that needs a decision, assignment, or follow-up today.</p></div>
        <div className="dashboard-command-actions"><Link className="button" href="/service-requests">Service requests</Link><Link className="dashboard-action-link" href="/maintenance">Maintenance workspace</Link></div>
      </header>

      <section className={`dashboard-attention ${activeItems > 0 ? "dashboard-attention-alert" : ""}`} aria-label="Immediate action summary">
        <div><strong>{activeItems} active management item{activeItems === 1 ? "" : "s"}</strong><span>Use the console below to select work and open its full workspace.</span></div>
        <Link href="/reports" className="dashboard-action-link">Review reports</Link>
      </section>

      <section aria-labelledby="priority-title">
        <div className="dashboard-section-heading"><div><h2 id="priority-title">Priority workload</h2><p>Only the counts that help you decide what to do next.</p></div><Link href="/reports" className="dashboard-action-link">Open reports</Link></div>
        <div className="dashboard-priority-grid">
          <PriorityMetric href="/maintenance" label="Overdue jobs" value={metrics.jobs.overdue} note="Needs management attention" alert />
          <PriorityMetric href="/maintenance?status=SUBMITTED" label="Field review" value={metrics.jobs.awaitingReview} note="Submitted by technicians" />
          <PriorityMetric href="/reports?status=GENERATED" label="Reports to review" value={metrics.reports.generated} note="Content needs approval" />
          <PriorityMetric href="/reports?status=REVIEWED" label="Reports to issue" value={metrics.reports.reviewed} note="Approved for client delivery" />
          <PriorityMetric href="/maintenance" label="Critical findings" value={metrics.attention.criticalFindings} note={`${metrics.attention.openFindings} open finding${metrics.attention.openFindings === 1 ? "" : "s"}`} alert />
          <PriorityMetric href="/clients" label="Active clients" value={metrics.clients} note={`${metrics.sites} active site${metrics.sites === 1 ? "" : "s"}`} />
        </div>
      </section>

      {error ? <EmptyState title="Operational metrics unavailable" message="The dashboard could not load current priority counts." /> : null}
      <OperationsInbox now={new Date().toISOString()} requests={inboxRequests ?? []} jobs={inboxJobs ?? []} reports={inboxReports ?? []} />

      <section className="dashboard-secondary-workspaces" aria-labelledby="workspace-title">
        <div><h2 id="workspace-title">Open a dedicated workspace</h2><p>Use these pages for detailed records, planning, and historical analysis.</p></div>
        <div className="dashboard-footer-actions"><Link className="dashboard-action-link" href="/maintenance">Maintenance pipeline</Link><Link className="dashboard-action-link" href="/reports">Reports review</Link><Link className="dashboard-action-link" href="/equipment">Equipment register</Link><Link className="dashboard-action-link" href="/clients">Clients and sites</Link></div>
      </section>
    </div>
  );
}
