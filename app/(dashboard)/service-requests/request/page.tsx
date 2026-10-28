import ManageServiceRequestPage from "@/app/(dashboard)/service-requests/[requestId]/page";

export default async function StaffServiceRequestEntryPage({ searchParams }: {
  searchParams: Promise<{ requestId?: string; updated?: string; replied?: string; error?: string }>;
}) {
  const query = await searchParams;
  return ManageServiceRequestPage({
    params: Promise.resolve({ requestId: query.requestId ?? "" }),
    searchParams: Promise.resolve(query)
  });
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { serviceRequestCategoryLabels, serviceRequestStatusLabels } from "@/lib/service-requests/constants";
import { createClient } from "@/lib/supabase/server";
import { setPublicRequestIntake } from "@/app/(dashboard)/service-requests/actions";

export default async function ServiceRequestsPage({ searchParams }: { searchParams: Promise<{ error?: string; "intake-error"?: string; "intake-updated"?: string }> }) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const supabase = await createClient();
  const { data: requests, error } = await supabase.from("service_requests")
    .select("id,request_reference,title,category,status,urgency,updated_at,site_id,client_id,requester_email,requester_name,requester_company,site_description")
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

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Service requests" description="Review customer requests and publish clear progress updates to the customer timeline." />
      {params.error ? <Card role="alert">The update could not be saved. Check the request’s allowed status path and try again.</Card> : null}
      {params["intake-error"] ? <Card role="alert">Public intake could not be changed. Another organisation may already have it enabled.</Card> : null}
      {params["intake-updated"] ? <Card role="status">Public request intake setting updated.</Card> : null}
      <Card style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div><strong>Public request form</strong><p style={{ margin: "0.35rem 0 0" }}>{organisation?.public_request_enabled ? "Enabled at /request. No registration or verification code is required; customers receive a secure tracking reference after submission." : "Disabled. Enable this when the public FAST request page is ready."}</p></div>
        <form action={setPublicRequestIntake}><input type="hidden" name="enabled" value={organisation?.public_request_enabled ? "false" : "true"} /><Button type="submit" variant="secondary">{organisation?.public_request_enabled ? "Disable intake" : "Enable intake"}</Button></form>
      </Card>
      {error ? <Card role="alert">Requests could not be loaded. Please retry.</Card> : null}
      {!error && !requests?.length ? <EmptyState title="No service requests" message="Customer-submitted requests will appear here." /> : null}
      {requests?.map((request) => (
        <Card key={request.id} style={{ display: "grid", gap: "0.55rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}><strong>{request.title}</strong><span>{serviceRequestStatusLabels[request.status]}</span></div>
          <div style={{ color: "var(--muted)" }}>{request.request_reference} · {request.requester_name} ({request.requester_email}) · {request.requester_company ?? clientNames.get(request.client_id ?? "") ?? "Unmatched company"} · {siteNames.get(request.site_id ?? "") ?? request.site_description ?? "Unmatched site"}</div>
          <div>{serviceRequestCategoryLabels[request.category]} · {request.urgency.toLowerCase()} · Updated {new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(request.updated_at))}</div>
          <Link href={`/service-requests/request?requestId=${request.id}`}>Review and update</Link>
        </Card>
      ))}
    </div>
  );
}
