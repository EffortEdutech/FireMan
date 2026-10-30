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

const activeRequestStatuses = ["NEW", "TRIAGE", "NEEDS_CUSTOMER_INFO", "SITE_VISIT_TO_ARRANGE", "QUOTE_PREPARATION", "AWAITING_CUSTOMER_DECISION", "APPROVED", "READY_TO_SCHEDULE", "SCHEDULED", "IN_PROGRESS"] as const;

function ageLabel(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  return hours < 24 ? `${hours}h old` : `${Math.floor(hours / 24)}d old`;
}

function overdueCutoffIso() {
  return new Date(Date.now() - 86_400_000).toISOString();
}

export default async function ServiceRequestsPage({ searchParams }: { searchParams: Promise<{ error?: string; "intake-error"?: string; "intake-updated"?: string; phase?: string; urgency?: string; overdue?: string; owner?: string; page?: string; sort?: string; search?: string }> }) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const selectedPhase = requestPhases.some((phase) => phase.key === params.phase) ? params.phase ?? "all" : "all";
  const supabase = await createClient();
  const pageSize = 50;
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const searchTerm = (params.search ?? "").trim();
  const selectedSort = ["updated_desc", "urgency_desc", "reference_asc"].includes(params.sort ?? "") ? params.sort ?? "updated_desc" : "updated_desc";
  const selectedPhaseDefinition = requestPhases.find((phase) => phase.key === selectedPhase) ?? requestPhases[0];
  const requestQuery = supabase.from("service_requests")
    .select("id,request_reference,title,category,status,urgency,updated_at,next_action,site_id,client_id,requester_email,requester_name,requester_company,site_description")
    .order(selectedSort === "reference_asc" ? "request_reference" : selectedSort === "urgency_desc" ? "urgency" : "updated_at", { ascending: selectedSort === "reference_asc" || selectedSort === "urgency_desc" ? true : false })
    .range((requestedPage - 1) * pageSize, requestedPage * pageSize - 1);
  if (selectedPhase === "all") requestQuery.in("status", activeRequestStatuses);
  else requestQuery.in("status", selectedPhaseDefinition.statuses);
  if (params.urgency === "URGENT") requestQuery.eq("urgency", "URGENT");
  if (params.overdue === "true") requestQuery.lt("updated_at", overdueCutoffIso());
  if (params.owner === "unassigned") requestQuery.is("next_action", null);
  if (searchTerm) {
    const safeSearch = searchTerm.replaceAll(",", " ").replaceAll("(", " ").replaceAll(")", "");
    requestQuery.or(["request_reference", "title", "requester_name", "requester_email", "requester_company"].map((field) => `${field}.ilike.%${safeSearch}%`).join(","));
  }
  const { data: requests, error, count: requestCount } = await requestQuery;
  const clientIds = [...new Set(requests?.map((request) => request.client_id).filter((id): id is string => Boolean(id)) ?? [])];
  const siteIds = [...new Set(requests?.map((request) => request.site_id).filter((id): id is string => Boolean(id)) ?? [])];
  const [{ data: clients }, { data: sites }] = await Promise.all([
    clientIds.length ? supabase.from("clients").select("id,name").in("id", clientIds) : Promise.resolve({ data: [] }),
    siteIds.length ? supabase.from("sites").select("id,name").in("id", siteIds) : Promise.resolve({ data: [] })
  ]);
  const clientNames = new Map(clients?.map((client) => [client.id, client.name]) ?? []);
  const siteNames = new Map(sites?.map((site) => [site.id, site.name]) ?? []);
  const { data: organisation } = await supabase.from("organisations").select("public_request_enabled").eq("id", profile.organisation_id).maybeSingle();
  const visibleRequests = requests ?? [];
  const queueFilterLabel = params.urgency === "URGENT" ? "Urgent requests" : params.overdue === "true" ? "Overdue response" : params.owner === "unassigned" ? "Needs owner" : selectedPhaseDefinition.label;
  const [activeCountResult, ...phaseCountResults] = await Promise.all([
    supabase.from("service_requests").select("id", { count: "exact", head: true }).in("status", activeRequestStatuses),
    ...requestPhases.slice(1).map((phase) => supabase.from("service_requests").select("id", { count: "exact", head: true }).in("status", phase.statuses))
  ]);
  const phaseCounts = new Map(requestPhases.map((phase, index) => [phase.key, phase.key === "all" ? activeCountResult.count ?? 0 : phaseCountResults[index - 1]?.count ?? 0]));
  const phaseCount = (phase: (typeof requestPhases)[number]) => phaseCounts.get(phase.key) ?? 0;
  const page = requestedPage;
  const pagedRequests = visibleRequests;
  const paginationQuery = { phase: params.phase, urgency: params.urgency, overdue: params.overdue, owner: params.owner, sort: selectedSort, search: params.search };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Service requests" description="Move customer work from intake through triage, quotation, delivery, and closure." />
      <div className="register-summary"><strong>{phaseCount(requestPhases[0])} active requests</strong><span>{phaseCount(requestPhases[1])} new · {phaseCount(requestPhases[2])} in triage · {phaseCount(requestPhases[4])} in delivery</span></div>
      {params.error ? <Card role="alert">The update could not be saved. Check the request’s allowed status path and try again.</Card> : null}
      {params["intake-error"] ? <Card role="alert">Public intake could not be changed. Another organisation may already have it enabled.</Card> : null}
      {params["intake-updated"] ? <Card role="status">Public request intake setting updated.</Card> : null}
      <Card style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div><strong>Public request form</strong><p style={{ margin: "0.35rem 0 0" }}>{organisation?.public_request_enabled ? "Enabled at /request. No registration or verification code is required; customers receive a secure tracking reference after submission." : "Disabled. Enable this when the public FAST request page is ready."}</p></div>
        <form action={setPublicRequestIntake}><input type="hidden" name="enabled" value={organisation?.public_request_enabled ? "false" : "true"} /><Button type="submit" variant="secondary">{organisation?.public_request_enabled ? "Disable intake" : "Enable intake"}</Button></form>
      </Card>
      {error ? <Card role="alert">Requests could not be loaded. Please retry.</Card> : null}
      <div className="workflow-section-heading workflow-section-heading-spaced"><div><span className="record-card-kicker">REQUEST QUEUE</span><h2 style={{ margin: "0.25rem 0 0" }}>{queueFilterLabel}</h2><p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>Open a request to update its status, owner, customer message, and next action.</p></div><span className="record-status">{requestCount ?? 0} request{requestCount === 1 ? "" : "s"}</span></div>
      <nav className="technician-tabs" aria-label="Request phases">
        {requestPhases.map((phase) => <Link className={selectedPhase === phase.key ? "technician-tab-active" : undefined} href={phase.key === "all" ? "/service-requests" : `/service-requests?phase=${phase.key}`} key={phase.key}>{phase.label} ({phaseCount(phase)})</Link>)}
      </nav>
      <form className="table-toolbar" method="get">
        {params.phase ? <input name="phase" type="hidden" value={params.phase} /> : null}
        {params.urgency ? <input name="urgency" type="hidden" value={params.urgency} /> : null}
        {params.overdue ? <input name="overdue" type="hidden" value={params.overdue} /> : null}
        {params.owner ? <input name="owner" type="hidden" value={params.owner} /> : null}
        <label>Find requests<input name="search" defaultValue={params.search ?? ""} placeholder="Reference, title, requester" /></label>
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
      <PaginationControls basePath="/service-requests" page={page} pageSize={pageSize} query={paginationQuery} total={requestCount ?? 0} />
    </div>
  );
}
