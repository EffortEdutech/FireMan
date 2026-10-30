import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { replyToServiceRequestFromStaff, updateServiceRequest } from "@/app/(dashboard)/service-requests/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { serviceRequestCategoryLabels, serviceRequestStatusLabels, serviceRequestTransitions } from "@/lib/service-requests/constants";
import { createClient } from "@/lib/supabase/server";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(value));
}

function localDateTimeInput(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export default async function ManageServiceRequestPage({ params, searchParams }: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ updated?: string; replied?: string; error?: string }>;
}) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");
  const [{ requestId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: request, error: requestError } = await supabase.from("service_requests")
    .select("id,client_id,site_id,request_reference,requester_email,requester_name,requester_company,requester_phone,site_description,title,category,urgency,details,affected_asset,preferred_access_window,onsite_contact,reference_note,status,customer_message,next_action_owner,next_action,hold_reason,appointment_at,public_update_visible,updated_at")
    .eq("id", requestId).maybeSingle();
  if (requestError || !request) {
    console.error("[service-requests] staff detail lookup failed", {
      requestId,
      organisationId: profile.organisation_id,
      error: requestError?.message ?? "request-not-found"
    });
    notFound();
  }
  const [{ data: events }, { data: replies }, { data: client }, { data: site }, { data: clients }, { data: sites }] = await Promise.all([
    supabase.from("service_request_events").select("id,event_type,from_status,to_status,message,next_action_owner,next_action,hold_reason,appointment_at,created_at").eq("service_request_id", request.id).order("created_at"),
    supabase.from("service_request_replies").select("id,sender_user_id,sender_type,message,created_at").eq("service_request_id", request.id).order("created_at"),
    request.client_id ? supabase.from("clients").select("name").eq("id", request.client_id).maybeSingle() : Promise.resolve({ data: null }),
    request.site_id ? supabase.from("sites").select("name,address").eq("id", request.site_id).maybeSingle() : Promise.resolve({ data: null }),
    request.client_id || request.site_id ? Promise.resolve({ data: [] }) : supabase.from("clients").select("id,name").eq("active", true).order("name"),
    request.client_id || request.site_id ? Promise.resolve({ data: [] }) : supabase.from("sites").select("id,name,client_id").eq("active", true).order("name")
  ]);
  const statusOptions = [request.status, ...serviceRequestTransitions[request.status]];
  const timeline = [
    ...(events ?? []).map((event) => ({ id: `event-${event.id}`, createdAt: event.created_at, kind: "event" as const, event })),
    ...(replies ?? []).map((reply) => ({ id: `reply-${reply.id}`, createdAt: reply.created_at, kind: "reply" as const, reply }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="request-command-center">
      <Link className="request-command-back" href="/service-requests">← All service requests</Link>
      {query.updated ? <Card role="status">Customer timeline updated.</Card> : null}
      {query.replied ? <Card role="status">Reply sent to the requester.</Card> : null}
      {query.error ? <Card role="alert">Reply could not be sent. Please try again.</Card> : null}
      <div className="request-command-heading">
        <div>
          <p className="page-kicker">FAST OPERATIONS / REQUEST DETAIL</p>
          <PageHeader title={request.title} description={`${request.request_reference} · ${client?.name ?? request.requester_company ?? "Unmatched company"} · ${site?.name ?? request.site_description ?? "Unmatched site"} · ${serviceRequestCategoryLabels[request.category]}`} />
        </div>
        <div className="request-command-status">
          <StatusBadge>{serviceRequestStatusLabels[request.status]}</StatusBadge>
          <span className={`request-urgency request-urgency-${request.urgency.toLowerCase()}`}>{request.urgency.toLowerCase()}</span>
          <small>Updated {dateLabel(request.updated_at)}</small>
        </div>
      </div>
      <div className="request-command-grid">
        <div className="request-command-main">
          <Card className="request-brief-card">
            <div className="request-section-heading"><div><p className="page-kicker">REQUEST BRIEF</p><h2>What FAST needs to resolve</h2></div><span className="request-reference">{request.request_reference}</span></div>
            <div className="request-fact-grid">
              <div><span>Requester</span><strong>{request.requester_name}</strong><a href={`mailto:${request.requester_email}`}>{request.requester_email}</a>{request.requester_phone ? <small>{request.requester_phone}</small> : null}</div>
              <div><span>Company / client</span><strong>{client?.name ?? request.requester_company ?? "Unmatched company"}</strong></div>
              <div><span>Site</span><strong>{site?.name ?? request.site_description ?? "Unmatched site"}</strong>{site?.address ? <small>{site.address}</small> : null}</div>
              <div><span>Category</span><strong>{serviceRequestCategoryLabels[request.category]}</strong></div>
            </div>
            <div className="request-details-block"><span>Customer request</span><p>{request.details}</p></div>
            <div className="request-fact-grid request-fact-grid-secondary">
              {request.affected_asset ? <div><span>Asset</span><strong>{request.affected_asset}</strong></div> : null}
              {request.preferred_access_window ? <div><span>Access window</span><strong>{request.preferred_access_window}</strong></div> : null}
              {request.onsite_contact ? <div><span>On-site contact</span><strong>{request.onsite_contact}</strong></div> : null}
              {request.reference_note ? <div><span>Reference note</span><strong>{request.reference_note}</strong></div> : null}
            </div>
          </Card>
          <section className="request-timeline" aria-labelledby="staff-timeline-title"><div className="request-section-heading"><div><p className="page-kicker">ACTIVITY</p><h2 id="staff-timeline-title">Updates and replies</h2></div><span>{timeline.length} entries</span></div>
            {timeline.map((item) => item.kind === "event" ? <Card key={item.id} className="request-timeline-item"><div className="request-timeline-item-heading"><strong>{serviceRequestStatusLabels[item.event.to_status]}</strong><small>{dateLabel(item.event.created_at)}</small></div><p>{item.event.message}</p><div className="request-timeline-meta"><strong>Next:</strong> {item.event.next_action} · {item.event.next_action_owner}</div>{item.event.hold_reason ? <div className="request-timeline-meta"><strong>Waiting on:</strong> {item.event.hold_reason}</div> : null}{item.event.appointment_at ? <div className="request-timeline-meta"><strong>Appointment:</strong> {dateLabel(item.event.appointment_at)}</div> : null}</Card> : <Card key={item.id} className="request-timeline-item"><div className="request-timeline-item-heading"><strong>{item.reply.sender_type === "FAST" ? "FAST team reply" : "Customer reply"}</strong><small>{dateLabel(item.reply.created_at)}</small></div><p style={{ whiteSpace: "pre-wrap" }}>{item.reply.message}</p></Card>)}
            {!timeline.length ? <Card><p className="request-empty">No customer updates or replies yet.</p></Card> : null}
          </section>
        </div>
        <aside className="request-command-side">
          <Card className="request-action-card">
            <div className="request-section-heading"><div><p className="page-kicker">WORK QUEUE</p><h2>Move this request forward</h2></div></div>
            <p className="request-help">Keep internal ownership clear, then publish only the customer-safe update.</p>
            <form action={updateServiceRequest} className="request-form">
          <input type="hidden" name="id" value={request.id} />
          {request.client_id && request.site_id ? <>
            <input type="hidden" name="client_id" value={request.client_id} />
            <input type="hidden" name="site_id" value={request.site_id} />
            <p>Linked to {client?.name ?? "client"} / {site?.name ?? "site"}. Client and site links are locked after assignment.</p>
          </> : <>
            <p>Match this request to a FAST client and site when you have confirmed the location.</p>
            <label>Client<select name="client_id" defaultValue="" style={{ display: "block", width: "100%", minHeight: 44, marginTop: 6 }}>
              <option value="">Leave unmatched for now</option>{clients?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            <label>Site<select name="site_id" defaultValue="" style={{ display: "block", width: "100%", minHeight: 44, marginTop: 6 }}>
              <option value="">Leave unmatched for now</option>{sites?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
          </>}
          <label>Progress stage<select name="status" defaultValue={request.status} style={{ display: "block", width: "100%", minHeight: 44, marginTop: 6 }}>
            {statusOptions.map((status) => <option key={status} value={status}>{serviceRequestStatusLabels[status]}</option>)}
          </select></label>
          <label>Customer update<textarea name="customer_message" required maxLength={1000} defaultValue={request.customer_message} rows={3} style={{ display: "block", width: "100%", marginTop: 6 }} /></label>
          <label>Next action owner<input name="next_action_owner" required maxLength={100} defaultValue={request.next_action_owner} style={{ display: "block", width: "100%", minHeight: 40, marginTop: 6 }} /></label>
          <label>Next action for customer<input name="next_action" required maxLength={500} defaultValue={request.next_action} style={{ display: "block", width: "100%", minHeight: 40, marginTop: 6 }} /></label>
          <label>Waiting on, if applicable<input name="hold_reason" maxLength={500} defaultValue={request.hold_reason ?? ""} style={{ display: "block", width: "100%", minHeight: 40, marginTop: 6 }} /></label>
          <label>Appointment, only when confirmed<input name="appointment_at" type="datetime-local" defaultValue={localDateTimeInput(request.appointment_at)} style={{ display: "block", minHeight: 40, marginTop: 6 }} /></label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><input type="checkbox" name="public_update_visible" value="true" defaultChecked={request.public_update_visible} /> Publish this update and status in the public tracking timeline.</label>
          <Button type="submit">Save customer update</Button>
            </form>
          </Card>
          <Card className="request-reply-card"><p className="page-kicker">CUSTOMER COMMUNICATION</p><h2>Reply to requester</h2><p className="request-help">This message is visible to the customer in the tracking timeline.</p><form action={replyToServiceRequestFromStaff} className="request-form"><input type="hidden" name="service_request_id" value={request.id} /><label>Message<textarea name="message" required maxLength={2000} rows={5} /></label><Button type="submit" variant="secondary">Send reply</Button></form></Card>
          <Card className="request-visibility-card"><strong>Visibility guard</strong><p>Staff workflow fields stay inside FAST. Only the selected status, published update, appointment, and replies appear in customer tracking.</p></Card>
        </aside>
      </div>
    </div>
  );
}
