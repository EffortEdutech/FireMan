"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

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
  "WATER_SPRAY_MIST",
  "GASEOUS_SUPPRESSION",
  "CO2_SUPPRESSION",
  "FOAM_SUPPRESSION",
  "KITCHEN_SUPPRESSION",
  "PASSIVE_PROTECTION",
  "SMOKE_CONTROL",
  "EMERGENCY_LIFE_SAFETY",
  "SPECIAL_HAZARD",
  "DRY_CHEMICAL",
  "FIRE_WATER_SUPPLY",
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

type ImportRow = Record<string, string>;

const importHeaders = [
  "asset_code",
  "equipment_type_code",
  "client_name",
  "site_name",
  "building_name",
  "system_code",
  "location_description",
  "manufacturer",
  "model",
  "serial_number",
  "capacity",
  "installation_date",
  "status",
  "technical_data_json",
  "document_references",
  "customer_visible"
];

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  if (rows.length < 2) return { error: "CSV must include a header and at least one asset row." };

  const headers = (rows[0] ?? []).map((header) => header.trim());
  if (headers.join("|") !== importHeaders.join("|")) {
    return { error: `CSV headers must match the FAST template exactly. Expected: ${importHeaders.join(",")}` };
  }

  return { rows: rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))) as ImportRow[] };
}

const importStatuses = new Set<Database["public"]["Enums"]["equipment_status"]>(["ACTIVE", "OUT_OF_SERVICE", "RETIRED"]);

export async function importEquipmentCsv(formData: FormData) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");

  const rawCsv = value(formData, "csv_text");
  if (!rawCsv) redirect("/equipment?view=import&error=import-empty");
  const parsed = parseCsv(rawCsv);
  if (parsed.error || !parsed.rows) redirect(`/equipment?view=import&error=${encodeURIComponent(parsed.error ?? "CSV could not be read.")}`);

  const supabase = await createClient();
  const [{ data: buildings }, { data: systems }, { data: equipmentTypes }, { data: existingEquipment }] = await Promise.all([
    supabase.from("buildings").select("id,name,site_id,sites(name,clients(name))").eq("organisation_id", profile.organisation_id).eq("active", true),
    supabase.from("systems").select("id,building_id,code,name").eq("organisation_id", profile.organisation_id).eq("active", true),
    supabase.from("equipment_types").select("id,code").or(`organisation_id.is.null,organisation_id.eq.${profile.organisation_id}`).eq("active", true),
    supabase.from("equipment").select("asset_code").eq("organisation_id", profile.organisation_id)
  ]);
  if (!buildings || !systems || !equipmentTypes || !existingEquipment) redirect("/equipment?view=import&error=import-reference-data");

  const [{ data: technicalFields }] = await Promise.all([
    supabase.from("equipment_type_fields").select("equipment_type_id,field_key,field_type,required").eq("active", true).order("sort_order", { ascending: true })
  ]);
  const existingCodes = new Set(existingEquipment.map((equipment) => equipment.asset_code.toLowerCase()));
  const batchCodes = new Set<string>();
  const errors: string[] = [];
  const inserts: Database["public"]["Tables"]["equipment"]["Insert"][] = [];

  for (const [index, row] of parsed.rows.entries()) {
    const line = index + 2;
    const assetCode = row.asset_code ?? "";
    const equipmentTypeCode = row.equipment_type_code ?? "";
    const clientName = row.client_name ?? "";
    const siteName = row.site_name ?? "";
    const buildingName = row.building_name ?? "";
    const systemCode = row.system_code ?? "";
    const type = equipmentTypes.find((candidate) => candidate.code.toLowerCase() === equipmentTypeCode.trim().toLowerCase());
    const building = buildings.find((candidate) => candidate.name.toLowerCase() === buildingName.trim().toLowerCase() && candidate.sites?.name?.toLowerCase() === siteName.trim().toLowerCase() && candidate.sites?.clients?.name?.toLowerCase() === clientName.trim().toLowerCase());
    const system = systemCode ? systems.find((candidate) => candidate.building_id === building?.id && (candidate.code?.toLowerCase() === systemCode.trim().toLowerCase() || candidate.name.toLowerCase() === systemCode.trim().toLowerCase())) : null;
    const status = ((row.status ?? "ACTIVE") || "ACTIVE") as Database["public"]["Enums"]["equipment_status"];
    if (!assetCode) errors.push(`Line ${line}: asset_code is required.`);
    if (assetCode && (existingCodes.has(assetCode.toLowerCase()) || batchCodes.has(assetCode.toLowerCase()))) errors.push(`Line ${line}: asset_code ${assetCode} already exists or is duplicated.`);
    if (!type) errors.push(`Line ${line}: equipment_type_code ${equipmentTypeCode || "(blank)"} was not found.`);
    if (!building) errors.push(`Line ${line}: client/site/building could not be matched.`);
    if (systemCode && !system) errors.push(`Line ${line}: system_code ${systemCode} was not found in the selected building.`);
    if (!importStatuses.has(status)) errors.push(`Line ${line}: status must be ACTIVE, OUT_OF_SERVICE, or RETIRED.`);
    let technicalData: Record<string, unknown> = {};
    if (row.technical_data_json) {
      try {
        const parsedTechnical = JSON.parse(row.technical_data_json) as unknown;
        if (!parsedTechnical || typeof parsedTechnical !== "object" || Array.isArray(parsedTechnical)) throw new Error("object required");
        technicalData = parsedTechnical as Record<string, unknown>;
      } catch {
        errors.push(`Line ${line}: technical_data_json must be a valid JSON object.`);
      }
    }
    const fields = technicalFields?.filter((field) => field.equipment_type_id === type?.id) ?? [];
    for (const field of fields) {
      const fieldValue = technicalData[field.field_key];
      if (field.required && (fieldValue === undefined || fieldValue === null || fieldValue === "")) errors.push(`Line ${line}: required technical field ${field.field_key} is missing.`);
      if (field.field_type === "NUMBER" && fieldValue !== undefined && (typeof fieldValue !== "number" || !Number.isFinite(fieldValue))) errors.push(`Line ${line}: technical field ${field.field_key} must be numeric.`);
    }
    if (!errors.some((message) => message.startsWith(`Line ${line}:`)) && type && building) {
      batchCodes.add(assetCode.toLowerCase());
      inserts.push({ organisation_id: profile.organisation_id, building_id: building.id, system_id: system?.id ?? null, equipment_type_id: type.id, asset_code: assetCode, serial_number: row.serial_number || null, brand: row.manufacturer || null, model: row.model || null, capacity: row.capacity || null, location_description: row.location_description || null, installation_date: row.installation_date || null, status, technical_data: technicalData as unknown as Json });
    }
  }

  if (errors.length) redirect(`/equipment?view=import&error=${encodeURIComponent(errors.slice(0, 5).join(" "))}`);
  const { error } = await supabase.from("equipment").insert(inserts);
  if (error) redirect(`/equipment?view=import&error=${encodeURIComponent(error.code ?? "equipment-import-failed")}`);
  revalidatePath("/equipment");
  revalidatePath("/dashboard");
  redirect(`/equipment?imported=${inserts.length}`);
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

const equipmentStatuses = new Set<Database["public"]["Enums"]["equipment_status"]>(["ACTIVE", "OUT_OF_SERVICE", "RETIRED"]);

export async function updateEquipmentRecord(formData: FormData) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");

  const equipmentId = value(formData, "equipment_id");
  const buildingId = value(formData, "building_id");
  const systemId = value(formData, "system_id");
  const parentEquipmentId = value(formData, "parent_equipment_id");
  const protectedHazardId = value(formData, "protected_hazard_id");
  const statusValue = value(formData, "status") as Database["public"]["Enums"]["equipment_status"] | null;
  if (!equipmentId || !buildingId || !statusValue || !equipmentStatuses.has(statusValue)) {
    redirect(`/equipment/${equipmentId ?? ""}?error=invalid-asset-update`);
  }

  const supabase = await createClient();
  const [{ data: building }, { data: system }, { data: parentEquipment }, { data: hazard }] = await Promise.all([
    supabase.from("buildings").select("id").eq("id", buildingId).eq("organisation_id", profile.organisation_id).eq("active", true).maybeSingle(),
    systemId ? supabase.from("systems").select("id,building_id").eq("id", systemId).eq("organisation_id", profile.organisation_id).eq("active", true).maybeSingle() : Promise.resolve({ data: null }),
    parentEquipmentId ? supabase.from("equipment").select("id,building_id").eq("id", parentEquipmentId).eq("organisation_id", profile.organisation_id).maybeSingle() : Promise.resolve({ data: null }),
    protectedHazardId ? supabase.from("protected_hazards").select("id,building_id,system_id").eq("id", protectedHazardId).eq("organisation_id", profile.organisation_id).eq("active", true).maybeSingle() : Promise.resolve({ data: null })
  ]);

  if (!building) redirect(`/equipment/${equipmentId}?error=building-mismatch`);
  if (systemId && (!system || system.building_id !== buildingId)) redirect(`/equipment/${equipmentId}?error=system-building-mismatch`);
  if (parentEquipmentId && (!parentEquipment || parentEquipment.id === equipmentId || parentEquipment.building_id !== buildingId)) redirect(`/equipment/${equipmentId}?error=parent-equipment-mismatch`);
  if (protectedHazardId && (!hazard || hazard.building_id !== buildingId || (systemId && hazard.system_id !== systemId))) redirect(`/equipment/${equipmentId}?error=hazard-mismatch`);

  const { error } = await supabase.from("equipment").update({
    building_id: buildingId,
    system_id: systemId,
    parent_equipment_id: parentEquipmentId,
    protected_hazard_id: protectedHazardId,
    asset_code: value(formData, "asset_code") ?? "",
    serial_number: value(formData, "serial_number"),
    brand: value(formData, "brand"),
    model: value(formData, "model"),
    capacity: value(formData, "capacity"),
    location_description: value(formData, "location_description"),
    installation_date: value(formData, "installation_date"),
    status: statusValue
  }).eq("id", equipmentId).eq("organisation_id", profile.organisation_id);
  if (error) redirect(`/equipment/${equipmentId}?error=asset-update-failed`);

  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath("/equipment");
  redirect(`/equipment/${equipmentId}?saved=asset`);
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

