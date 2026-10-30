import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { canAccessTechnician } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";
import { normalizeAssetCode } from "@/lib/maintenance/asset-scan";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !canAccessTechnician(profile.role))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const searchParams = new URL(request.url).searchParams;
  const code = normalizeAssetCode(searchParams.get("assetCode") ?? "");
  const qrToken = normalizeAssetCode(searchParams.get("qrToken") ?? "");
  if (!code && !qrToken)
    return NextResponse.json({ error: "missing-asset-code" }, { status: 400 });

  const supabase = await createClient();
  const equipmentQuery = supabase
    .from("equipment")
    .select(
      "id,asset_code,status,location_description,qr_token,buildings(name,sites(name,clients(name))),systems(name),equipment_types(name)",
    )
    .eq("status", "ACTIVE");
  const { data, error } = qrToken
    ? await equipmentQuery.eq("qr_token", qrToken).maybeSingle()
    : await equipmentQuery.eq("asset_code", code).maybeSingle();

  if (error)
    return NextResponse.json({ error: "lookup-failed" }, { status: 500 });
  if (!data)
    return NextResponse.json({ error: "asset-not-found" }, { status: 404 });

  const building = Array.isArray(data.buildings)
    ? data.buildings[0]
    : data.buildings;
  const site = Array.isArray(building?.sites)
    ? building?.sites[0]
    : building?.sites;
  const client = Array.isArray(site?.clients)
    ? site?.clients[0]
    : site?.clients;
  const type = Array.isArray(data.equipment_types)
    ? data.equipment_types[0]
    : data.equipment_types;

  return NextResponse.json({
    asset: {
      id: data.id,
      assetCode: data.asset_code,
      status: data.status,
      typeName: type?.name ?? "Equipment",
      location: data.location_description ?? "Location not set",
      buildingName: building?.name ?? "Building not set",
      siteName: site?.name ?? "Site not set",
      clientName: client?.name ?? "Client not set",
      fieldUrl: `/technician/asset/${data.id}`,
    },
  });
}
