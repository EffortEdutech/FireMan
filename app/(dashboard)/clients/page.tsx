import { redirect } from "next/navigation";
import { createClientRecord, updateClientReportTemplate } from "@/app/(dashboard)/clients/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type ClientsPageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
    status?: string;
    template?: string;
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
  const supabase = await createClient();
  const [{ data: clients, error }, { data: templates }] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name,registration_no,industry,phone,email,active,created_at,default_report_template_id,report_templates(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("report_templates")
      .select("id,name,is_default")
      .eq("active", true)
      .eq("report_type", "MAINTENANCE")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })
  ]);
  const selectedStatus = clientFilters.some((filter) => filter.key === params?.status) ? params?.status ?? "active" : "active";
  const activeClientCount = clients?.filter((client) => client.active).length ?? 0;
  const inactiveClientCount = clients?.filter((client) => !client.active).length ?? 0;
  const filteredClients =
    clients?.filter((client) => {
      if (selectedStatus === "all") {
        return true;
      }

      return selectedStatus === "active" ? client.active : !client.active;
    }) ?? [];
  const filterCountByKey = (key: string) => {
    if (key === "inactive") {
      return inactiveClientCount;
    }

    if (key === "all") {
      return clients?.length ?? 0;
    }

    return activeClientCount;
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Clients" description="Register and review client accounts for the current organisation." />
        {params?.created ? (
          <SuccessState message="Client created." />
        ) : null}
        {params?.template ? (
          <SuccessState message="Client report template preference updated." />
        ) : null}
        {params?.error ? (
          <ErrorState
            title="Client not saved"
            message={
              params.error === "missing-name"
                ? "Client name is required."
                : params.error === "template-not-found"
                  ? "The selected report template is unavailable."
                  : "The client could not be saved."
            }
          />
        ) : null}
        <Card>
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
          {filteredClients.length > 0 ? (
          <Card className="table-scroll" style={{ padding: 0 }}>
            <table className="data-table">
              <colgroup>
                <col style={{ width: 180 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 190 }} />
                <col style={{ width: 240 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 180 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Registration</th>
                  <th>Industry</th>
                  <th>Contact</th>
                  <th>Report Template</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
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
                      {client.report_templates?.name ?? "Standard/default"}
                    </td>
                    <td>
                      {client.active ? "Active" : "Inactive"}
                    </td>
                    <td>
                      <form action={updateClientReportTemplate} style={{ display: "grid", gap: "0.5rem" }}>
                        <input name="client_id" type="hidden" value={client.id} />
                        <select
                          aria-label={`${client.name} default report template`}
                          defaultValue={client.default_report_template_id ?? ""}
                          name="default_report_template_id"
                          style={inputStyle}
                        >
                          <option value="">Standard/default</option>
                          {templates?.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                              {template.is_default ? " (default)" : ""}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" variant="secondary">
                          Save
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
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
