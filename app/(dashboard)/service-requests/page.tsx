import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { serviceRequestCategoryLabels, serviceRequestStatusLabels, serviceRequestUrgencyLabels } from "@/lib/service-requests/constants";
import { createClient } from "@/lib/supabase/server";
import { setPublicRequestIntake } from "@/app/(dashboard)/service-requests/actions";

const requestPhases = [
  { key: "all", label: "All active", statuses: [] },
  { key: "intake", label: "New intake", statuses: ["NEW"] },
  { key: "triage", label: "Triage", statuses: ["TRIAGE", "NEEDS_CUSTOMER_INFO"] },
  { key: "scope", label: "Scope and quote", statuses: ["SITE_VISIT_TO_ARRANGE", "QUOTE_PREPARATION", "AWAITING_CUSTOMER_DECISION"] },
  { key: "delivery", label: "Approved / delivery", statuses: ["APPROVED", "READY_TO_SCHEDULE", "SCHEDULED", "IN_PROGRESS"] },
  { key: "closed", label: "Closed history", statuses: ["COMPLETED", "CLOSED", "DECLINED", "CANCELLED", "UNABLE_TO_PROCEED", "CLOSED_WITHOUT_WORK"] }
] as const;

function ageLabel(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  return hours < 24 ? `${hours}h old` : `${Math.floor(hours / 24)}d old`;
}

function isOverdue(value: string) {
  return Date.now() - new Date(value).getTime() > 86_400_000;
}

export default async function ServiceRequestsPage({ searchParams }: { searchParams: Promise<{ error?: string; "intake-error"?: string; "intake-updated"?: string; phase?: string; urgency?: string; overdue?: string; owner?: string; page?: string; sort?: string }> }) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const selectedPhase = requestPhases.some((phase) => phase.key === params.phase) ? params.phase ?? "all" : "all";
  const supabase = await createClient();
  const { data: requests, error } = await supabase.from("service_requests")
    .select("id,request_reference,title,category,status,urgency,updated_at,next_action,site_id,client_id,requester_email,requester_name,requester_company,site_description")
    .order("updated_at", { ascending: false });
  const clientIds = [...new Set(requests?.map((request) => request.client_id).filter((id): id is string => Boolean(id)) ?? [])];
  const siteIds = [...new Set(requests?.map((request) => request.site_id).filter((id): id is string => Boolean(id)) ?? [])];
  const [{ data: clients }, { data: sites }] = await Promise.all([
    clientIds.length ? supabase.from("clients").select("id,name").in("id", clientIds) : Promise.resolve({ data: [] }),
    siteIds.length ? supabase.from("sites").select("id,name").in("id", siteIds) : Promise.resolve({ data: [] })
  ]);
  const clientNames = new Map(clients?.map((client) => [client.id, client.name]) ?? []);
  const siteNames = new Map(sites?.map((site) => [site.id, site.name]) ?? []);
  const { data: organisation } = await supabase.from("organisations").select("public_request_enabled").eq("id", profile.organisation_id).maybeSingle();
  const activeRequests = requests?.filter((request) => !["CLOSED", "DECLINED", "CANCELLED", "UNABLE_TO_PROCEED", "CLOSED_WITHOUT_WORK"].includes(request.status)) ?? [];
  const selectedPhaseDefinition = requestPhases.find((phase) => phase.key === selectedPhase) ?? requestPhases[0];
  const phaseRequests = selectedPhase === "all"
    ? activeRequests
    : (requests ?? []).filter((request) => selectedPhaseDefinition.statuses.includes(request.status as never));
  const visibleRequests = phaseRequests.filter((request) => {
    const matchesUrgency = params.urgency === "URGENT" ? request.urgency === "URGENT" : true;
    const matchesOverdue = params.overdue === "true" ? isOverdue(request.updated_at) : true;
    const matchesOwner = params.owner === "unassigned" ? !request.next_action : true;
    return matchesUrgency && matchesOverdue && matchesOwner;
  });
  const queueFilterLabel = params.urgency === "URGENT" ? "Urgent requests" : params.overdue === "true" ? "Overdue response" : params.owner === "unassigned" ? "Needs owner" : selectedPhaseDefinition.label;
  const phaseCount = (phase: (typeof requestPhases)[number]) => phase.key === "all" ? activeRequests.length : (requests ?? []).filter((request) => phase.statuses.includes(request.status as never)).length;
  const pageSize = 50;
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(visibleRequests.length / pageSize)));
  const selectedSort = ["updated_desc", "urgency_desc", "reference_asc"].includes(params.sort ?? "") ? params.sort ?? "updated_desc" : "updated_desc";
  const sortedRequests = [...visibleRequests].sort((left, right) => {
    if (selectedSort === "urgency_desc") return ({ URGENT: 0, PRIORITY: 1, ROUTINE: 2 }[left.urgency] ?? 3) - ({ URGENT: 0, PRIORITY: 1, ROUTINE: 2 }[right.urgency] ?? 3);
    if (selectedSort === "reference_asc") return left.request_reference.localeCompare(right.request_reference);
    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
  const pagedRequests = sortedRequests.slice((page - 1) * pageSize, page * pageSize);
  const paginationQuery = { phase: params.phase, urgency: params.urgency, overdue: params.overdue, owner: params.owner, sort: selectedSort };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Service requests" description="Move customer work from intake through triage, quotation, delivery, and closure." />
      <div className="register-summary"><strong>{activeRequests.length} active requests</strong><span>{phaseCount(requestPhases[1])} new · {phaseCount(requestPhases[2])} in triage · {phaseCount(requestPhases[4])} in delivery</span></div>
      {params.error ? <Card role="alert">The update could not be saved. Check the request’s allowed status path and try again.</Card> : null}
      {params["intake-error"] ? <Card role="alert">Public intake could not be changed. Another organisation may already have it enabled.</Card> : null}
      {params["intake-updated"] ? <Card role="status">Public request intake setting updated.</Card> : null}
      <Card style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div><strong>Public request form</strong><p style={{ margin: "0.35rem 0 0" }}>{organisation?.public_request_enabled ? "Enabled at /request. No registration or verification code is required; customers receive a secure tracking reference after submission." : "Disabled. Enable this when the public FAST request page is ready."}</p></div>
        <form action={setPublicRequestIntake}><input type="hidden" name="enabled" value={organisation?.public_request_enabled ? "false" : "true"} /><Button type="submit" variant="secondary">{organisation?.public_request_enabled ? "Disable intake" : "Enable intake"}</Button></form>
      </Card>
      {error ? <Card role="alert">Requests could not be loaded. Please retry.</Card> : null}
      <div className="workflow-section-heading workflow-section-heading-spaced"><div><span className="record-card-kicker">REQUEST QUEUE</span><h2 style={{ margin: "0.25rem 0 0" }}>{queueFilterLabel}</h2><p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>Open a request to update its status, owner, customer message, and next action.</p></div><span className="record-status">{visibleRequests.length} request{visibleRequests.length === 1 ? "" : "s"}</span></div>
      <nav className="technician-tabs" aria-label="Request phases">
        {requestPhases.map((phase) => <Link className={selectedPhase === phase.key ? "technician-tab-active" : undefined} href={phase.key === "all" ? "/service-requests" : `/service-requests?phase=${phase.key}`} key={phase.key}>{phase.label} ({phaseCount(phase)})</Link>)}
      </nav>
      <form className="table-toolbar" method="get">
        {params.phase ? <input name="phase" type="hidden" value={params.phase} /> : null}
        {params.urgency ? <input name="urgency" type="hidden" value={params.urgency} /> : null}
        {params.overdue ? <input name="overdue" type="hidden" value={params.overdue} /> : null}
        {params.owner ? <input name="owner" type="hidden" value={params.owner} /> : null}
        <label>Sort requests<select name="sort" defaultValue={selectedSort}><option value="updated_desc">Latest update</option><option value="urgency_desc">Urgency</option><option value="reference_asc">Reference</option></select></label>
        <Button type="submit" variant="secondary">Apply sort</Button>
      </form>
      {!error && !visibleRequests.length ? <EmptyState title="No requests in this phase" message="New customer work will appear here when it enters this queue." /> : null}
      <Card className="table-scroll queue-table-card" style={{ padding: 0 }}>
        <table className="data-table queue-table responsive-detail-table" aria-label="Service request queue">
          <thead><tr><th>Request</th><th>Customer / site</th><th>Type</th><th>Urgency</th><th>Status</th><th>Next action</th><th /></tr></thead>
          <tbody>{pagedRequests.map((request) => <tr key={request.id}>
            <td className="queue-primary-cell" data-label="Request"><Link href={`/service-requests/${request.id}`}><strong>{request.request_reference}</strong><span>{request.title}</span></Link><small>{ageLabel(request.updated_at)}</small></td>
            <td data-label="Customer / site"><strong>{request.requester_company ?? clientNames.get(request.client_id ?? "") ?? "Unmatched company"}</strong><span>{siteNames.get(request.site_id ?? "") ?? request.site_description ?? "Unmatched site"}</span><small>{request.requester_name} · {request.requester_email}</small></td>
            <td data-label="Type">{serviceRequestCategoryLabels[request.category]}</td>
            <td data-label="Urgency">{serviceRequestUrgencyLabels[request.urgency]}</td>
            <td data-label="Status"><StatusBadge>{serviceRequestStatusLabels[request.status]}</StatusBadge></td>
            <td className="queue-next-action" data-label="Next action">{request.next_action ?? "Assign an owner and define the next action."}</td>
            <td data-label="Open"><Link className="maintenance-action-link" href={`/service-requests/${request.id}`}>Open</Link></td>
          </tr>)}</tbody>
        </table>
      </Card>
      <PaginationControls basePath="/service-requests" page={page} pageSize={pageSize} query={paginationQuery} total={visibleRequests.length} />
    </div>
  );
}
