import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

export default async function ClientEquipmentPage() {
  const profile = await requireProfile();
  if (!canAccessClientPortal(profile.role)) redirect("/dashboard");
  const supabase = await createClient();
  const { data: equipment, error } = await supabase
    .from("equipment")
    .select("id,asset_code,serial_number,brand,model,capacity,location_description,installation_date,status,buildings(name,sites(name)),systems(name),equipment_types(name,code)")
    .order("asset_code", { ascending: true });

  return <div style={{ display: "grid", gap: "1rem" }}><PageHeader title="Equipment" description="View the fire-protection equipment recorded for your buildings." />{error ? <EmptyState title="Equipment unavailable" message="FAST equipment records could not be loaded." /> : equipment && equipment.length > 0 ? <div className="record-grid">{equipment.map((asset) => <Card className="record-card" key={asset.id}><div className="record-card-heading"><div><span className="record-card-kicker">CUSTOMER ASSET</span><h2><Link href={`/client/equipment/${asset.id}`}>{asset.asset_code}</Link></h2></div><span className="record-status">{asset.status}</span></div><div className="record-card-facts"><div><span>Equipment</span><strong>{asset.equipment_types?.name ?? "Not set"}</strong></div><div><span>System</span><strong>{asset.systems?.name ?? "Not set"}</strong></div></div><div className="record-card-contact"><span>Location</span><strong>{asset.buildings?.name ?? "Building"} · {asset.buildings?.sites?.name ?? "Site"}</strong><small>{[asset.brand, asset.model, asset.serial_number].filter(Boolean).join(" / ") || asset.location_description || "Technical details not recorded"}</small></div><Link href={`/client/equipment/${asset.id}`}>View customer equipment record</Link></Card>)}</div> : <EmptyState title="No equipment available" message="FAST has not shared equipment records for your client account yet." />}</div>;
}
