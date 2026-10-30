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

type TechnicalField = {
  field_key: string;
  field_type: Database["public"]["Enums"]["template_field_type"];
  required: boolean;
};

function technicalDataValue(formData: FormData, fields: TechnicalField[]) {
  const technicalData: Record<string, string | number | boolean> = {};

  for (const field of fields) {
    const raw = value(formData, `technical_${field.field_key}`);

    if (!raw) {
      if (field.required) {
        return { error: field.field_key };
      }
      continue;
    }

    if (field.field_type === "NUMBER") {
      const numberValue = Number(raw);
      if (!Number.isFinite(numberValue)) {
        return { error: field.field_key };
      }
      technicalData[field.field_key] = numberValue;
    } else if (field.field_type === "YES_NO") {
      technicalData[field.field_key] = raw === "true";
    } else {
      technicalData[field.field_key] = raw;
    }
  }

  return { data: technicalData };
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
  const [{ data: building, error: buildingError }, { data: system, error: systemError }, { data: equipmentType, error: equipmentTypeError }] = await Promise.all([
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
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("equipment_types")
      .select("id")
      .eq("id", equipmentTypeId)
      .or(`organisation_id.is.null,organisation_id.eq.${profile.organisation_id}`)
      .eq("active", true)
      .maybeSingle()
  ]);

  if (buildingError || !building) {
    redirect("/equipment?error=building-mismatch");
  }

  if (systemError || (systemId && system?.building_id !== buildingId)) {
    redirect("/equipment?error=system-building-mismatch");
  }

  if (equipmentTypeError || !equipmentType) {
    redirect("/equipment?error=equipment-type-mismatch");
  }

  const { data: technicalFields, error: fieldsError } = await supabase
    .from("equipment_type_fields")
    .select("field_key,field_type,required")
    .eq("equipment_type_id", equipmentTypeId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (fieldsError) {
    redirect("/equipment?error=technical-template-unavailable");
  }

  const technicalData = technicalDataValue(formData, technicalFields ?? []);
  if (technicalData.error) {
    redirect(`/equipment?error=${encodeURIComponent(`invalid-technical-data-${technicalData.error}`)}`);
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
    installation_date: value(formData, "installation_date"),
    technical_data: technicalData.data ?? {}
  });

  if (error) {
    redirect(`/equipment?error=${encodeURIComponent(error.code ?? "equipment-create-failed")}`);
  }

  revalidatePath("/equipment");
  revalidatePath("/dashboard");
  redirect("/equipment?equipment=1");
}

export async function updateEquipmentTechnicalData(formData: FormData) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");

  const equipmentId = value(formData, "equipment_id");
  if (!equipmentId) redirect("/equipment?error=missing-equipment");

  const supabase = await createClient();
  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .select("id,equipment_type_id")
    .eq("id", equipmentId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();
  if (equipmentError || !equipment) redirect(`/equipment/${equipmentId}?error=equipment-not-found`);

  const { data: fields, error: fieldsError } = await supabase
    .from("equipment_type_fields")
    .select("field_key,field_type,required")
    .eq("equipment_type_id", equipment.equipment_type_id)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (fieldsError) redirect(`/equipment/${equipmentId}?error=technical-template-unavailable`);

  const technicalData = technicalDataValue(formData, fields ?? []);
  if (technicalData.error) redirect(`/equipment/${equipmentId}?error=${encodeURIComponent(`invalid-technical-data-${technicalData.error}`)}`);

  const { error } = await supabase.from("equipment").update({ technical_data: technicalData.data ?? {} }).eq("id", equipmentId);
  if (error) redirect(`/equipment/${equipmentId}?error=technical-data-save-failed`);

  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath("/equipment");
  redirect(`/equipment/${equipmentId}?saved=technical-data`);
}

export async function uploadEquipmentDocument(formData: FormData) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");

  const equipmentId = value(formData, "equipment_id");
  const title = value(formData, "title");
  const documentType = value(formData, "document_type");
  const fileEntry = formData.get("file");
  if (!equipmentId || !title || !documentType || !(fileEntry instanceof File) || fileEntry.size === 0) {
    redirect(`/equipment/${equipmentId ?? ""}?error=missing-document`);
  }
  if (fileEntry.size > 15 * 1024 * 1024) redirect(`/equipment/${equipmentId}?error=document-too-large`);

  const supabase = await createClient();
  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .select("id")
    .eq("id", equipmentId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();
  if (equipmentError || !equipment) redirect(`/equipment/${equipmentId}?error=equipment-not-found`);

  const extension = fileEntry.name.includes(".") ? fileEntry.name.split(".").pop()?.toLowerCase() : "bin";
  const storagePath = `${profile.organisation_id}/equipment/${equipmentId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, fileEntry, { contentType: fileEntry.type || "application/octet-stream", upsert: false });
  if (uploadError) redirect(`/equipment/${equipmentId}?error=document-upload-failed`);

  const { error: documentError } = await supabase.from("equipment_documents").insert({
    organisation_id: profile.organisation_id,
    equipment_id: equipmentId,
    title,
    document_type: documentType,
    storage_path: storagePath,
    file_name: fileEntry.name,
    mime_type: fileEntry.type || null,
    size_bytes: fileEntry.size,
    customer_visible: formData.get("customer_visible") === "on",
    uploaded_by: profile.id
  });
  if (documentError) {
    await supabase.storage.from("documents").remove([storagePath]);
    redirect(`/equipment/${equipmentId}?error=document-record-failed`);
  }

  revalidatePath(`/equipment/${equipmentId}`);
  redirect(`/equipment/${equipmentId}?saved=document`);
}
