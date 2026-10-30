import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessTechnician } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

export default async function TechnicianAssetPage({
  params,
}: {
  params: Promise<{ equipmentId: string }>;
}) {
  const profile = await requireProfile();
  if (!canAccessTechnician(profile.role)) notFound();
  const { equipmentId } = await params;
  const supabase = await createClient();
  const { data: equipment } = await supabase
    .from("equipment")
    .select(
      "id,asset_code,status,serial_number,location_description,buildings(name,sites(name)),systems(name),equipment_types(name)",
    )
    .eq("id", equipmentId)
    .maybeSingle();
  if (!equipment) notFound();
  const { data: jobEquipment } = await supabase
    .from("job_equipment")
    .select(
      "id,job_id,status,maintenance_jobs(job_number,scheduled_date,status,assigned_technician_id)",
    )
    .eq("equipment_id", equipmentId)
    .order("created_at", { ascending: false })
    .limit(20);
  const assignedJobs =
    jobEquipment?.filter(
      (asset) =>
        asset.maintenance_jobs?.assigned_technician_id === profile.id ||
        canAccessTechnician(profile.role),
    ) ?? [];
  const { data: inspections } =
    assignedJobs.length > 0
      ? await supabase
          .from("inspections")
          .select("id,job_equipment_id,status,inspection_templates(name)")
          .in(
            "job_equipment_id",
            assignedJobs.map((asset) => asset.id),
          )
      : { data: [] };
  const inspectionByAsset = new Map(
    inspections?.map((inspection) => [
      inspection.job_equipment_id,
      inspection,
    ]) ?? [],
  );
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader
        title={equipment.asset_code}
        description="Field-service asset view from QR scan."
      />
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href="/technician/scan" className="button button-secondary">
          Scan another asset
        </Link>
        <Link href="/technician/today" className="button">
          Today’s work
        </Link>
      </div>
      <Card>
        <span className="record-card-kicker">FIELD ASSET</span>
        <h2>{equipment.equipment_types?.name ?? "Equipment"}</h2>
        <div className="record-card-facts">
          <div>
            <span>Status</span>
            <strong>{equipment.status}</strong>
          </div>
          <div>
            <span>Serial</span>
            <strong>{equipment.serial_number ?? "Not recorded"}</strong>
          </div>
          <div>
            <span>Location</span>
            <strong>
              {equipment.buildings?.name ?? "Building"} ·{" "}
              {equipment.buildings?.sites?.name ?? "Site"}
            </strong>
          </div>
          <div>
            <span>System</span>
            <strong>{equipment.systems?.name ?? "Not assigned"}</strong>
          </div>
        </div>
        <p style={{ color: "var(--muted)" }}>
          {equipment.location_description ?? "Location not recorded"}
        </p>
      </Card>
      <Card>
        <div className="record-card-heading">
          <div>
            <span className="record-card-kicker">ASSIGNED WORK</span>
            <h2>Inspections and maintenance jobs</h2>
          </div>
          <span className="record-status">{assignedJobs.length} jobs</span>
        </div>
        {assignedJobs.length > 0 ? (
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            {assignedJobs.map((asset) => {
              const inspection = inspectionByAsset.get(asset.id);
              return (
                <div
                  key={asset.id}
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: "0.75rem",
                  }}
                >
                  <strong>
                    {asset.maintenance_jobs?.job_number ?? "Maintenance job"}
                  </strong>
                  <div style={{ color: "var(--muted)" }}>
                    {asset.maintenance_jobs?.scheduled_date ?? "Date not set"} ·{" "}
                    {asset.maintenance_jobs?.status ?? "Status not set"} · Asset{" "}
                    {asset.status}
                  </div>
                  {inspection ? (
                    <div>
                      Checklist:{" "}
                      {inspection.inspection_templates?.name ?? "Inspection"} ·{" "}
                      {inspection.status}
                    </div>
                  ) : (
                    <div>No checklist started</div>
                  )}
                  <Link href={`/technician/jobs/${asset.job_id}`}>
                    Open job
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: "var(--muted)" }}>
            No assigned maintenance work for this asset.
          </p>
        )}
      </Card>
    </div>
  );
}
