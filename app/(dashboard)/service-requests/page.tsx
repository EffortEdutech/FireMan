import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
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

export default async function ServiceRequestsPage({ searchParams }: { searchParams: Promise<{ error?: string; "intake-error"?: string; "intake-updated"?: string; phase?: string; urgency?: string; overdue?: string; owner?: string }> }) {
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

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Service requests" description="Move customer work from intake through triage, quotation, delivery, and closure." />
      <div className="workflow-stepper" aria-label="Service request workflow">
        <div className="workflow-step workflow-step-current"><span>1</span><div><strong>Intake</strong><small>New customer request</small></div></div>
        <div className="workflow-step"><span>2</span><div><strong>Triage</strong><small>Confirm scope and owner</small></div></div>
        <div className="workflow-step"><span>3</span><div><strong>Plan and quote</strong><small>Arrange work or quotation</small></div></div>
        <div className="workflow-step"><span>4</span><div><strong>Deliver and close</strong><small>Track work and outcome</small></div></div>
      </div>
      <div className="workflow-summary-grid" aria-label="Service request summary">
        <Link className="workflow-summary-card" href="/service-requests?phase=intake"><span>New intake</span><strong>{phaseCount(requestPhases[1])}</strong><small>Needs first review</small></Link>
        <Link className="workflow-summary-card" href="/service-requests?phase=triage"><span>Triage</span><strong>{phaseCount(requestPhases[2])}</strong><small>Scope or information needed</small></Link>
        <Link className="workflow-summary-card" href="/service-requests?phase=scope"><span>Scope and quote</span><strong>{phaseCount(requestPhases[3])}</strong><small>Prepare the next decision</small></Link>
        <Link className="workflow-summary-card" href="/service-requests?phase=delivery"><span>Delivery</span><strong>{phaseCount(requestPhases[4])}</strong><small>Approved or in progress</small></Link>
      </div>
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
      {!error && !visibleRequests.length ? <EmptyState title="No requests in this phase" message="New customer work will appear here when it enters this queue." /> : null}
      <div className="record-grid" aria-label="Service request queue">
        {visibleRequests.map((request) => (
          <Card className="record-card" key={request.id}>
            <div className="record-card-heading"><div><span className="record-card-kicker">{request.request_reference}</span><h2>{request.title}</h2></div><StatusBadge>{serviceRequestStatusLabels[request.status]}</StatusBadge></div>
            <div className="record-card-facts"><div><span>Urgency</span><strong>{serviceRequestUrgencyLabels[request.urgency]}</strong></div><div><span>Age</span><strong>{ageLabel(request.updated_at)}</strong></div></div>
            <div className="record-card-contact"><span>Client / site</span><strong>{request.requester_company ?? clientNames.get(request.client_id ?? "") ?? "Unmatched company"} · {siteNames.get(request.site_id ?? "") ?? request.site_description ?? "Unmatched site"}</strong><small>{serviceRequestCategoryLabels[request.category]} · {request.requester_name} · {request.requester_email}</small></div>
            <div className="record-card-next"><span>Next action</span><strong>{request.next_action ?? "Assign an owner and define the next action."}</strong></div>
            <Link className="maintenance-action-link" href={`/service-requests/${request.id}`}>Open request workspace →</Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
