import QRCode from "qrcode";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PrintLabelButton } from "@/components/equipment/print-label-button";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

export default async function EquipmentLabelPage({
  params,
}: {
  params: Promise<{ equipmentId: string }>;
}) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) notFound();
  const { equipmentId } = await params;
  const supabase = await createClient();
  const { data: equipment } = await supabase
    .from("equipment")
    .select(
      "id,asset_code,qr_token,location_description,equipment_types(name),buildings(name,sites(name))",
    )
    .eq("id", equipmentId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();
  if (!equipment) notFound();
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "fire-man.vercel.app";
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  const scanUrl = `${protocol}://${host}/technician/scan?qrToken=${encodeURIComponent(equipment.qr_token)}`;
  const qrDataUrl = await QRCode.toDataURL(scanUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
  return (
    <div
      style={{ display: "grid", gap: "1rem", maxWidth: 560, margin: "0 auto" }}
    >
      <style>
        {
          "@media print { body { background: white !important; } .no-print { display: none !important; } .qr-label { border: 2px solid #111 !important; box-shadow: none !important; } }"
        }
      </style>
      <div className="no-print">
        <a href={`/equipment/${equipment.id}`}>← Back to equipment</a>
      </div>
      <Card
        className="qr-label"
        style={{
          textAlign: "center",
          border: "2px solid var(--border)",
          padding: "2rem",
        }}
      >
        <div
          style={{
            letterSpacing: "0.16em",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          FAST FIRE PROTECTION
        </div>
        <h1 style={{ margin: "0.75rem 0 0.25rem", fontSize: "2rem" }}>
          {equipment.asset_code}
        </h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {equipment.equipment_types?.name ?? "Equipment"}
        </p>
        <Image
          alt={`QR code for ${equipment.asset_code}`}
          height={320}
          src={qrDataUrl}
          style={{ display: "block", margin: "1rem auto", maxWidth: "100%" }}
          unoptimized
          width={320}
        />
        <strong>Scan for field service</strong>
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>
          {equipment.buildings?.name ?? "Building"} ·{" "}
          {equipment.buildings?.sites?.name ?? "Site"}
          <br />
          {equipment.location_description ?? "Location not recorded"}
        </p>
      </Card>
      <div
        className="no-print"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <PrintLabelButton />
      </div>
    </div>
  );
}
