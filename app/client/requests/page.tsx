import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { serviceRequestCategoryLabels, serviceRequestStatusLabels } from "@/lib/service-requests/constants";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerRequestsPage() {
  const profile = await requireProfile();
  if (!canAccessClientPortal(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("service_requests")
    .select("id,request_reference,title,category,status,customer_message,next_action_owner,next_action,updated_at,site_id,site_description")
    .order("updated_at", { ascending: false });
  const siteIds = [...new Set(requests?.map((request) => request.site_id).filter((id): id is string => Boolean(id)) ?? [])];
  const { data: sites } = siteIds.length
    ? await supabase.from("sites").select("id,name").in("id", siteIds)
    : { data: [] };
  const siteNames = new Map(sites?.map((site) => [site.id, site.name]) ?? []);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", justifyContent: "space-between", gap: "1rem" }}>
        <PageHeader title="Service requests" description="Submit a request and follow its latest update through the FAST team." />
        <Link href="/client/requests/new"><Button>New request</Button></Link>
      </div>
      {error ? <Card role="alert">We couldn’t load requests right now. Please refresh or contact FAST.</Card> : null}
      {!error && !requests?.length ? <EmptyState title="No service requests yet" message="When you submit a request, its updates will appear here." /> : null}
      {requests?.map((request) => (
        <Card key={request.id} style={{ display: "grid", gap: "0.65rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.5rem" }}>
            <strong>{request.title}</strong><span>{serviceRequestStatusLabels[request.status]}</span>
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            {request.request_reference} · {siteNames.get(request.site_id ?? "") ?? request.site_description ?? "Site"} · {serviceRequestCategoryLabels[request.category]}
          </div>
          <p style={{ margin: 0 }}>{request.customer_message}</p>
          <div><strong>Next:</strong> {request.next_action} <span style={{ color: "var(--muted)" }}>· {request.next_action_owner}</span></div>
          <Link href={`/client/requests/${request.id}`}>View request timeline</Link>
        </Card>
      ))}
    </div>
  );
}
