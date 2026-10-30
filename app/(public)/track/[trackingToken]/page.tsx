import Link from "next/link";
import { notFound } from "next/navigation";
import { replyToPublicTrackingRequest } from "@/app/(public)/request/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { serviceRequestCategoryLabels, serviceRequestStatusLabels } from "@/lib/service-requests/constants";
import { callPublicTracking } from "@/lib/service-requests/public-tracking";

type TrackingData = {
  request: {
    id: string; request_reference: string; created_at: string; updated_at: string;
    site_description: string | null; category: keyof typeof serviceRequestCategoryLabels; urgency: string;
    title: string; details: string; affected_asset: string | null;
    status: keyof typeof serviceRequestStatusLabels; customer_message: string; next_action: string; appointment_at: string | null;
  };
  events: Array<{ id: number; event_type: string; to_status: keyof typeof serviceRequestStatusLabels; message: string; appointment_at: string | null; created_at: string }>;
  replies: Array<{ id: string; sender_type: "CUSTOMER" | "FAST"; message: string; created_at: string }>;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(value));
}

export default async function PublicTrackingPage({ params, searchParams }: {
  params: Promise<{ trackingToken: string }>;
  searchParams: Promise<{ submitted?: string; replied?: string; error?: string }>;
}) {
  const [{ trackingToken }, query] = await Promise.all([params, searchParams]);
  const token = trackingToken.toLowerCase();
  let tracking: TrackingData;
  try {
    tracking = await callPublicTracking<TrackingData>("get", { trackingToken: token });
  } catch {
    notFound();
  }
  const { request, events, replies } = tracking;
  const timeline = [
    ...events.map((event) => ({ id: `event-${event.id}`, createdAt: event.created_at, heading: serviceRequestStatusLabels[event.to_status] ?? "FAST update", message: event.message, appointmentAt: event.appointment_at })),
    ...replies.map((reply) => ({ id: `reply-${reply.id}`, createdAt: reply.created_at, heading: reply.sender_type === "FAST" ? "FAST replied" : "Your message", message: reply.message, appointmentAt: null }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <main style={{ margin: "0 auto", maxWidth: 760, padding: "2rem 1rem 4rem", display: "grid", gap: "1rem" }}>
      <Link href="/">← Back to FAST</Link>
      {query.submitted ? <Card role="status">Request received. Save the secure tracking link for future access. Your FAST support reference is {request.request_reference}.</Card> : null}
      {query.replied ? <Card role="status">Your reply was sent to FAST.</Card> : null}
      {query.error ? <Card role="alert">Your reply could not be sent. Please try again.</Card> : null}
      <PageHeader title="Track your FAST request" description={`${request.request_reference} · Submitted ${dateLabel(request.created_at)}`} />
      <Card style={{ display: "grid", gap: "0.65rem" }}>
        <strong style={{ fontSize: "1.15rem" }}>{serviceRequestStatusLabels[request.status] ?? request.status}</strong>
        <h2 style={{ margin: 0 }}>{request.title}</h2>
        <div>{request.site_description ?? "Site details pending"} · {serviceRequestCategoryLabels[request.category] ?? request.category}</div>
        <p style={{ margin: 0 }}>{request.customer_message}</p>
        <div><strong>Next action:</strong> {request.next_action}</div>
        {request.appointment_at ? <div><strong>Appointment:</strong> {dateLabel(request.appointment_at)}</div> : null}
        <small>Last updated {dateLabel(request.updated_at)}</small>
      </Card>
      <section aria-labelledby="timeline-title" style={{ display: "grid", gap: "0.75rem" }}>
        <h2 id="timeline-title">Request timeline</h2>
        {timeline.map((item) => <Card key={item.id} style={{ display: "grid", gap: "0.45rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}><strong>{item.heading}</strong><small>{dateLabel(item.createdAt)}</small></div>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{item.message}</p>
          {item.appointmentAt ? <div><strong>Appointment:</strong> {dateLabel(item.appointmentAt)}</div> : null}
        </Card>)}
      </section>
      <Card>
        <h2>Reply to FAST</h2>
        <p>Use this page to send an update or answer a question. No account is required.</p>
        <form action={replyToPublicTrackingRequest} style={{ display: "grid", gap: "0.75rem" }}>
          <input type="hidden" name="tracking_token" value={token} />
          <label>Your message<textarea name="message" required maxLength={2000} rows={4} style={{ display: "block", width: "100%", marginTop: 6 }} /></label>
          <Button type="submit">Send reply</Button>
        </form>
      </Card>
      <details><summary>Request details</summary><Card style={{ marginTop: "0.75rem" }}><p style={{ whiteSpace: "pre-wrap" }}>{request.details}</p><p>Urgency: {request.urgency.toLowerCase()}</p>{request.affected_asset ? <p>Asset: {request.affected_asset}</p> : null}</Card></details>
      <small style={{ color: "var(--muted)" }}>Keep your request reference and secure tracking link private. Anyone with either one can view and reply to this request.</small>
    </main>
  );
}
