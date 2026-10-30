import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

export default async function ClientEquipmentDetailPage({
  params,
}: {
  params: Promise<{ equipmentId: string }>;
}) {
  const profile = await requireProfile();
  if (!canAccessClientPortal(profile.role)) notFound();
  const { equipmentId } = await params;
  const supabase = await createClient();
  const { data: equipment, error } = await supabase
    .from("equipment")
    .select(
      "id,asset_code,serial_number,brand,model,capacity,location_description,installation_date,status,qr_token,technical_data,buildings(name,sites(name)),systems(name,code),equipment_types(id,name,code)",
    )
    .eq("id", equipmentId)
    .maybeSingle();
  if (error || !equipment) notFound();
  const [{ data: fields }, { data: documents }, { data: linkedJobs }] =
    await Promise.all([
      supabase
        .from("equipment_type_fields")
        .select("id,field_key,label,unit,customer_visible,sort_order")
        .eq("equipment_type_id", equipment.equipment_types?.id ?? "")
        .eq("active", true)
        .eq("customer_visible", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("equipment_documents")
        .select(
          "id,title,document_type,storage_path,file_name,mime_type,size_bytes,created_at",
        )
        .eq("equipment_id", equipmentId)
        .eq("customer_visible", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("job_equipment")
        .select(
          "id,status,created_at,maintenance_jobs(job_number,scheduled_date,status)",
        )
        .eq("equipment_id", equipmentId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  const technicalData =
    equipment.technical_data &&
    typeof equipment.technical_data === "object" &&
    !Array.isArray(equipment.technical_data)
      ? (equipment.technical_data as Record<string, unknown>)
      : {};
  const signedDocuments = await Promise.all(
    (documents ?? []).map(async (document) => {
      const { data } = await supabase.storage
        .from("documents")
        .createSignedUrl(document.storage_path, 60 * 60);
      return { ...document, signedUrl: data?.signedUrl ?? null };
    }),
  );
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader
        title={equipment.asset_code}
        description="Customer equipment record shared by FAST."
      />
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href="/client/equipment" className="button button-secondary">
          Back to equipment
        </Link>
        <Link
          href={`/client/equipment/qr/${equipment.qr_token}`}
          className="button"
        >
          QR lookup
        </Link>
        <Link
          href={`/client/requests/new?equipment=${encodeURIComponent(equipment.asset_code)}`}
          className="button"
        >
          Report an issue
        </Link>
      </div>
      <Card>
        <span className="record-card-kicker">CUSTOMER-SAFE ASSET RECORD</span>
        <h2>{equipment.equipment_types?.name ?? "Equipment"}</h2>
        <div className="record-card-facts">
          <div>
            <span>Status</span>
            <strong>{equipment.status}</strong>
          </div>
          <div>
            <span>Serial number</span>
            <strong>{equipment.serial_number ?? "Not recorded"}</strong>
          </div>
          <div>
            <span>Manufacturer / model</span>
            <strong>
              {[equipment.brand, equipment.model].filter(Boolean).join(" / ") ||
                "Not recorded"}
            </strong>
          </div>
          <div>
            <span>Capacity</span>
            <strong>{equipment.capacity ?? "Not recorded"}</strong>
          </div>
          <div>
            <span>Installation date</span>
            <strong>{equipment.installation_date ?? "Not recorded"}</strong>
          </div>
          <div>
            <span>Location</span>
            <strong>
              {equipment.buildings?.name ?? "Building"} ·{" "}
              {equipment.buildings?.sites?.name ?? "Site"}
            </strong>
          </div>
        </div>
        <p style={{ color: "var(--muted)" }}>
          System: {equipment.systems?.name ?? "Not assigned"}
          {equipment.systems?.code ? ` · ${equipment.systems.code}` : ""}
          <br />
          Location detail: {equipment.location_description ?? "Not recorded"}
        </p>
      </Card>
      <Card>
        <div className="record-card-heading">
          <div>
            <span className="record-card-kicker">
              SHARED TECHNICAL INFORMATION
            </span>
            <h2>Technical information</h2>
          </div>
        </div>
        {fields && fields.length > 0 ? (
          <div className="record-card-facts" style={{ marginTop: "1rem" }}>
            {fields.map((field) => (
              <div key={field.id}>
                <span>{field.label}</span>
                <strong>
                  {technicalData[field.field_key] === undefined
                    ? "Not recorded"
                    : String(technicalData[field.field_key])}
                  {field.unit ? ` ${field.unit}` : ""}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--muted)" }}>
            No customer-facing technical information has been shared.
          </p>
        )}
      </Card>
      <Card>
        <div className="record-card-heading">
          <div>
            <span className="record-card-kicker">SHARED DOCUMENTS</span>
            <h2>Documents</h2>
          </div>
          <span className="record-status">{signedDocuments.length} shared</span>
        </div>
        {signedDocuments.length > 0 ? (
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            {signedDocuments.map((document) => (
              <div
                key={document.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  alignItems: "center",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "0.75rem",
                }}
              >
                <div>
                  <strong>{document.title}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                    {document.document_type} · {document.file_name ?? "File"}
                  </div>
                </div>
                {document.signedUrl ? (
                  <a href={document.signedUrl} rel="noreferrer" target="_blank">
                    Download
                  </a>
                ) : (
                  <span>Unavailable</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--muted)" }}>
            No customer-facing documents have been shared.
          </p>
        )}
      </Card>
      <Card>
        <div className="record-card-heading">
          <div>
            <span className="record-card-kicker">SERVICE HISTORY</span>
            <h2>Maintenance history</h2>
          </div>
        </div>
        {linkedJobs && linkedJobs.length > 0 ? (
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            {linkedJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: "0.75rem",
                }}
              >
                <strong>
                  {job.maintenance_jobs?.job_number ?? "Maintenance job"}
                </strong>
                <div style={{ color: "var(--muted)" }}>
                  {job.maintenance_jobs?.scheduled_date ?? "Date not set"} ·{" "}
                  {job.maintenance_jobs?.status ?? "Status not set"} · Asset
                  status {job.status}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--muted)" }}>
            No shared maintenance history is available.
          </p>
        )}
      </Card>
    </div>
  );
}
