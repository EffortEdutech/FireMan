import { redirect } from "next/navigation";
import { createBuildingRecord, createEquipmentRecord, createSystemRecord } from "@/app/(dashboard)/equipment/actions";
import { EquipmentForms } from "@/app/(dashboard)/equipment/equipment-forms";
import { Card } from "@/components/ui/card";
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
    { data: equipment, error: equipmentError }
  ] = await Promise.all([
    supabase.from("sites").select("id,name,clients(name)").eq("active", true).order("name", { ascending: true }),
    supabase.from("buildings").select("id,name,code,active,sites(name,clients(name))").eq("active", true).order("name", { ascending: true }),
    supabase.from("systems").select("id,building_id,name,code,system_type,active,buildings(name,sites(name))").eq("active", true).order("name", { ascending: true }),
    supabase.from("equipment_types").select("id,name,code,system_type").or(`organisation_id.is.null,organisation_id.eq.${profile.organisation_id}`).eq("active", true).order("name", { ascending: true }),
    supabase
      .from("equipment")
      .select("id,asset_code,brand,model,capacity,location_description,status,buildings(name,sites(name)),systems(name),equipment_types(name,code)")
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
    equipmentTypes?.map((type) => ({ id: type.id, name: type.name, code: type.code })) ?? [];
  const selectedStatus = equipmentFilters.some((filter) => filter.key === params?.status) ? params?.status ?? "ACTIVE" : "ACTIVE";
  const equipmentCounts = new Map<string, number>();
  const filteredEquipment =
    equipment?.filter((asset) => {
      equipmentCounts.set(asset.status, (equipmentCounts.get(asset.status) ?? 0) + 1);

      if (selectedStatus === "all") {
        return true;
      }

      return asset.status === selectedStatus;
    }) ?? [];
  const filterCountByKey = (key: string) => {
    if (key === "all") {
      return equipment?.length ?? 0;
    }

    return equipmentCounts.get(key) ?? 0;
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Equipment" description="Register buildings, fire systems, and maintainable assets." />
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
                  : "The register item could not be saved."
          }
        />
      ) : null}
      {sitesError || buildingsError || systemsError || typesError ? (
        <ErrorState title="Register setup unavailable" message="Some register choices could not be loaded." />
      ) : null}

      <Card>
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
        {filteredEquipment.length > 0 ? (
        <>
        <div className="record-grid" aria-label="Equipment register">
          {filteredEquipment.map((asset) => <Card className="record-card" key={asset.id}>
            <div className="record-card-heading"><div><span className="record-card-kicker">ASSET REGISTER</span><h2>{asset.asset_code}</h2></div><span className={asset.status === "ACTIVE" ? "record-status record-status-active" : "record-status"}>{statusLabel[asset.status] ?? asset.status}</span></div>
            <div className="record-card-facts"><div><span>Equipment type</span><strong>{asset.equipment_types?.name ?? "Not set"}</strong></div><div><span>System</span><strong>{asset.systems?.name ?? "Not set"}</strong></div></div>
            <div className="record-card-contact"><span>Building / site</span><strong>{asset.buildings?.name ?? "Not set"} · {asset.buildings?.sites?.name ?? "Not set"}</strong><small>{[asset.brand, asset.model, asset.capacity].filter(Boolean).join(" / ") || asset.location_description || "Details not set"}</small></div>
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
                    <strong>{asset.asset_code}</strong>
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

