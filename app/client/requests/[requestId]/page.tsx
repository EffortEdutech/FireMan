import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { replyToServiceRequest } from "@/app/(public)/request/actions";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { serviceRequestCategoryLabels, serviceRequestStatusLabels } from "@/lib/service-requests/constants";
import { createClient } from "@/lib/supabase/server";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(value));
}

export default async function CustomerRequestDetailPage({ params, searchParams }: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ submitted?: string; replied?: string; error?: string }>;
}) {
  const profile = await requireProfile();
  if (!canAccessClientPortal(profile.role)) redirect("/dashboard");
  const [{ requestId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: request } = await supabase.from("service_requests")
    .select("id,request_reference,title,site_id,site_description,category,status,customer_message,next_action_owner,next_action,hold_reason,appointment_at,updated_at,details,urgency,affected_asset")
    .eq("id", requestId).maybeSingle();
  if (!request) notFound();
  const [{ data: events }, { data: replies }, { data: site }] = await Promise.all([
    supabase.from("service_request_events").select("id,event_type,from_status,to_status,message,next_action_owner,next_action,hold_reason,appointment_at,created_at").eq("service_request_id", request.id).order("created_at"),
    supabase.from("service_request_replies").select("id,sender_user_id,sender_type,message,created_at").eq("service_request_id", request.id).order("created_at"),
    request.site_id ? supabase.from("sites").select("name,address").eq("id", request.site_id).maybeSingle() : Promise.resolve({ data: null })
  ]);
  const timeline = [
    ...(events ?? []).map((event) => ({ id: `event-${event.id}`, createdAt: event.created_at, kind: "event" as const, event })),
    ...(replies ?? []).map((reply) => ({ id: `reply-${reply.id}`, createdAt: reply.created_at, kind: "reply" as const, reply }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Link href="/client/requests">← All service requests</Link>
      {query.submitted ? <Card role="status">Request submitted. You can follow updates on this page.</Card> : null}
      {query.replied ? <Card role="status">Your reply was sent to FAST.</Card> : null}
      {query.error ? <Card role="alert">Your reply couldn’t be sent. Please try again.</Card> : null}
      <PageHeader title={request.title} description={`${request.request_reference} · ${site?.name ?? "Site"} · ${serviceRequestCategoryLabels[request.category]}`} />
      <Card style={{ display: "grid", gap: "0.6rem" }}>
        <strong>{serviceRequestStatusLabels[request.status]}</strong>
        <p style={{ margin: 0 }}>{request.customer_message}</p>
        <div><strong>Next action:</strong> {request.next_action}</div>
        <div><strong>With:</strong> {request.next_action_owner}</div>
        {request.hold_reason ? <div><strong>Waiting on:</strong> {request.hold_reason}</div> : null}
        {request.appointment_at ? <div><strong>Appointment:</strong> {dateLabel(request.appointment_at)}</div> : null}
        <small>Last updated {dateLabel(request.updated_at)}</small>
      </Card>
      <section aria-labelledby="timeline-title" style={{ display: "grid", gap: "0.75rem" }}>
        <h2 id="timeline-title">Request timeline</h2>
        {timeline.map((item) => item.kind === "event" ? (
          <Card key={item.id} style={{ display: "grid", gap: "0.4rem", borderLeft: "3px solid var(--accent, #c95736)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}><strong>{serviceRequestStatusLabels[item.event.to_status]}</strong><small>{dateLabel(item.event.created_at)}</small></div>
            <p style={{ margin: 0 }}>{item.event.message}</p>
            <div><strong>Next:</strong> {item.event.next_action} · {item.event.next_action_owner}</div>
            {item.event.hold_reason ? <div><strong>Waiting on:</strong> {item.event.hold_reason}</div> : null}
            {item.event.appointment_at ? <div><strong>Appointment:</strong> {dateLabel(item.event.appointment_at)}</div> : null}
          </Card>
        ) : <Card key={item.id}><div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}><strong>{item.reply.sender_user_id === profile.id ? "You replied" : item.reply.sender_type === "FAST" ? "FAST team replied" : "Another requester replied"}</strong><small>{dateLabel(item.reply.created_at)}</small></div><p style={{ whiteSpace: "pre-wrap" }}>{item.reply.message}</p></Card>)}
        {!timeline.length ? <p>Timeline updates will appear here.</p> : null}
      </section>
      <Card><h2>Reply to FAST</h2><form action={replyToServiceRequest} style={{ display: "grid", gap: "0.75rem" }}><input type="hidden" name="service_request_id" value={request.id} /><label>Your message<textarea name="message" required maxLength={2000} rows={4} style={{ display: "block", width: "100%", marginTop: 6 }} /></label><Button type="submit">Send reply</Button></form></Card>
      <details><summary>Request details submitted</summary><Card style={{ marginTop: "0.75rem" }}><p>{request.details}</p><p>Urgency: {request.urgency.toLowerCase()}</p>{request.affected_asset ? <p>Asset: {request.affected_asset}</p> : null}</Card></details>
    </div>
  );
}
