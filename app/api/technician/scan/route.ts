import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { canAccessTechnician } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";
import { normalizeAssetCode } from "@/lib/maintenance/asset-scan";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !canAccessTechnician(profile.role)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const code = normalizeAssetCode(new URL(request.url).searchParams.get("assetCode") ?? "");
  if (!code) return NextResponse.json({ error: "missing-asset-code" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("id,asset_code,status,location_description,buildings(name,sites(name,clients(name)),systems(name),equipment_types(name))")
    .eq("asset_code", code)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "lookup-failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "asset-not-found" }, { status: 404 });

  const building = Array.isArray(data.buildings) ? data.buildings[0] : data.buildings;
  const site = Array.isArray(building?.sites) ? building?.sites[0] : building?.sites;
  const client = Array.isArray(site?.clients) ? site?.clients[0] : site?.clients;
  const type = Array.isArray(building?.equipment_types) ? building?.equipment_types[0] : building?.equipment_types;

  return NextResponse.json({
    asset: {
      id: data.id,
      assetCode: data.asset_code,
      status: data.status,
      typeName: type?.name ?? "Equipment",
      location: data.location_description ?? "Location not set",
      buildingName: building?.name ?? "Building not set",
      siteName: site?.name ?? "Site not set",
      clientName: client?.name ?? "Client not set"
    }
  });
}
