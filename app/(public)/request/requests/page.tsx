import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { signOutRequestAccess } from "@/app/(public)/request/actions";
import { serviceRequestCategoryLabels, serviceRequestStatusLabels } from "@/lib/service-requests/constants";
import { createClient } from "@/lib/supabase/server";

export default async function PublicRequestListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/request/access?next=%2Frequest%2Frequests");
  const { data: requests, error } = await supabase.from("service_requests")
    .select("id,request_reference,title,category,status,customer_message,next_action_owner,next_action,updated_at,site_description")
    .order("updated_at", { ascending: false });

  return (
    <main style={{ margin: "0 auto", maxWidth: 760, padding: "2rem 1rem 4rem", display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <PageHeader title="Your service requests" description={`Verified email: ${user.email}`} />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
          <Link className="fast-button fast-button-primary" href="/request">New request</Link>
          <form action={signOutRequestAccess}><Button type="submit" variant="secondary">Use another email</Button></form>
        </div>
      </div>
      {error ? <Card role="alert">Requests couldn’t be loaded. Please try again.</Card> : null}
      {!error && !requests?.length ? <EmptyState title="No requests found" message="Requests submitted with this email will appear here after verification." /> : null}
      {requests?.map((request) => (
        <Card key={request.id} style={{ display: "grid", gap: "0.6rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}><strong>{request.title}</strong><span>{serviceRequestStatusLabels[request.status]}</span></div>
          <div style={{ color: "var(--muted)" }}>{request.request_reference} · {request.site_description ?? "Site details pending"} · {serviceRequestCategoryLabels[request.category]}</div>
          <p style={{ margin: 0 }}>{request.customer_message}</p>
          <div><strong>Next:</strong> {request.next_action} · {request.next_action_owner}</div>
          <Link href={`/request/requests/${request.id}`}>View timeline and reply</Link>
        </Card>
      ))}
    </main>
  );
}
