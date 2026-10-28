import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { replyToServiceRequest, signOutRequestAccess } from "@/app/(public)/request/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { serviceRequestCategoryLabels, serviceRequestStatusLabels } from "@/lib/service-requests/constants";
import { createClient } from "@/lib/supabase/server";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(value));
}

export default async function PublicRequestDetailPage({ params, searchParams }: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ submitted?: string; replied?: string; error?: string }>;
}) {
  const [{ requestId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect(`/request/access?next=${encodeURIComponent(`/request/requests/${requestId}`)}`);
  const { data: request } = await supabase.from("service_requests")
    .select("id,request_reference,title,site_description,category,status,customer_message,next_action_owner,next_action,hold_reason,appointment_at,updated_at,details,urgency,affected_asset")
    .eq("id", requestId).maybeSingle();
  if (!request) notFound();

  const [{ data: events }, { data: replies }] = await Promise.all([
    supabase.from("service_request_events").select("id,event_type,to_status,message,next_action_owner,next_action,hold_reason,appointment_at,created_at").eq("service_request_id", request.id),
    supabase.from("service_request_replies").select("id,sender_user_id,sender_type,message,created_at").eq("service_request_id", request.id)
  ]);
  const timeline = [
    ...(events ?? []).map((item) => ({ id: `event-${item.id}`, createdAt: item.created_at, type: "update" as const, message: item.message, status: item.to_status, nextAction: item.next_action, owner: item.next_action_owner, holdReason: item.hold_reason, appointmentAt: item.appointment_at })),
    ...(replies ?? []).map((item) => ({ id: `reply-${item.id}`, createdAt: item.created_at, type: "reply" as const, message: item.message, sender: item.sender_user_id === user.id ? "You" : item.sender_type === "FAST" ? "FAST team" : "Another requester" }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <main style={{ margin: "0 auto", maxWidth: 760, padding: "2rem 1rem 4rem", display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}><Link href="/request/requests">← Your requests</Link><form action={signOutRequestAccess}><Button type="submit" variant="secondary">Use another email</Button></form></div>
      {query.submitted ? <Card role="status">Request received. Save reference {request.request_reference} for contacting FAST.</Card> : null}
      {query.replied ? <Card role="status">Your reply was sent to FAST.</Card> : null}
      {query.error ? <Card role="alert">Your reply couldn’t be sent. Please try again.</Card> : null}
      <PageHeader title={request.title} description={`${request.request_reference} · ${request.site_description ?? "Site details pending"} · ${serviceRequestCategoryLabels[request.category]}`} />
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
        <h2 id="timeline-title">Timeline and replies</h2>
        {timeline.map((item) => <Card key={item.id} style={{ display: "grid", gap: "0.45rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
            <strong>{item.type === "reply" ? `${item.sender} replied` : serviceRequestStatusLabels[item.status]}</strong><small>{dateLabel(item.createdAt)}</small>
          </div>
          <p style={{ margin: 0 }}>{item.message}</p>
          {item.type === "update" ? <><div><strong>Next:</strong> {item.nextAction} · {item.owner}</div>{item.holdReason ? <div><strong>Waiting on:</strong> {item.holdReason}</div> : null}{item.appointmentAt ? <div><strong>Appointment:</strong> {dateLabel(item.appointmentAt)}</div> : null}</> : null}
        </Card>)}
      </section>
      <Card>
        <h2>Reply to FAST</h2>
        <form action={replyToServiceRequest} style={{ display: "grid", gap: "0.75rem" }}>
          <input type="hidden" name="service_request_id" value={request.id} />
          <label>Your message<textarea name="message" required maxLength={2000} rows={4} style={{ display: "block", width: "100%", marginTop: 6 }} /></label>
          <Button type="submit">Send reply</Button>
        </form>
      </Card>
      <details><summary>Request details</summary><Card style={{ marginTop: "0.75rem" }}><p style={{ whiteSpace: "pre-wrap" }}>{request.details}</p><p>Urgency: {request.urgency.toLowerCase()}</p>{request.affected_asset ? <p>Asset: {request.affected_asset}</p> : null}</Card></details>
    </main>
  );
}

