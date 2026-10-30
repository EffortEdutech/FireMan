import { redirect } from "next/navigation";
import { createSiteRecord } from "@/app/(dashboard)/sites/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type SitesPageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
    status?: string;
    page?: string;
    sort?: string;
  }>;
};

const siteFilters = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "all", label: "All sites" }
];

const fieldStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
};

export default async function SitesPage({ searchParams }: SitesPageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createClient();
  const selectedStatus = siteFilters.some((filter) => filter.key === params?.status) ? params?.status ?? "active" : "active";
  const pageSize = 50;
  const requestedPage = Math.max(1, Number.parseInt(params?.page ?? "1", 10) || 1);
  const sitesQuery = supabase
    .from("sites")
    .select("id,name,site_code,address,city,state,country,active,created_at,clients(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((requestedPage - 1) * pageSize, requestedPage * pageSize - 1);
  if (selectedStatus !== "all") sitesQuery.eq("active", selectedStatus === "active");
  const [{ data: clients, error: clientsError }, { data: sites, error: sitesError, count: siteCount }, { count: activeSiteCountRaw }, { count: inactiveSiteCountRaw }] = await Promise.all([
    supabase.from("clients").select("id,name").eq("active", true).order("name", { ascending: true }),
    sitesQuery,
    supabase.from("sites").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("sites").select("id", { count: "exact", head: true }).eq("active", false)
  ]);

  const hasClients = Boolean(clients && clients.length > 0);
  const activeSiteCount = activeSiteCountRaw ?? 0;
  const inactiveSiteCount = inactiveSiteCountRaw ?? 0;
  const filteredSites = sites ?? [];
  const filterCountByKey = (key: string) => {
    if (key === "inactive") {
      return inactiveSiteCount;
    }

    if (key === "all") {
      return (activeSiteCountRaw ?? 0) + (inactiveSiteCountRaw ?? 0);
    }

    return activeSiteCount;
  };
  const selectedSort = ["created_desc", "name_asc", "client"].includes(params?.sort ?? "") ? params?.sort ?? "created_desc" : "created_desc";
  const sortedSites = [...filteredSites].sort((left, right) => {
    if (selectedSort === "name_asc") return left.name.localeCompare(right.name);
    if (selectedSort === "client") return (left.clients?.name ?? "").localeCompare(right.clients?.name ?? "");
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
  const page = requestedPage;
  const pagedSites = sortedSites;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Sites" description="Set up the buildings and service locations where FAST work takes place." />
      <div className="register-summary"><strong>{activeSiteCount} active sites</strong><span>{inactiveSiteCount} inactive · choose a site below to review its property record</span></div>
      {params?.created ? (
        <SuccessState message="Site created." />
      ) : null}
      {params?.error ? (
        <ErrorState
          title="Site not saved"
          message={params.error === "missing-required" ? "Choose a client and enter a site name." : "The site could not be saved."}
        />
      ) : null}
      {clientsError ? <ErrorState title="Clients unavailable" message="Client choices could not be loaded." /> : null}
      <Card className="workflow-action-card">
        <div className="workflow-section-heading"><div><span className="record-card-kicker">SETUP STEP 2</span><h2 style={{ fontSize: "1rem", margin: "0.25rem 0 0" }}>Create a service site</h2></div><span className="record-status">{hasClients ? "Ready" : "Blocked"}</span></div>
        <p style={{ color: "var(--muted)", margin: "0 0 1rem" }}>{hasClients ? "Choose the client, then add the property details used for equipment, visits, and reports." : "Create a client account first to unlock site creation."}</p>
        <form action={createSiteRecord} style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <select aria-label="Client" disabled={!hasClients} name="client_id" required style={fieldStyle}>
              <option value="">{hasClients ? "Select client" : "Create a client first"}</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <input aria-label="Site name" disabled={!hasClients} name="name" placeholder="Site name" required style={fieldStyle} />
            <input aria-label="Site code" disabled={!hasClients} name="site_code" placeholder="Site code" style={fieldStyle} />
            <input aria-label="Address" disabled={!hasClients} name="address" placeholder="Address" style={fieldStyle} />
            <input aria-label="City" disabled={!hasClients} name="city" placeholder="City" style={fieldStyle} />
            <input aria-label="State" disabled={!hasClients} name="state" placeholder="State" style={fieldStyle} />
            <input aria-label="Postcode" disabled={!hasClients} name="postcode" placeholder="Postcode" style={fieldStyle} />
            <input aria-label="Country" disabled={!hasClients} name="country" placeholder="Malaysia" style={fieldStyle} />
          </div>
          <div>
            <Button disabled={!hasClients} type="submit">
              Create Site
            </Button>
          </div>
        </form>
      </Card>
      {sitesError ? (
        <ErrorState title="Sites unavailable" message="The site list could not be loaded." />
      ) : sites && sites.length > 0 ? (
        <>
        <FilterBar
          description="Active sites are available for buildings, asset registration, and maintenance planning."
          items={siteFilters.map((filter) => ({
            count: filterCountByKey(filter.key),
            href: filter.key === "active" ? "/sites" : `/sites?status=${filter.key}`,
            key: filter.key,
            label: filter.label
          }))}
          selectedKey={selectedStatus}
        />
          <form className="table-toolbar" method="get">
            <input name="status" type="hidden" value={selectedStatus} />
            <label>Sort sites<select name="sort" defaultValue={selectedSort}><option value="created_desc">Recently added</option><option value="name_asc">Name</option><option value="client">Client</option></select></label>
            <Button type="submit" variant="secondary">Apply sort</Button>
          </form>
        {filteredSites.length > 0 ? (
        <>
        <div className="legacy-record-table">
        <Card className="table-scroll" style={{ padding: 0 }}>
          <table className="data-table">
            <colgroup>
              <col style={{ width: 180 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 300 }} />
              <col style={{ width: 100 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Site</th>
                <th>Code</th>
                <th>Client</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
                {pagedSites.map((site) => (
                <tr key={site.id}>
                  <td>
                    <strong>{site.name}</strong>
                  </td>
                  <td>
                    {site.site_code ?? "Not set"}
                  </td>
                  <td>{site.clients?.name ?? "Not set"}</td>
                  <td>
                    {[site.address, site.city, site.state, site.country].filter(Boolean).join(", ") || "Not set"}
                  </td>
                  <td>{site.active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        </div>
        <PaginationControls basePath="/sites" page={page} pageSize={pageSize} query={{ status: selectedStatus, sort: selectedSort }} total={siteCount ?? 0} />
        </>
        ) : (
          <EmptyState title="No sites in this view" message="Choose another site status filter." />
        )}
        </>
      ) : (
        <EmptyState title="No sites yet" message="Create the first client location to unlock job planning." />
      )}
    </div>
  );
}
