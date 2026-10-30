import { redirect } from "next/navigation";
import { createClientRecord } from "@/app/(dashboard)/clients/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type ClientsPageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
    status?: string;
    page?: string;
    sort?: string;
  }>;
};

const clientFilters = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "all", label: "All clients" }
];

const inputStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const selectedStatus = clientFilters.some((filter) => filter.key === params?.status) ? params?.status ?? "active" : "active";
  const supabase = await createClient();
  const pageSize = 50;
  const requestedPage = Math.max(1, Number.parseInt(params?.page ?? "1", 10) || 1);
  const clientsQuery = supabase
    .from("clients")
    .select("id,name,registration_no,industry,phone,email,active,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((requestedPage - 1) * pageSize, requestedPage * pageSize - 1);
  if (selectedStatus !== "all") clientsQuery.eq("active", selectedStatus === "active");
  const [{ data: clients, error, count: clientCount }, { count: activeClientCountRaw }, { count: inactiveClientCountRaw }] = await Promise.all([
    clientsQuery,
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("active", false)
  ]);
  const activeClientCount = activeClientCountRaw ?? 0;
  const inactiveClientCount = inactiveClientCountRaw ?? 0;
  const filteredClients = clients ?? [];
  const filterCountByKey = (key: string) => {
    if (key === "inactive") {
      return inactiveClientCount;
    }

    if (key === "all") {
      return (activeClientCountRaw ?? 0) + (inactiveClientCountRaw ?? 0);
    }

    return activeClientCount;
  };
  const selectedSort = ["created_desc", "name_asc", "status"].includes(params?.sort ?? "") ? params?.sort ?? "created_desc" : "created_desc";
  const sortedClients = [...filteredClients].sort((left, right) => {
    if (selectedSort === "name_asc") return left.name.localeCompare(right.name);
    if (selectedSort === "status") return Number(right.active) - Number(left.active);
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
  const page = requestedPage;
  const pagedClients = sortedClients;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Clients" description="Set up the organisations that own or manage the properties FAST services." />
      <div className="register-summary"><strong>{activeClientCount} active clients</strong><span>{inactiveClientCount} inactive · create or review the organisation record below</span></div>
        {params?.created ? (
          <SuccessState message="Client created." />
        ) : null}
        {params?.error ? (
          <ErrorState
            title="Client not saved"
            message={
              params.error === "missing-name"
                ? "Client name is required."
                  : "The client could not be saved."
            }
          />
        ) : null}
        <Card className="workflow-action-card">
          <div className="workflow-section-heading"><div><span className="record-card-kicker">SETUP STEP 1</span><h2 style={{ fontSize: "1rem", margin: "0.25rem 0 0" }}>Create a client account</h2></div><span className="record-status">Start here</span></div>
          <p style={{ color: "var(--muted)", margin: "0 0 1rem" }}>Create the organisation first. Then use Sites to add the properties FAST will service.</p>
          <form action={createClientRecord} style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <input aria-label="Client name" name="name" placeholder="Client name" required style={inputStyle} />
              <input aria-label="Registration number" name="registration_no" placeholder="Registration number" style={inputStyle} />
              <input aria-label="Industry" name="industry" placeholder="Industry" style={inputStyle} />
              <input aria-label="Phone" name="phone" placeholder="Phone" style={inputStyle} />
              <input aria-label="Email" name="email" placeholder="Email" type="email" style={inputStyle} />
              <input aria-label="Address" name="address" placeholder="Address" style={inputStyle} />
            </div>
            <div>
              <Button type="submit">Create Client</Button>
            </div>
          </form>
        </Card>
        {error ? (
          <ErrorState title="Clients unavailable" message="The client list could not be loaded." />
        ) : clients && clients.length > 0 ? (
          <>
          <FilterBar
            description="Active clients are available for new sites, equipment, maintenance jobs, and issued reports."
            items={clientFilters.map((filter) => ({
              count: filterCountByKey(filter.key),
              href: filter.key === "active" ? "/clients" : `/clients?status=${filter.key}`,
              key: filter.key,
              label: filter.label
            }))}
            selectedKey={selectedStatus}
          />
          <form className="table-toolbar" method="get">
            <input name="status" type="hidden" value={selectedStatus} />
            <label>Sort clients<select name="sort" defaultValue={selectedSort}><option value="created_desc">Recently added</option><option value="name_asc">Name</option><option value="status">Active first</option></select></label>
            <Button type="submit" variant="secondary">Apply sort</Button>
          </form>
          {filteredClients.length > 0 ? (
          <>
          <div className="legacy-record-table">
          <Card className="table-scroll" style={{ padding: 0 }}>
            <table className="data-table">
              <colgroup>
                <col style={{ width: 180 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 190 }} />
                <col style={{ width: 100 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Registration</th>
                  <th>Industry</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <strong>{client.name}</strong>
                    </td>
                    <td>
                      {client.registration_no ?? "Not set"}
                    </td>
                    <td>
                      {client.industry ?? "Not set"}
                    </td>
                    <td>
                      {client.email ?? client.phone ?? "Not set"}
                    </td>
                    <td>
                      {client.active ? "Active" : "Inactive"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          </div>
          <PaginationControls basePath="/clients" page={page} pageSize={pageSize} query={{ status: selectedStatus, sort: selectedSort }} total={clientCount ?? 0} />
          </>
          ) : (
            <EmptyState title="No clients in this view" message="Choose another client status filter." />
          )}
          </>
        ) : (
          <EmptyState title="No clients yet" message="Create the first client to begin the maintenance setup flow." />
        )}
    </div>
  );
}
