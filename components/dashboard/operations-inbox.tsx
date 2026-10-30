import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { serviceRequestCategoryLabels, serviceRequestStatusLabels, serviceRequestUrgencyLabels } from "@/lib/service-requests/constants";

type Request = {
  id: string;
  request_reference: string;
  title: string;
  category: keyof typeof serviceRequestCategoryLabels;
  status: keyof typeof serviceRequestStatusLabels;
  urgency: keyof typeof serviceRequestUrgencyLabels;
  requester_company: string | null;
  site_description: string | null;
  next_action: string | null;
  updated_at: string;
};

type Job = {
  id: string;
  job_number: string;
  status: string;
  scheduled_date: string;
  clients: { name: string } | null;
  sites: { name: string } | null;
};

type Report = {
  id: string;
  report_number: string;
  title: string | null;
  status: string;
  maintenance_jobs: { job_number: string; clients: { name: string } | null; sites: { name: string } | null } | null;
};

type OperationsInboxProps = {
  requests: Request[];
  jobs: Job[];
  reports: Report[];
  now: string;
};

function ageLabel(value: string, now: string) {
  const hours = Math.max(0, Math.floor((new Date(now).getTime() - new Date(value).getTime()) / 3_600_000));
  if (hours < 24) return `${hours}h old`;
  return `${Math.floor(hours / 24)}d old`;
}

function queueLabel(request: Request) {
  if (request.status === "NEW") return "New request";
  if (request.status === "NEEDS_CUSTOMER_INFO") return "Waiting for customer";
  if (request.status === "QUOTE_PREPARATION" || request.status === "AWAITING_CUSTOMER_DECISION") return "Quotation";
  if (request.status === "SITE_VISIT_TO_ARRANGE") return "Site visit";
  return "Service request";
}

export function OperationsInbox({ requests, jobs, reports, now }: OperationsInboxProps) {
  const activeRequests = requests.filter((request) => !["CLOSED", "DECLINED", "CANCELLED", "UNABLE_TO_PROCEED", "CLOSED_WITHOUT_WORK"].includes(request.status));
  const urgent = activeRequests.filter((request) => request.urgency === "URGENT").length;
  const waiting = activeRequests.filter((request) => request.status === "NEEDS_CUSTOMER_INFO").length;
  const unassigned = activeRequests.filter((request) => !request.next_action).length;
  const overdue = activeRequests.filter((request) => new Date(now).getTime() - new Date(request.updated_at).getTime() > 86_400_000).length;
  const queueCounts = {
    newRequests: activeRequests.filter((request) => request.status === "NEW").length,
    triage: activeRequests.filter((request) => request.status === "TRIAGE" || request.status === "NEEDS_CUSTOMER_INFO").length,
    quotations: activeRequests.filter((request) => ["QUOTE_PREPARATION", "AWAITING_CUSTOMER_DECISION"].includes(request.status)).length,
    fieldReview: jobs.filter((job) => job.status === "SUBMITTED").length,
    reports: reports.filter((report) => ["GENERATED", "REVIEWED"].includes(report.status)).length
  };
  const workItems = [
    ...activeRequests.map((request) => ({
      href: `/service-requests/${request.id}`,
      kind: queueLabel(request),
      reference: request.request_reference,
      title: request.title,
      detail: `${request.requester_company ?? "Unmatched client"} · ${request.site_description ?? "Unmatched site"}`,
      next: request.next_action ?? "Assign an owner and define the next action.",
      urgency: serviceRequestUrgencyLabels[request.urgency],
      age: ageLabel(request.updated_at, now),
      priority: request.urgency === "URGENT" ? 0 : request.urgency === "PRIORITY" ? 1 : 2
    })),
    ...jobs.filter((job) => ["SUBMITTED", "UNDER_REVIEW"].includes(job.status)).map((job) => ({
      href: `/maintenance/${job.id}`,
      kind: job.status === "SUBMITTED" ? "Field review" : "Report preparation",
      reference: job.job_number,
      title: job.status === "SUBMITTED" ? "Job submitted by technician" : "Job ready for report",
      detail: `${job.clients?.name ?? "Unmatched client"} · ${job.sites?.name ?? "Unmatched site"}`,
      next: job.status === "SUBMITTED" ? "Review field evidence and start management review." : "Review evidence and generate the report.",
      urgency: "Operational",
      age: `Scheduled ${job.scheduled_date}`,
      priority: 3
    })),
    ...reports.filter((report) => ["GENERATED", "REVIEWED"].includes(report.status)).map((report) => ({
      href: `/reports/${report.id}`,
      kind: report.status === "GENERATED" ? "Report review" : "Ready to issue",
      reference: report.report_number,
      title: report.title ?? "Maintenance report",
      detail: `${report.maintenance_jobs?.clients?.name ?? "Unmatched client"} · ${report.maintenance_jobs?.sites?.name ?? "Unmatched site"}`,
      next: report.status === "GENERATED" ? "Review the generated report." : "Issue the reviewed report to the client.",
      urgency: "Operational",
      age: report.status,
      priority: 4
    }))
  ].sort((a, b) => a.priority - b.priority);

  return (
    <section className="operations-page" aria-labelledby="operations-title">
      <div className="operations-toolbar">
        <div>
          <p className="page-kicker">FAST OPERATIONS</p>
          <h1 id="operations-title" style={{ margin: 0, fontSize: "1.75rem", lineHeight: 1.2 }}>Operations Inbox</h1>
          <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>Start here to see what needs action, who owns it, and what should happen next.</p>
        </div>
        <div className="operations-toolbar-actions">
          <Link className="dashboard-action-link" href="/service-requests">All service requests</Link>
          <Link className="dashboard-action-link" href="/maintenance">Maintenance pipeline</Link>
        </div>
      </div>

      <div className="operations-summary" aria-label="Operations summary">
        <Link className="operations-summary-card operations-summary-card-alert" href="/service-requests?urgency=URGENT"><span>Urgent requests</span><strong>{urgent}</strong><small>Needs priority action</small></Link>
        <Link className="operations-summary-card" href="/service-requests?overdue=true"><span>Overdue response</span><strong>{overdue}</strong><small>Older than target</small></Link>
        <Link className="operations-summary-card" href="/service-requests?status=NEEDS_CUSTOMER_INFO"><span>Waiting for customer</span><strong>{waiting}</strong><small>Follow up or hold</small></Link>
        <Link className="operations-summary-card" href="/service-requests?owner=unassigned"><span>Needs owner</span><strong>{unassigned}</strong><small>Assign next action</small></Link>
      </div>

      <Card>
        <div className="dashboard-section-heading">
          <div><p className="page-kicker">CURRENT WORK QUEUE</p><h2>Needs action now</h2><p>Prioritized by urgency, then by the oldest outstanding work.</p></div>
          <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{workItems.length} open item{workItems.length === 1 ? "" : "s"}</span>
        </div>
        <div className="operations-queue-tabs" aria-label="Operations queues">
          <Link className="operations-queue-tab" href="/service-requests?status=NEW">New requests <b>{queueCounts.newRequests}</b></Link>
          <Link className="operations-queue-tab" href="/service-requests?status=TRIAGE">Triage <b>{queueCounts.triage}</b></Link>
          <Link className="operations-queue-tab" href="/service-requests?status=QUOTE_PREPARATION">Quotations <b>{queueCounts.quotations}</b></Link>
          <Link className="operations-queue-tab" href="/maintenance?status=SUBMITTED">Field review <b>{queueCounts.fieldReview}</b></Link>
          <Link className="operations-queue-tab" href="/reports?status=active">Reports <b>{queueCounts.reports}</b></Link>
        </div>
        <div className="operations-worklist" style={{ marginTop: "1rem" }}>
          {workItems.length ? workItems.map((item) => (
            <Link className="operations-item" href={item.href} key={`${item.kind}-${item.reference}`}>
              <div className="operations-item-main">
                <span className="operations-item-title">{item.reference} · {item.title}</span>
                <span className="operations-item-meta">{item.kind} · {item.detail}</span>
                <span className="operations-item-next"><strong>Next:</strong> {item.next}</span>
              </div>
              <div className="operations-item-side"><StatusBadge>{item.urgency}</StatusBadge><span className="operations-item-meta">{item.age}</span><span className="operations-item-open">Open →</span></div>
            </Link>
          )) : <p className="operations-empty">No open operational items. New work will appear here.</p>}
        </div>
      </Card>
    </section>
  );
}
