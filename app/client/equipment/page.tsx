import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

type ClientEquipmentPageProps = { searchParams?: Promise<{ q?: string; status?: string; site?: string }> };
const statusOptions = ["ALL", "ACTIVE", "OUT_OF_SERVICE", "RETIRED"];
function displayStatus(status: string) { return status.replaceAll("_", " "); }

export default async function ClientEquipmentPage({ searchParams }: ClientEquipmentPageProps) {
  const profile = await requireProfile();
  if (!canAccessClientPortal(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const selectedStatus = statusOptions.includes(params?.status ?? "") ? params?.status ?? "ALL" : "ALL";
  const selectedSite = params?.site ?? "ALL";
  const supabase = await createClient();
  const [{ data: equipment, error }, { data: documents }] = await Promise.all([
    supabase.from("equipment").select("id,asset_code,serial_number,brand,model,capacity,location_description,installation_date,status,buildings!equipment_building_id_fkey(name,sites(name)),systems!equipment_system_id_fkey(name),equipment_types(name,code)").order("asset_code", { ascending: true }),
    supabase.from("equipment_documents").select("equipment_id").eq("customer_visible", true),
  ]);
  const documentCountByEquipment = new Map<string, number>();
  (documents ?? []).forEach((document) => documentCountByEquipment.set(document.equipment_id, (documentCountByEquipment.get(document.equipment_id) ?? 0) + 1));
  const siteNames = Array.from(new Set((equipment ?? []).map((asset) => asset.buildings?.sites?.name).filter(Boolean))).sort();
  const filteredEquipment = (equipment ?? []).filter((asset) => {
    const siteName = asset.buildings?.sites?.name ?? "";
    const matchesStatus = selectedStatus === "ALL" || asset.status === selectedStatus;
    const matchesSite = selectedSite === "ALL" || siteName === selectedSite;
    const haystack = [asset.asset_code, asset.equipment_types?.name, asset.systems?.name, siteName, asset.buildings?.name, asset.serial_number, asset.brand, asset.model].filter(Boolean).join(" ").toLowerCase();
    return matchesStatus && matchesSite && (!query || haystack.includes(query.toLowerCase()));
  });
  return <div className="client-page-stack client-equipment-page">
    <PageHeader title="Equipment" description="Find the fire-protection assets FAST has shared with your organisation." />
    <div className="client-portal-summary" aria-label="Equipment summary">
      <div><span>Shared assets</span><strong>{equipment?.length ?? 0}</strong></div><div><span>Showing</span><strong>{filteredEquipment.length}</strong></div><div><span>Customer documents</span><strong>{documents?.length ?? 0}</strong></div><Link className="button button-secondary" href="/client/requests/new">New service request</Link>
    </div>
    <Card className="client-filter-panel"><form className="client-equipment-filters" method="get">
      <label>Search equipment<input name="q" defaultValue={query} placeholder="Asset code, system, site, serial…" /></label>
      <label>Status<select name="status" defaultValue={selectedStatus}>{statusOptions.map((status) => <option key={status} value={status}>{status === "ALL" ? "All statuses" : displayStatus(status)}</option>)}</select></label>
      <label>Site<select name="site" defaultValue={selectedSite}><option value="ALL">All sites</option>{siteNames.map((site) => <option key={site} value={site}>{site}</option>)}</select></label>
      <button className="button button-primary" type="submit">Apply filters</button>{(query || selectedStatus !== "ALL" || selectedSite !== "ALL") ? <Link className="button button-secondary" href="/client/equipment">Clear</Link> : null}
    </form></Card>
    {error ? <EmptyState title="Equipment unavailable" message="FAST equipment records could not be loaded." /> : filteredEquipment.length > 0 ? <Card className="table-scroll client-equipment-table-card" style={{ padding: 0 }}><table className="data-table client-equipment-table"><thead><tr><th>Asset</th><th>Equipment / system</th><th>Site / building</th><th>Status</th><th>Documents</th><th>Action</th></tr></thead><tbody>{filteredEquipment.map((asset) => <tr key={asset.id}><td><Link href={`/client/equipment/${asset.id}`}><strong>{asset.asset_code}</strong></Link><small className="table-cell-subtext">{[asset.brand, asset.model, asset.serial_number].filter(Boolean).join(" / ") || "No identifier recorded"}</small></td><td><strong>{asset.equipment_types?.name ?? "Equipment"}</strong><small className="table-cell-subtext">{asset.systems?.name ?? "System not assigned"}</small></td><td><strong>{asset.buildings?.sites?.name ?? "Site not recorded"}</strong><small className="table-cell-subtext">{asset.buildings?.name ?? asset.location_description ?? "Building not recorded"}</small></td><td><span className={`status-badge ${asset.status === "ACTIVE" ? "status-badge-success" : asset.status === "OUT_OF_SERVICE" ? "status-badge-danger" : "status-badge-muted"}`}>{displayStatus(asset.status)}</span></td><td>{documentCountByEquipment.get(asset.id) ?? 0} shared</td><td><Link href={`/client/equipment/${asset.id}`}>Open record →</Link></td></tr>)}</tbody></table></Card> : <EmptyState title={equipment?.length ? "No matching equipment" : "No equipment available"} message={equipment?.length ? "Try a different search or filter." : "FAST has not shared equipment records for your client account yet."} />}
  </div>;
}
