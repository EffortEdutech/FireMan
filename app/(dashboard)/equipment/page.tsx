import { redirect } from "next/navigation";
import Link from "next/link";
import { createBuildingRecord, createEquipmentRecord, createSystemRecord } from "@/app/(dashboard)/equipment/actions";
import { EquipmentForms } from "@/app/(dashboard)/equipment/equipment-forms";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
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
  const [
    { data: sites, error: sitesError },
    { data: buildings, error: buildingsError },
    { data: systems, error: systemsError },
    { data: equipmentTypes, error: typesError },
    { data: technicalFields, error: fieldsError },
    { data: equipment, error: equipmentError }
  ] = await Promise.all([
    supabase.from("sites").select("id,name,clients(name)").eq("active", true).order("name", { ascending: true }),
    supabase.from("buildings").select("id,name,code,active,sites(name,clients(name))").eq("active", true).order("name", { ascending: true }),
    supabase.from("systems").select("id,building_id,name,code,system_type,active,buildings(name,sites(name))").eq("active", true).order("name", { ascending: true }),
    supabase.from("equipment_types").select("id,name,code,system_type").or(`organisation_id.is.null,organisation_id.eq.${profile.organisation_id}`).eq("active", true).order("name", { ascending: true }),
    supabase.from("equipment_type_fields").select("id,equipment_type_id,field_key,label,field_type,unit,options,required,customer_visible,sort_order").eq("active", true).order("sort_order", { ascending: true }),
    supabase
      .from("equipment")
      .select("id,asset_code,serial_number,brand,model,capacity,location_description,installation_date,technical_data,status,buildings(name,sites(name)),systems(name),equipment_types(id,name,code)")
      .order("created_at", { ascending: false })
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
  const selectedStatus = equipmentFilters.some((filter) => filter.key === params?.status) ? params?.status ?? "ACTIVE" : "ACTIVE";
  const searchTerm = (params?.search ?? "").trim().toLowerCase();
  const equipmentCounts = new Map<string, number>();
  const filteredEquipment =
    equipment?.filter((asset) => {
      equipmentCounts.set(asset.status, (equipmentCounts.get(asset.status) ?? 0) + 1);

      const searchable = [asset.asset_code, asset.serial_number, asset.brand, asset.model, asset.capacity, asset.location_description, asset.buildings?.name, asset.buildings?.sites?.name, asset.systems?.name, asset.equipment_types?.name, asset.equipment_types?.code].filter(Boolean).join(" ").toLowerCase();
      return (selectedStatus === "all" || asset.status === selectedStatus) && (!searchTerm || searchable.includes(searchTerm));
    }) ?? [];
  const filterCountByKey = (key: string) => {
    if (key === "all") {
      return equipment?.length ?? 0;
    }

    return equipmentCounts.get(key) ?? 0;
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Equipment" description="Build the technical asset register FAST uses for inspections, maintenance, reports, and customer records." />
      <div className="workflow-stepper" aria-label="Equipment setup workflow">
        <div className="workflow-step workflow-step-complete"><span>1</span><div><strong>Client and site</strong><small>Service location</small></div></div>
        <div className="workflow-step workflow-step-current"><span>2</span><div><strong>Building and system</strong><small>Technical structure</small></div></div>
        <div className="workflow-step"><span>3</span><div><strong>Equipment asset</strong><small>Asset and technical data</small></div></div>
        <div className="workflow-step"><span>4</span><div><strong>Maintenance</strong><small>Inspection history</small></div></div>
      </div>
      <div className="workflow-summary-grid" aria-label="Equipment register summary">
        <div className="workflow-summary-card"><span>Active assets</span><strong>{equipment?.filter((asset) => asset.status === "ACTIVE").length ?? 0}</strong><small>Available for jobs</small></div>
        <div className="workflow-summary-card"><span>Categories</span><strong>{equipmentTypeOptions.length}</strong><small>Technical templates</small></div>
        <div className="workflow-summary-card"><span>Out of service</span><strong>{equipment?.filter((asset) => asset.status === "OUT_OF_SERVICE").length ?? 0}</strong><small>Needs attention</small></div>
        <div className="workflow-summary-card"><span>Next action</span><strong>Link assets</strong><small>Use them in maintenance plans</small></div>
      </div>
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
        <div className="record-grid" aria-label="Equipment register">
          {filteredEquipment.map((asset) => <Card className="record-card" key={asset.id}>
            <div className="record-card-heading"><div><span className="record-card-kicker">ASSET REGISTER</span><h2><Link href={`/equipment/${asset.id}`}>{asset.asset_code}</Link></h2></div><span className={asset.status === "ACTIVE" ? "record-status record-status-active" : "record-status"}>{statusLabel[asset.status] ?? asset.status}</span></div>
            <div className="record-card-facts"><div><span>Equipment type</span><strong>{asset.equipment_types?.name ?? "Not set"}</strong></div><div><span>System</span><strong>{asset.systems?.name ?? "Not set"}</strong></div></div>
            <div className="record-card-contact"><span>Building / site</span><strong>{asset.buildings?.name ?? "Not set"} · {asset.buildings?.sites?.name ?? "Not set"}</strong><small>{[asset.brand, asset.model, asset.capacity].filter(Boolean).join(" / ") || asset.location_description || "Details not set"}</small><small>Technical data: {Object.keys((asset.technical_data && typeof asset.technical_data === "object" && !Array.isArray(asset.technical_data) ? asset.technical_data : {}) as Record<string, unknown>).length} fields recorded</small></div>
            <div className="record-card-next"><span>Next action</span><strong>Open the asset record to add documents, QR label, and inspection history.</strong></div>
          </Card>)}
        </div>
        <div className="legacy-record-table">
        <Card className="table-scroll" style={{ padding: 0 }}>
          <table className="data-table">
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
              {filteredEquipment.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    <strong><Link href={`/equipment/${asset.id}`}>{asset.asset_code}</Link></strong>
                    <div style={{ color: "var(--muted)", marginTop: 4 }}>
                      {[asset.brand, asset.model, asset.capacity].filter(Boolean).join(" / ") || "Details not set"}
                    </div>
                  </td>
                  <td>
                    {asset.equipment_types?.name ?? "Not set"}
                  </td>
                  <td>
                    {asset.buildings?.name ?? "Not set"}
                    <div style={{ color: "var(--muted)", marginTop: 4 }}>{asset.buildings?.sites?.name ?? ""}</div>
                  </td>
                  <td>{asset.systems?.name ?? "Not set"}</td>
                  <td>{asset.location_description ?? "Not set"}</td>
                  <td>{statusLabel[asset.status] ?? asset.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        </div>
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
