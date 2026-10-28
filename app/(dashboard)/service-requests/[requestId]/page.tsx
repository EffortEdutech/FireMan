import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { replyToServiceRequestFromStaff, updateServiceRequest } from "@/app/(dashboard)/service-requests/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
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
  const { data: request } = await supabase.from("service_requests")
    .select("id,client_id,site_id,request_reference,requester_email,requester_name,requester_company,requester_phone,site_description,title,category,urgency,details,affected_asset,preferred_access_window,onsite_contact,reference_note,status,customer_message,next_action_owner,next_action,hold_reason,appointment_at,updated_at")
    .eq("id", requestId).maybeSingle();
  if (!request) notFound();
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
    <div style={{ display: "grid", gap: "1rem" }}>
      <Link href="/service-requests">← All service requests</Link>
      {query.updated ? <Card role="status">Customer timeline updated.</Card> : null}
      {query.replied ? <Card role="status">Reply sent to the requester.</Card> : null}
      {query.error ? <Card role="alert">Reply could not be sent. Please try again.</Card> : null}
      <PageHeader title={request.title} description={`${request.request_reference} · ${client?.name ?? request.requester_company ?? "Unmatched company"} · ${site?.name ?? request.site_description ?? "Unmatched site"} · ${serviceRequestCategoryLabels[request.category]}`} />
      <Card style={{ display: "grid", gap: "0.5rem" }}>
        <div><strong>Requester:</strong> {request.requester_name} · <a href={`mailto:${request.requester_email}`}>{request.requester_email}</a>{request.requester_phone ? ` · ${request.requester_phone}` : ""}</div>
        <strong>{serviceRequestStatusLabels[request.status]} · {request.urgency.toLowerCase()}</strong>
        <p style={{ whiteSpace: "pre-wrap" }}>{request.details}</p>
        {request.affected_asset ? <div>Asset: {request.affected_asset}</div> : null}
        {request.preferred_access_window ? <div>Access window: {request.preferred_access_window}</div> : null}
        {request.onsite_contact ? <div>On-site contact: {request.onsite_contact}</div> : null}
        {request.reference_note ? <div>Reference: {request.reference_note}</div> : null}
      </Card>
      <Card>
        <h2>Publish a customer update</h2>
        <p>Only this update and the selected progress stage are shown in the customer portal.</p>
        <form action={updateServiceRequest} style={{ display: "grid", gap: "1rem" }}>
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
          <Button type="submit">Save customer update</Button>
        </form>
      </Card>
      <section style={{ display: "grid", gap: "0.75rem" }}><h2>Published timeline</h2>
        {timeline.map((item) => item.kind === "event" ? <Card key={item.id}><div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}><strong>{serviceRequestStatusLabels[item.event.to_status]}</strong><small>{dateLabel(item.event.created_at)}</small></div><p>{item.event.message}</p><div><strong>Next:</strong> {item.event.next_action} · {item.event.next_action_owner}</div>{item.event.hold_reason ? <div><strong>Waiting on:</strong> {item.event.hold_reason}</div> : null}{item.event.appointment_at ? <div><strong>Appointment:</strong> {dateLabel(item.event.appointment_at)}</div> : null}</Card> : <Card key={item.id}><div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}><strong>{item.reply.sender_type === "FAST" ? "FAST team reply" : "Customer reply"}</strong><small>{dateLabel(item.reply.created_at)}</small></div><p style={{ whiteSpace: "pre-wrap" }}>{item.reply.message}</p></Card>)}
        {!timeline.length ? <p>No customer updates or replies yet.</p> : null}
      </section>
      <Card><h2>Reply to requester</h2><form action={replyToServiceRequestFromStaff} style={{ display: "grid", gap: "0.75rem" }}><input type="hidden" name="service_request_id" value={request.id} /><label>Message<textarea name="message" required maxLength={2000} rows={4} style={{ display: "block", width: "100%", marginTop: 6 }} /></label><Button type="submit" variant="secondary">Send reply</Button></form></Card>
    </div>
  );
}

