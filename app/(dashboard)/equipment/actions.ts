"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type SystemType = Database["public"]["Enums"]["system_type"];

const systemTypes = new Set<SystemType>([
  "FIRE_ALARM",
  "FIRE_EXTINGUISHING",
  "HOSE_REEL",
  "SPRINKLER",
  "EMERGENCY_LIGHTING",
  "EXIT_SIGNAGE",
  "HYDRANT_RISER",
  "FIRE_PUMP",
  "GASEOUS_SUPPRESSION",
  "FOAM_SUPPRESSION",
  "PASSIVE_PROTECTION",
  "SMOKE_CONTROL",
  "OTHER"
]);

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  const text = typeof entry === "string" ? entry.trim() : "";
  return text.length > 0 ? text : null;
}

function systemTypeValue(formData: FormData) {
  const type = value(formData, "system_type");
  return type && systemTypes.has(type as SystemType) ? (type as SystemType) : null;
}

export async function createBuildingRecord(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const siteId = value(formData, "site_id");
  const name = value(formData, "name");
  const floors = value(formData, "floors");

  if (!siteId || !name) {
    redirect("/equipment?error=missing-building");
  }

  const supabase = await createClient();
  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("organisation_id", profile.organisation_id)
    .eq("active", true)
    .maybeSingle();

  if (siteError || !site) {
    redirect("/equipment?error=site-mismatch");
  }

  const { error } = await supabase.from("buildings").insert({
    organisation_id: profile.organisation_id,
    site_id: siteId,
    name,
    code: value(formData, "code"),
    floors: floors ? Number(floors) : null,
    description: value(formData, "description")
  });

  if (error) {
    redirect(`/equipment?error=${encodeURIComponent(error.code ?? "building-create-failed")}`);
  }

  revalidatePath("/equipment");
  redirect("/equipment?building=1");
}

export async function createSystemRecord(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const buildingId = value(formData, "building_id");
  const name = value(formData, "name");
  const systemType = systemTypeValue(formData);

  if (!buildingId || !name || !systemType) {
    redirect("/equipment?error=missing-system");
  }

  const supabase = await createClient();
  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("id")
    .eq("id", buildingId)
    .eq("organisation_id", profile.organisation_id)
    .eq("active", true)
    .maybeSingle();

  if (buildingError || !building) {
    redirect("/equipment?error=building-mismatch");
  }

  const { error } = await supabase.from("systems").insert({
    organisation_id: profile.organisation_id,
    building_id: buildingId,
    name,
    system_type: systemType,
    code: value(formData, "code"),
    description: value(formData, "description")
  });

  if (error) {
    redirect(`/equipment?error=${encodeURIComponent(error.code ?? "system-create-failed")}`);
  }

  revalidatePath("/equipment");
  redirect("/equipment?system=1");
}

export async function createEquipmentRecord(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const buildingId = value(formData, "building_id");
  const equipmentTypeId = value(formData, "equipment_type_id");
  const assetCode = value(formData, "asset_code");
  const systemId = value(formData, "system_id");

  if (!buildingId || !equipmentTypeId || !assetCode) {
    redirect("/equipment?error=missing-equipment");
  }

  const supabase = await createClient();
  const [{ data: building, error: buildingError }, { data: system, error: systemError }] = await Promise.all([
    supabase
      .from("buildings")
      .select("id")
      .eq("id", buildingId)
      .eq("organisation_id", profile.organisation_id)
      .eq("active", true)
      .maybeSingle(),
    systemId
      ? supabase
          .from("systems")
          .select("id,building_id")
          .eq("id", systemId)
          .eq("organisation_id", profile.organisation_id)
          .eq("active", true)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  if (buildingError || !building) {
    redirect("/equipment?error=building-mismatch");
  }

  if (systemError || (systemId && system?.building_id !== buildingId)) {
    redirect("/equipment?error=system-building-mismatch");
  }

  const { error } = await supabase.from("equipment").insert({
    organisation_id: profile.organisation_id,
    building_id: buildingId,
    system_id: systemId,
    equipment_type_id: equipmentTypeId,
    asset_code: assetCode,
    serial_number: value(formData, "serial_number"),
    brand: value(formData, "brand"),
    model: value(formData, "model"),
    capacity: value(formData, "capacity"),
    location_description: value(formData, "location_description"),
    installation_date: value(formData, "installation_date")
  });

  if (error) {
    redirect(`/equipment?error=${encodeURIComponent(error.code ?? "equipment-create-failed")}`);
  }

  revalidatePath("/equipment");
  revalidatePath("/dashboard");
  redirect("/equipment?equipment=1");
}
