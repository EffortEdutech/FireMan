import Link from "next/link";
import { redirect } from "next/navigation";
import { createBuildingRecord, createEquipmentRecord, createSystemRecord, importEquipmentCsv } from "@/app/(dashboard)/equipment/actions";
import { EquipmentForms } from "@/app/(dashboard)/equipment/equipment-forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type EquipmentPageProps = {
  searchParams?: Promise<{
    building?: string;
    equipment?: string;
    imported?: string;
    error?: string;
    family?: string;
    search?: string;
    catalog_search?: string;
    status?: string;
    system?: string;
    page?: string;
    sort?: string;
    view?: string;
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

const familyLabels: Record<string, string> = {
  FIRE_ALARM: "Fire alarm",
  FIRE_EXTINGUISHING: "Fire extinguishing",
  HOSE_REEL: "Hose reel",
  SPRINKLER: "Sprinkler",
  EMERGENCY_LIGHTING: "Emergency lighting",
  EXIT_SIGNAGE: "Exit signage",
  HYDRANT_RISER: "Hydrant / riser",
  FIRE_PUMP: "Fire pump",
  WATER_SPRAY_MIST: "Water spray / mist",
  GASEOUS_SUPPRESSION: "Gaseous suppression",
  CO2_SUPPRESSION: "CO₂ suppression",
  FOAM_SUPPRESSION: "Foam / deluge / monitor",
  KITCHEN_SUPPRESSION: "Kitchen suppression",
  PASSIVE_PROTECTION: "Passive protection",
  SMOKE_CONTROL: "Smoke control",
  EMERGENCY_LIFE_SAFETY: "Emergency life safety",
  SPECIAL_HAZARD: "Special hazard",
  DRY_CHEMICAL: "Dry chemical suppression",
  FIRE_WATER_SUPPLY: "Fire-water supply",
  OTHER: "Other"
};

function familyLabel(value: string) {
  return familyLabels[value] ?? value.replaceAll("_", " ");
}

function errorMessage(error?: string) {
  if (!error) return null;
  const messages: Record<string, string> = {
    "missing-building": "Choose a site and enter a building name.",
    "missing-system": "Choose a building, system type, and system name.",
    "missing-equipment": "Choose a building, equipment type, and asset code.",
    "site-mismatch": "Choose an active site from your organisation.",
    "building-mismatch": "Choose an active building from your organisation.",
    "system-building-mismatch": "Choose a system that belongs to the selected building.",
    "equipment-type-mismatch": "Choose an active equipment category from the catalogue.",
    "technical-template-unavailable": "The technical template could not be loaded. Try again or contact an administrator."
  };
  if (error.startsWith("invalid-technical-data-")) {
    return `Enter a valid value for ${error.replace("invalid-technical-data-", "").replaceAll("_", " ")}.`;
  }
  return messages[error] ?? "The register item could not be saved.";
}

export default async function EquipmentPage({ searchParams }: EquipmentPageProps) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");

  const params = await searchParams;
  const supabase = await createClient();
  const view = ["assets", "catalogue", "setup", "import"].includes(params?.view ?? "") ? params?.view ?? "assets" : "assets";
  const selectedStatus = equipmentFilters.some((filter) => filter.key === params?.status) ? params?.status ?? "ACTIVE" : "ACTIVE";
  const selectedSort = ["created_desc", "asset_asc"].includes(params?.sort ?? "") ? params?.sort ?? "created_desc" : "created_desc";
  const searchTerm = (params?.search ?? "").trim().toLowerCase();
  const catalogueSearch = (params?.catalog_search ?? "").trim().toLowerCase();
  const requestedPage = Math.max(1, Number.parseInt(params?.page ?? "1", 10) || 1);
  const pageSize = 50;
  const equipmentQuery = supabase
    .from("equipment")
    .select("id,asset_code,serial_number,brand,model,capacity,location_description,installation_date,technical_data,status,created_at,buildings!equipment_building_id_fkey(name,sites(name)),systems!equipment_system_id_fkey(name),equipment_types(id,name,code,system_type)", { count: "exact" })
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
    { data: equipment, error: equipmentError, count: equipmentCount },
    { count: activeEquipmentCount },
    { count: outOfServiceEquipmentCount },
    { count: retiredEquipmentCount },
    { count: allEquipmentCount }
  ] = await Promise.all([
    supabase.from("sites").select("id,name,clients(name)").eq("active", true).order("name", { ascending: true }),
    supabase.from("buildings").select("id,name,code,active,sites(name,clients(name))").eq("active", true).order("name", { ascending: true }),
    supabase.from("systems").select("id,building_id,name,code,system_type,active,buildings(name,sites(name))").eq("active", true).order("name", { ascending: true }),
    supabase.from("equipment_types").select("id,name,code,system_type").or(`organisation_id.is.null,organisation_id.eq.${profile.organisation_id}`).eq("active", true).order("name", { ascending: true }),
    supabase.from("equipment_type_fields").select("id,equipment_type_id,field_key,label,field_type,unit,options,required,customer_visible,sort_order").eq("active", true).order("sort_order", { ascending: true }),
    equipmentQuery,
    supabase.from("equipment").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("equipment").select("id", { count: "exact", head: true }).eq("status", "OUT_OF_SERVICE"),
    supabase.from("equipment").select("id", { count: "exact", head: true }).eq("status", "RETIRED"),
    supabase.from("equipment").select("id", { count: "exact", head: true })
  ]);

  const siteOptions = sites?.map((site) => ({ id: site.id, name: site.name, clientName: site.clients?.name ?? "Client" })) ?? [];
  const buildingOptions = buildings?.map((building) => ({ id: building.id, name: building.name, siteName: building.sites?.name ?? "Site", clientName: building.sites?.clients?.name ?? "Client" })) ?? [];
  const systemOptions = systems?.map((system) => ({ id: system.id, buildingId: system.building_id, name: system.name, buildingName: system.buildings?.name ?? "Building" })) ?? [];
  const equipmentTypeOptions = equipmentTypes?.map((type) => ({ id: type.id, name: type.name, code: type.code, systemType: type.system_type, fields: (technicalFields ?? []).filter((field) => field.equipment_type_id === type.id) })) ?? [];
  const familyOptions = Array.from(new Set(equipmentTypeOptions.map((type) => type.systemType))).sort((a, b) => familyLabel(a).localeCompare(familyLabel(b)));
  const requestedFamily = params?.family ?? "";
  const selectedFamily = familyOptions.some((family) => family === requestedFamily) ? requestedFamily : "";
  const filteredCatalogue = equipmentTypeOptions.filter((type) => {
    const matchesFamily = !selectedFamily || type.systemType === selectedFamily;
    const haystack = `${type.code} ${type.name} ${type.systemType}`.toLowerCase();
    return matchesFamily && (!catalogueSearch || haystack.includes(catalogueSearch));
  });
  const setupError = sitesError || buildingsError || systemsError || typesError || fieldsError;
  const activeCount = activeEquipmentCount ?? 0;
  const statusCount = (key: string) => key === "all" ? allEquipmentCount ?? 0 : key === "ACTIVE" ? activeCount : key === "OUT_OF_SERVICE" ? outOfServiceEquipmentCount ?? 0 : retiredEquipmentCount ?? 0;

  return (
    <div className="equipment-workspace">
      <PageHeader title="Equipment register" description="Find, register, and maintain FAST fire-system assets from one controlled workspace." />
      <div className="register-summary"><strong>{activeCount} active assets</strong><span>{equipmentTypeOptions.length} catalogue types · {allEquipmentCount ?? 0} total registered assets</span></div>

      <nav className="ui-tabs equipment-workspace-tabs" aria-label="Equipment workspace views">
        <Link className={`ui-tab${view === "assets" ? " ui-tab-active" : ""}`} href="/equipment">Asset register <span>{allEquipmentCount ?? 0}</span></Link>
        <Link className={`ui-tab${view === "catalogue" ? " ui-tab-active" : ""}`} href="/equipment?view=catalogue">Equipment catalogue <span>{equipmentTypeOptions.length}</span></Link>
        <Link className={`ui-tab${view === "setup" ? " ui-tab-active" : ""}`} href="/equipment?view=setup">Register asset</Link>
        <Link className={`ui-tab${view === "import" ? " ui-tab-active" : ""}`} href="/equipment?view=import">Import register</Link>
      </nav>

      {params?.building ? <SuccessState message="Building created." /> : null}
      {params?.system ? <SuccessState message="System created." /> : null}
      {params?.equipment ? <SuccessState message="Equipment registered." /> : null}
      {params?.imported ? <SuccessState message={`${params.imported} equipment assets imported successfully.`} /> : null}
      {params?.error ? <ErrorState title="Equipment register not saved" message={errorMessage(params.error) ?? "The register item could not be saved."} /> : null}
      {setupError ? <ErrorState title="Register setup unavailable" message="Some register choices could not be loaded." /> : null}

      {view === "import" ? (
        <Card className="workflow-action-card equipment-setup-panel">
          <div className="workflow-section-heading"><div><span className="record-card-kicker">CONTROLLED IMPORT</span><h2 style={{ fontSize: "1rem", margin: "0.25rem 0 0" }}>Import FAST equipment register</h2></div><span className="record-status">Validate before insert</span></div>
          <p style={{ color: "var(--muted)", margin: "0 0 1rem" }}>Paste the completed CSV template below. FAST validates hierarchy, catalogue codes, duplicate asset codes, status values, JSON technical data, and required fields before creating any records.</p>
          <form action={importEquipmentCsv}>
            <label>Equipment CSV<textarea name="csv_text" required rows={16} placeholder="Paste FAST_EQUIPMENT_IMPORT_TEMPLATE.csv contents here" style={{ width: "100%", marginTop: "0.5rem", fontFamily: "monospace" }} /></label>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1rem", flexWrap: "wrap" }}><Button type="submit">Validate and import</Button><a className="button button-secondary" download href="/FAST_EQUIPMENT_IMPORT_TEMPLATE.csv">Download template</a><span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No records are created when validation fails.</span></div>
          </form>
        </Card>
      ) : null}

      {view === "setup" ? (
        <Card className="workflow-action-card equipment-setup-panel">
          <div className="workflow-section-heading"><div><span className="record-card-kicker">REGISTER ASSET</span><h2 style={{ fontSize: "1rem", margin: "0.25rem 0 0" }}>Create the property structure, then register equipment</h2></div><span className="record-status">Controlled setup</span></div>
          <p style={{ color: "var(--muted)", margin: "0 0 1rem" }}>Use this workflow when FAST adds a building, protection system, or asset. Existing assets remain in the Asset register.</p>
          <EquipmentForms buildings={buildingOptions} createBuildingAction={createBuildingRecord} createEquipmentAction={createEquipmentRecord} createSystemAction={createSystemRecord} equipmentTypes={equipmentTypeOptions} sites={siteOptions} systems={systemOptions} />
        </Card>
      ) : null}

      {view === "catalogue" ? (
        <section className="equipment-catalogue-view" aria-labelledby="catalogue-heading">
          <div className="workspace-section-heading"><div><span className="record-card-kicker">REFERENCE CATALOGUE</span><h2 id="catalogue-heading">Equipment types and technical templates</h2><p>Use the approved type code when registering an asset. Technical fields appear automatically on the registration form.</p></div><Link className="button button-primary" href="/equipment?view=setup">Register an asset</Link></div>
          <form className="equipment-catalogue-toolbar" method="get">
            <input name="view" type="hidden" value="catalogue" />
            <label>Search catalogue<input aria-label="Search equipment catalogue" name="catalog_search" defaultValue={params?.catalog_search ?? ""} placeholder="Search code or equipment type" /></label>
            <label>System family<select aria-label="Filter catalogue by system family" name="family" defaultValue={selectedFamily}><option value="">All system families</option>{familyOptions.map((family) => <option key={family} value={family}>{familyLabel(family)}</option>)}</select></label>
            <Button type="submit">Apply filters</Button>
            {catalogueSearch || selectedFamily ? <Link className="button button-secondary" href="/equipment?view=catalogue">Clear</Link> : null}
          </form>
          <Card className="equipment-catalogue-table-card">
            <div className="table-context"><strong>{filteredCatalogue.length} catalogue types</strong><span>Global reference types are available to all FAST organisation assets.</span></div>
            <div className="table-scroll"><table className="data-table equipment-catalogue-table"><thead><tr><th>Code</th><th>Equipment type</th><th>System family</th><th>Technical fields</th><th>Customer view</th></tr></thead><tbody>{filteredCatalogue.map((type) => <tr key={type.id}><td><strong className="catalogue-code">{type.code}</strong></td><td><strong>{type.name}</strong></td><td>{familyLabel(type.systemType)}</td><td>{type.fields.length ? <span>{type.fields.length} fields</span> : <span className="text-muted">No template fields</span>}<small className="table-cell-subtext">{type.fields.slice(0, 3).map((field) => field.label).join(" · ")}{type.fields.length > 3 ? " · …" : ""}</small></td><td>{type.fields.filter((field) => field.customer_visible).length} visible</td></tr>)}</tbody></table></div>
          </Card>
        </section>
      ) : null}

      {view === "assets" ? (
        <section className="equipment-assets-view" aria-labelledby="assets-heading">
          <div className="workspace-section-heading"><div><span className="record-card-kicker">ASSET REGISTER</span><h2 id="assets-heading">Registered equipment</h2><p>Search operational assets by identity, location, type, or status. Select an asset to open its complete workspace.</p></div><Link className="button button-primary" href="/equipment?view=setup">Register an asset</Link></div>
          <FilterBar description="Active assets are available for maintenance assignment. Retired assets remain visible for history." items={equipmentFilters.map((filter) => ({ count: statusCount(filter.key), href: filter.key === "ACTIVE" ? "/equipment" : `/equipment?status=${filter.key}`, key: filter.key, label: filter.label }))} selectedKey={selectedStatus} />
          <form className="equipment-search-toolbar" method="get"><input aria-label="Search equipment" defaultValue={params?.search ?? ""} name="search" placeholder="Search asset code, serial, brand, model, location" /><input name="status" type="hidden" value={selectedStatus} /><Button type="submit">Search assets</Button>{searchTerm ? <Link className="button button-secondary" href={selectedStatus === "ACTIVE" ? "/equipment" : `/equipment?status=${selectedStatus}`}>Clear</Link> : null}</form>
          <form className="table-toolbar equipment-sort-toolbar" method="get"><input name="status" type="hidden" value={selectedStatus} />{params?.search ? <input name="search" type="hidden" value={params.search} /> : null}<label>Sort assets<select name="sort" defaultValue={selectedSort}><option value="created_desc">Recently added</option><option value="asset_asc">Asset code</option></select></label><Button type="submit" variant="secondary">Apply sort</Button></form>
          {equipmentError ? <ErrorState title="Equipment unavailable" message="The equipment list could not be loaded." /> : equipment && equipment.length > 0 ? <Card className="equipment-assets-table-card"><div className="table-context"><strong>{equipmentCount ?? 0} matching assets</strong><span>Page {requestedPage} · 50 assets per page</span></div><div className="table-scroll"><table className="data-table responsive-detail-table equipment-assets-table"><thead><tr><th>Asset</th><th>Type / family</th><th>Client / site</th><th>System</th><th>Location</th><th>Status</th></tr></thead><tbody>{equipment.map((asset) => <tr key={asset.id}><td data-label="Asset"><strong><Link href={`/equipment/${asset.id}`}>{asset.asset_code}</Link></strong><small className="table-cell-subtext">{[asset.brand, asset.model, asset.serial_number].filter(Boolean).join(" · ") || "Identity details incomplete"}</small></td><td data-label="Type / family">{asset.equipment_types?.name ?? "Not set"}<small className="table-cell-subtext">{asset.equipment_types?.system_type ? familyLabel(asset.equipment_types.system_type) : "Family not set"}</small></td><td data-label="Client / site">{asset.buildings?.sites?.name ?? "Site not set"}<small className="table-cell-subtext">{asset.buildings?.name ?? "Building not set"}</small></td><td data-label="System">{asset.systems?.name ?? "Not assigned"}</td><td data-label="Location">{asset.location_description ?? "Not recorded"}</td><td data-label="Status"><span className={`equipment-status equipment-status-${asset.status.toLowerCase()}`}>{statusLabel[asset.status] ?? asset.status}</span></td></tr>)}</tbody></table></div></Card> : <EmptyState title={allEquipmentCount ? "No assets match this view" : "No equipment registered"} message={allEquipmentCount ? "Adjust the status or search filters." : "Use Register an asset to add the first equipment record."} />}
          {equipment && equipment.length > 0 ? <PaginationControls basePath="/equipment" page={requestedPage} pageSize={pageSize} query={{ status: selectedStatus, search: params?.search, sort: selectedSort }} total={equipmentCount ?? 0} /> : null}
        </section>
      ) : null}
    </div>
  );
}

