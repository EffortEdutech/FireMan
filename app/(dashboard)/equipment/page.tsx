import { redirect } from "next/navigation";
import Link from "next/link";
import { createBuildingRecord, createEquipmentRecord, createSystemRecord } from "@/app/(dashboard)/equipment/actions";
import { EquipmentForms } from "@/app/(dashboard)/equipment/equipment-forms";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type EquipmentPageProps = {
  searchParams?: Promise<{
    building?: string;
    equipment?: string;
    error?: string;
    search?: string;
    status?: string;
    system?: string;
    page?: string;
    sort?: string;
  }>;
};

const equipmentFilters = [
  { key: "ACTIVE", label: "Active" },
  { key: "OUT_OF_SERVICE", label: "Out of service" },
  { key: "RETIRED", label: "Retired" },
  { key: "all", label: "All assets" }
];

const statusLabel = {
  ACTIVE: "Active",
  OUT_OF_SERVICE: "Out of service",
  RETIRED: "Retired"
};

export default async function EquipmentPage({ searchParams }: EquipmentPageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createClient();
  const selectedStatus = equipmentFilters.some((filter) => filter.key === params?.status) ? params?.status ?? "ACTIVE" : "ACTIVE";
  const selectedSort = ["created_desc", "asset_asc", "type"].includes(params?.sort ?? "") ? params?.sort ?? "created_desc" : "created_desc";
  const searchTerm = (params?.search ?? "").trim().toLowerCase();
  const pageSize = 50;
  const requestedPage = Math.max(1, Number.parseInt(params?.page ?? "1", 10) || 1);
  const equipmentQuery = supabase
    .from("equipment")
    .select("id,asset_code,serial_number,brand,model,capacity,location_description,installation_date,technical_data,status,created_at,buildings(name,sites(name)),systems(name),equipment_types(id,name,code)", { count: "exact" })
    .order(selectedSort === "asset_asc" ? "asset_code" : "created_at", { ascending: selectedSort === "asset_asc" })
    .range((requestedPage - 1) * pageSize, requestedPage * pageSize - 1);
  if (selectedStatus !== "all") equipmentQuery.eq("status", selectedStatus as never);
  if (searchTerm) {
    const safeSearch = searchTerm.replaceAll(",", " ").replaceAll("(", " ").replaceAll(")", "");
    equipmentQuery.or(["asset_code", "serial_number", "brand", "model", "capacity", "location_description"].map((field) => `${field}.ilike.%${safeSearch}%`).join(","));
  }
  const [
    { data: sites, error: sitesError },
    { data: buildings, error: buildingsError },
    { data: systems, error: systemsError },
    { data: equipmentTypes, error: typesError },
    { data: technicalFields, error: fieldsError },
    { data: equipment, error: equipmentError, count: equipmentCount }
  ] = await Promise.all([
    supabase.from("sites").select("id,name,clients(name)").eq("active", true).order("name", { ascending: true }),
    supabase.from("buildings").select("id,name,code,active,sites(name,clients(name))").eq("active", true).order("name", { ascending: true }),
    supabase.from("systems").select("id,building_id,name,code,system_type,active,buildings(name,sites(name))").eq("active", true).order("name", { ascending: true }),
    supabase.from("equipment_types").select("id,name,code,system_type").or(`organisation_id.is.null,organisation_id.eq.${profile.organisation_id}`).eq("active", true).order("name", { ascending: true }),
    supabase.from("equipment_type_fields").select("id,equipment_type_id,field_key,label,field_type,unit,options,required,customer_visible,sort_order").eq("active", true).order("sort_order", { ascending: true }),
    equipmentQuery,
  ]);

  const siteOptions =
    sites?.map((site) => ({
      id: site.id,
      name: site.name,
      clientName: site.clients?.name ?? "Client"
    })) ?? [];
  const buildingOptions =
    buildings?.map((building) => ({
      id: building.id,
      name: building.name,
      siteName: building.sites?.name ?? "Site",
      clientName: building.sites?.clients?.name ?? "Client"
    })) ?? [];
  const systemOptions =
    systems?.map((system) => ({
      id: system.id,
      buildingId: system.building_id,
      name: system.name,
      buildingName: system.buildings?.name ?? "Building"
    })) ?? [];
  const equipmentTypeOptions =
    equipmentTypes?.map((type) => ({ id: type.id, name: type.name, code: type.code, fields: (technicalFields ?? []).filter((field) => field.equipment_type_id === type.id) })) ?? [];
  const filteredEquipment = equipment ?? [];
  const [{ count: activeEquipmentCount }, { count: outOfServiceEquipmentCount }, { count: retiredEquipmentCount }, { count: allEquipmentCount }] = await Promise.all([
    supabase.from("equipment").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("equipment").select("id", { count: "exact", head: true }).eq("status", "OUT_OF_SERVICE"),
    supabase.from("equipment").select("id", { count: "exact", head: true }).eq("status", "RETIRED"),
    supabase.from("equipment").select("id", { count: "exact", head: true })
  ]);
  const filterCountByKey = (key: string) => {
    if (key === "all") return allEquipmentCount ?? 0;
    if (key === "ACTIVE") return activeEquipmentCount ?? 0;
    if (key === "OUT_OF_SERVICE") return outOfServiceEquipmentCount ?? 0;
    return retiredEquipmentCount ?? 0;
  };
  const page = requestedPage;
  const pagedEquipment = filteredEquipment;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Equipment" description="Build the technical asset register FAST uses for inspections, maintenance, reports, and customer records." />
      <div className="register-summary"><strong>{activeEquipmentCount ?? 0} active assets</strong><span>{equipmentTypeOptions.length} categories · search the register or open an asset record below</span></div>
      {params?.building ? (
        <SuccessState message="Building created." />
      ) : null}
      {params?.system ? (
        <SuccessState message="System created." />
      ) : null}
      {params?.equipment ? (
        <SuccessState message="Equipment registered." />
      ) : null}
      {params?.error ? (
        <ErrorState
          title="Equipment register not saved"
          message={
            params.error === "missing-building"
              ? "Choose a site and enter a building name."
              : params.error === "missing-system"
                ? "Choose a building, system type, and system name."
                : params.error === "missing-equipment"
                  ? "Choose a building, equipment type, and asset code."
                    : params.error === "site-mismatch"
                      ? "Choose an active site from your organisation."
                      : params.error === "building-mismatch"
                        ? "Choose an active building from your organisation."
                        : params.error === "system-building-mismatch"
                          ? "Choose a system that belongs to the selected building."
                          : params.error === "equipment-type-mismatch"
                            ? "Choose an active equipment category from the register."
                            : params.error.startsWith("invalid-technical-data-")
                              ? `Enter a valid value for technical field ${params.error.replace("invalid-technical-data-", "").replaceAll("_", " ")}.`
                              : params.error === "technical-template-unavailable"
                                ? "The technical template could not be loaded. Try again or contact an administrator."
                  : "The register item could not be saved."
          }
        />
      ) : null}
      {sitesError || buildingsError || systemsError || typesError || fieldsError ? (
        <ErrorState title="Register setup unavailable" message="Some register choices could not be loaded." />
      ) : null}

      <Card className="workflow-action-card">
        <div className="workflow-section-heading"><div><span className="record-card-kicker">SETUP STEPS 2–3</span><h2 style={{ fontSize: "1rem", margin: "0.25rem 0 0" }}>Build the equipment register</h2></div><span className="record-status">{siteOptions.length ? "Ready" : "Create site first"}</span></div>
        <p style={{ color: "var(--muted)", margin: "0 0 1rem" }}>Create the building and system structure, then register each asset with its technical information and documents.</p>
        <EquipmentForms
          buildings={buildingOptions}
          createBuildingAction={createBuildingRecord}
          createEquipmentAction={createEquipmentRecord}
          createSystemAction={createSystemRecord}
          equipmentTypes={equipmentTypeOptions}
          sites={siteOptions}
          systems={systemOptions}
        />
      </Card>

      {equipmentError ? (
        <ErrorState title="Equipment unavailable" message="The equipment list could not be loaded." />
      ) : equipment && equipment.length > 0 ? (
        <>
        <FilterBar
          description="Active assets can be assigned to maintenance jobs. Out-of-service and retired assets stay visible for register history."
          items={equipmentFilters.map((filter) => ({
            count: filterCountByKey(filter.key),
            href: filter.key === "ACTIVE" ? "/equipment" : `/equipment?status=${filter.key}`,
            key: filter.key,
            label: filter.label
          }))}
          selectedKey={selectedStatus}
        />
        <form method="get" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginTop: "1rem" }}>
          <input aria-label="Search equipment" defaultValue={params?.search ?? ""} name="search" placeholder="Search asset, serial, brand, model, building, site or system" style={{ minHeight: 44, border: "1px solid var(--border)", borderRadius: 6, padding: 12, flex: "1 1 320px" }} />
          <input name="status" type="hidden" value={selectedStatus} />
          <Button type="submit">Search register</Button>
          {searchTerm ? <a className="button button-secondary" href={selectedStatus === "ACTIVE" ? "/equipment" : `/equipment?status=${selectedStatus}`}>Clear</a> : null}
        </form>
        <form className="table-toolbar" method="get">
          <input name="status" type="hidden" value={selectedStatus} />
          {params?.search ? <input name="search" type="hidden" value={params.search} /> : null}
          <label>Sort assets<select name="sort" defaultValue={selectedSort}><option value="created_desc">Recently added</option><option value="asset_asc">Asset code</option><option value="type">Equipment type</option></select></label>
          <Button type="submit" variant="secondary">Apply sort</Button>
        </form>
        <Card style={{ marginTop: "1rem" }}>
          <div className="record-card-heading"><div><span className="record-card-kicker">TECHNICAL LIBRARY</span><h2>Equipment categories & templates</h2></div><span className="record-status">{equipmentTypeOptions.length} categories</span></div>
          <div className="record-grid" style={{ marginTop: "1rem" }}>
            {equipmentTypeOptions.map((type) => <div className="record-card" key={type.id}>
              <div className="record-card-heading"><h3 style={{ margin: 0 }}>{type.name}</h3><span className="record-status">{type.code}</span></div>
              <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>{type.fields.length} technical fields · {type.fields.filter((field) => field.customer_visible).length} customer visible</p>
              <small>{type.fields.map((field) => `${field.label}${field.required ? " *" : ""}`).join(" · ") || "No technical fields configured"}</small>
            </div>)}
          </div>
        </Card>
        {filteredEquipment.length > 0 ? (
        <>
        <div className="legacy-record-table">
        <Card className="table-scroll" style={{ padding: 0 }}>
          <table className="data-table responsive-detail-table">
            <colgroup>
              <col style={{ width: 160 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 110 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Type</th>
                <th>Building</th>
                <th>System</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedEquipment.map((asset) => (
                <tr key={asset.id}>
                  <td data-label="Asset">
                    <strong><Link href={`/equipment/${asset.id}`}>{asset.asset_code}</Link></strong>
                    <div style={{ color: "var(--muted)", marginTop: 4 }}>
                      {[asset.brand, asset.model, asset.capacity].filter(Boolean).join(" / ") || "Details not set"}
                    </div>
                  </td>
                  <td data-label="Type">
                    {asset.equipment_types?.name ?? "Not set"}
                  </td>
                  <td data-label="Building">
                    {asset.buildings?.name ?? "Not set"}
                    <div style={{ color: "var(--muted)", marginTop: 4 }}>{asset.buildings?.sites?.name ?? ""}</div>
                  </td>
                  <td data-label="System">{asset.systems?.name ?? "Not set"}</td>
                  <td data-label="Location">{asset.location_description ?? "Not set"}</td>
                  <td data-label="Status">{statusLabel[asset.status] ?? asset.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        </div>
        <PaginationControls basePath="/equipment" page={page} pageSize={pageSize} query={{ status: selectedStatus, search: params?.search, sort: selectedSort }} total={equipmentCount ?? 0} />
        </>
        ) : (
          <EmptyState title="No assets in this view" message="Choose another asset status filter." />
        )}
        </>
      ) : (
        <EmptyState title="No equipment registered" message="Create a building, system, then register the first asset." />
      )}
    </div>
  );
}
