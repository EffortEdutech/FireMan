import { redirect } from "next/navigation";
import { createSiteRecord } from "@/app/(dashboard)/sites/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type SitesPageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
    status?: string;
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
  const [{ data: clients, error: clientsError }, { data: sites, error: sitesError }] = await Promise.all([
    supabase.from("clients").select("id,name").eq("active", true).order("name", { ascending: true }),
    supabase
      .from("sites")
      .select("id,name,site_code,address,city,state,country,active,created_at,clients(name)")
      .order("created_at", { ascending: false })
  ]);

  const hasClients = Boolean(clients && clients.length > 0);
  const selectedStatus = siteFilters.some((filter) => filter.key === params?.status) ? params?.status ?? "active" : "active";
  const activeSiteCount = sites?.filter((site) => site.active).length ?? 0;
  const inactiveSiteCount = sites?.filter((site) => !site.active).length ?? 0;
  const filteredSites =
    sites?.filter((site) => {
      if (selectedStatus === "all") {
        return true;
      }

      return selectedStatus === "active" ? site.active : !site.active;
    }) ?? [];
  const filterCountByKey = (key: string) => {
    if (key === "inactive") {
      return inactiveSiteCount;
    }

    if (key === "all") {
      return sites?.length ?? 0;
    }

    return activeSiteCount;
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Sites" description="Set up the buildings and service locations where FAST work takes place." />
      <div className="workflow-stepper" aria-label="Site setup workflow">
        <div className="workflow-step workflow-step-complete"><span>1</span><div><strong>Client account</strong><small>Organisation selected</small></div></div>
        <div className="workflow-step workflow-step-current"><span>2</span><div><strong>Service site</strong><small>Property and address</small></div></div>
        <div className="workflow-step"><span>3</span><div><strong>Equipment</strong><small>Fire assets</small></div></div>
        <div className="workflow-step"><span>4</span><div><strong>Maintenance</strong><small>Plan service work</small></div></div>
      </div>
      <div className="workflow-summary-grid" aria-label="Site register summary">
        <div className="workflow-summary-card"><span>Active sites</span><strong>{activeSiteCount}</strong><small>Available for asset setup</small></div>
        <div className="workflow-summary-card"><span>Inactive sites</span><strong>{inactiveSiteCount}</strong><small>Historical locations</small></div>
        <div className="workflow-summary-card"><span>Client dependency</span><strong>{clients?.length ?? 0}</strong><small>Active clients available</small></div>
        <div className="workflow-summary-card"><span>Next step</span><strong>Equipment</strong><small>Register fire assets</small></div>
      </div>
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
        {filteredSites.length > 0 ? (
        <>
        <div className="record-grid" aria-label="Client sites">
          {filteredSites.map((site) => <Card className="record-card" key={site.id}>
            <div className="record-card-heading"><div><span className="record-card-kicker">SERVICE SITE</span><h2>{site.name}</h2></div><span className={site.active ? "record-status record-status-active" : "record-status"}>{site.active ? "Active" : "Inactive"}</span></div>
            <div className="record-card-facts"><div><span>Client</span><strong>{site.clients?.name ?? "Not set"}</strong></div><div><span>Site code</span><strong>{site.site_code ?? "Not set"}</strong></div></div>
            <div className="record-card-contact"><span>Location</span><strong>{[site.address, site.city, site.state, site.country].filter(Boolean).join(", ") || "Not set"}</strong></div>
            <div className="record-card-next"><span>Next action</span><strong>{site.active ? "Register buildings, systems, and equipment for this site." : "Reactivate this site before planning new work."}</strong></div>
          </Card>)}
        </div>
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
              {filteredSites.map((site) => (
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
