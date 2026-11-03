import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { serviceRequestCategoryLabels, serviceRequestStatusLabels } from "@/lib/service-requests/constants";
import { createClient } from "@/lib/supabase/server";

type CustomerRequestsPageProps = { searchParams?: Promise<{ q?: string; status?: string }> };
const requestStatuses = ["ALL", "SUBMITTED", "UNDER_REVIEW", "NEEDS_CUSTOMER_INFO", "QUOTATION", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CLOSED"];

function statusLabel(status: string) { return serviceRequestStatusLabels[status as keyof typeof serviceRequestStatusLabels] ?? status.replaceAll("_", " "); }
function statusTone(status: string) { return status === "COMPLETED" || status === "CLOSED" ? "status-badge-success" : status === "NEEDS_CUSTOMER_INFO" ? "status-badge-danger" : "status-badge-warning"; }

export default async function CustomerRequestsPage({ searchParams }: CustomerRequestsPageProps) {
  const profile = await requireProfile();
  if (!canAccessClientPortal(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const selectedStatus = requestStatuses.includes(params?.status ?? "") ? params?.status ?? "ALL" : "ALL";
  const supabase = await createClient();
  const { data: requests, error } = await supabase.from("service_requests").select("id,request_reference,title,category,status,customer_message,next_action_owner,next_action,updated_at,site_id,site_description").order("updated_at", { ascending: false });
  const siteIds = [...new Set(requests?.map((request) => request.site_id).filter((id): id is string => Boolean(id)) ?? [])];
  const { data: sites } = siteIds.length ? await supabase.from("sites").select("id,name").in("id", siteIds) : { data: [] };
  const siteNames = new Map(sites?.map((site) => [site.id, site.name]) ?? []);
  const filteredRequests = (requests ?? []).filter((request) => {
    const site = siteNames.get(request.site_id ?? "") ?? request.site_description ?? "";
    const haystack = [request.request_reference, request.title, request.customer_message, site, request.category, request.status].join(" ").toLowerCase();
    return (selectedStatus === "ALL" || request.status === selectedStatus) && (!query || haystack.includes(query.toLowerCase()));
  });
  const activeCount = (requests ?? []).filter((request) => !["COMPLETED", "CLOSED"].includes(request.status)).length;
  const waitingOnCustomerCount = (requests ?? []).filter((request) => request.status === "NEEDS_CUSTOMER_INFO").length;
  return <div className="client-page-stack client-requests-page">
    <div className="client-page-heading"><PageHeader title="Service requests" description="Track every request, current status, and next action from FAST." /><Link className="button button-primary" href="/client/requests/new">New request</Link></div>
    <div className="client-workflow-summary"><div><span>All requests</span><strong>{requests?.length ?? 0}</strong></div><div><span>Active</span><strong>{activeCount}</strong></div><div><span>Waiting on you</span><strong>{waitingOnCustomerCount}</strong></div></div>
    <Card className="client-filter-panel"><form className="client-request-filters" method="get"><label>Search requests<input name="q" defaultValue={query} placeholder="Reference, title, site…" /></label><label>Status<select name="status" defaultValue={selectedStatus}>{requestStatuses.map((status) => <option key={status} value={status}>{status === "ALL" ? "All statuses" : statusLabel(status)}</option>)}</select></label><button className="button button-primary" type="submit">Apply filters</button>{(query || selectedStatus !== "ALL") ? <Link className="button button-secondary" href="/client/requests">Clear</Link> : null}</form></Card>
    {error ? <Card role="alert">We couldn’t load requests right now. Please refresh or contact FAST.</Card> : !filteredRequests.length ? <EmptyState title={requests?.length ? "No matching requests" : "No service requests yet"} message={requests?.length ? "Try a different search or status filter." : "When you submit a request, its updates will appear here."} /> : <Card className="table-scroll client-request-table-card" style={{ padding: 0 }}><table className="data-table"><thead><tr><th>Reference</th><th>Request</th><th>Site</th><th>Status</th><th>Next action</th><th>Updated</th><th /></tr></thead><tbody>{filteredRequests.map((request) => <tr key={request.id}><td><Link href={`/client/requests/${request.id}`}><strong>{request.request_reference}</strong></Link></td><td><strong>{request.title}</strong><small className="table-cell-subtext">{serviceRequestCategoryLabels[request.category]}</small></td><td>{siteNames.get(request.site_id ?? "") ?? request.site_description ?? "Site not recorded"}</td><td><span className={`status-badge ${statusTone(request.status)}`}>{statusLabel(request.status)}</span></td><td><strong>{request.next_action ?? "FAST will provide the next update."}</strong><small className="table-cell-subtext">{request.next_action_owner ?? "FAST team"}</small></td><td style={{ whiteSpace: "nowrap" }}>{new Date(request.updated_at).toLocaleDateString("en-MY")}</td><td><Link href={`/client/requests/${request.id}`}>Open →</Link></td></tr>)}</tbody></table></Card>}
  </div>;
}
