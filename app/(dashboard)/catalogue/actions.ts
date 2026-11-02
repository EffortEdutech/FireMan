"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import type { Database, Json } from "@/lib/supabase/database.types";

const approvalStatuses = new Set(["DRAFT", "IN_REVIEW", "APPROVED", "RETIRED"]);
const systemTypes = new Set<Database["public"]["Enums"]["system_type"]>([
  "FIRE_ALARM", "FIRE_EXTINGUISHING", "HOSE_REEL", "SPRINKLER", "EMERGENCY_LIGHTING", "EXIT_SIGNAGE",
  "HYDRANT_RISER", "FIRE_PUMP", "GASEOUS_SUPPRESSION", "WATER_SPRAY_MIST", "CO2_SUPPRESSION", "FOAM_SUPPRESSION",
  "KITCHEN_SUPPRESSION", "PASSIVE_PROTECTION", "SMOKE_CONTROL", "EMERGENCY_LIFE_SAFETY", "SPECIAL_HAZARD",
  "DRY_CHEMICAL", "FIRE_WATER_SUPPLY", "ASPIRATING_SMOKE", "GAS_DETECTION", "FIRE_EVACUATION", "FIRE_BRIGADE_COMMS", "OTHER"
]);

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function redirectWith(id: string | null, key: string) {
  redirect(`/catalogue${id ? `?selected=${id}&` : "?"}${key}=1`);
}

async function requireCatalogueManager() {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");
  return profile;
}

function canApprove(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

function standardsValue(raw: string): Json {
  return raw.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

async function audit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Awaited<ReturnType<typeof requireProfile>>,
  input: Omit<Database["public"]["Tables"]["catalogue_audit_events"]["Insert"], "actor_id" | "organisation_id">
) {
  await supabase.from("catalogue_audit_events").insert({ ...input, actor_id: profile.id, organisation_id: null });
}

export async function createCatalogueRecord(formData: FormData) {
  const profile = await requireCatalogueManager();
  const name = value(formData, "name");
  const code = value(formData, "code").toUpperCase();
  const systemType = value(formData, "system_type") as Database["public"]["Enums"]["system_type"];
  if (!name || !code || !systemTypes.has(systemType)) redirect("/catalogue?error=invalid-record");

  const supabase = await createClient();
  const { data, error } = await supabase.from("equipment_types").insert({
    organisation_id: null,
    name,
    code,
    system_type: systemType,
    description: value(formData, "description") || null,
    reference_standards: standardsValue(value(formData, "reference_standards")),
    catalogue_version: 1,
    approval_status: "DRAFT",
    active: false
  }).select("id,catalogue_version").single();
  if (error || !data) redirect(`/catalogue?error=${encodeURIComponent(error?.message ?? "create-failed")}`);
  await audit(supabase, profile, { entity_type: "EQUIPMENT_TYPE", entity_id: data.id, action: "CREATED", to_status: "DRAFT", catalogue_version: data.catalogue_version, metadata: { code } });
  revalidatePath("/catalogue");
  redirectWith(data.id, "created");
}

export async function updateCatalogueRecord(formData: FormData) {
  const profile = await requireCatalogueManager();
  const id = value(formData, "equipment_type_id");
  const supabase = await createClient();
  const { data: current } = await supabase.from("equipment_types").select("id,approval_status,catalogue_version,code").eq("id", id).is("organisation_id", null).maybeSingle();
  if (!current || !["DRAFT", "IN_REVIEW"].includes(current.approval_status)) redirect(`/catalogue?selected=${id}&error=version-locked`);
  const name = value(formData, "name");
  const code = value(formData, "code").toUpperCase();
  const systemType = value(formData, "system_type") as Database["public"]["Enums"]["system_type"];
  if (!name || !code || !systemTypes.has(systemType)) redirect(`/catalogue?selected=${id}&error=invalid-record`);
  const { error } = await supabase.from("equipment_types").update({ name, code, system_type: systemType, description: value(formData, "description") || null, reference_standards: standardsValue(value(formData, "reference_standards")) }).eq("id", id).is("organisation_id", null);
  if (error) redirect(`/catalogue?selected=${id}&error=${encodeURIComponent(error.message)}`);
  await audit(supabase, profile, { entity_type: "EQUIPMENT_TYPE", entity_id: id, action: "UPDATED", from_status: current.approval_status, to_status: current.approval_status, catalogue_version: current.catalogue_version, metadata: { code } });
  revalidatePath("/catalogue");
  redirectWith(id, "saved");
}

export async function changeCatalogueStatus(formData: FormData) {
  const profile = await requireCatalogueManager();
  const id = value(formData, "equipment_type_id");
  const nextStatus = value(formData, "next_status");
  if (!approvalStatuses.has(nextStatus)) redirect(`/catalogue?selected=${id}&error=invalid-status`);
  if (nextStatus === "APPROVED" || nextStatus === "RETIRED") {
    if (!canApprove(profile.role)) redirect(`/catalogue?selected=${id}&error=approval-role-required`);
  }
  const supabase = await createClient();
  const { data: current } = await supabase.from("equipment_types").select("id,approval_status,catalogue_version,code").eq("id", id).is("organisation_id", null).maybeSingle();
  if (!current) redirect(`/catalogue?error=record-not-found`);
  const { error } = await supabase.from("equipment_types").update({ approval_status: nextStatus, active: nextStatus === "APPROVED" }).eq("id", id).is("organisation_id", null);
  if (error) redirect(`/catalogue?selected=${id}&error=${encodeURIComponent(error.message)}`);
  if (nextStatus === "APPROVED") await supabase.from("inspection_templates").update({ status: "ACTIVE" }).eq("equipment_type_id", id).is("organisation_id", null).eq("status", "DRAFT");
  if (nextStatus === "RETIRED") await supabase.from("inspection_templates").update({ status: "ARCHIVED" }).eq("equipment_type_id", id).is("organisation_id", null).eq("status", "ACTIVE");
  await audit(supabase, profile, { entity_type: "EQUIPMENT_TYPE", entity_id: id, action: "STATUS_CHANGED", from_status: current.approval_status, to_status: nextStatus, catalogue_version: current.catalogue_version, metadata: { code: current.code } });
  revalidatePath("/catalogue");
  revalidatePath("/equipment");
  redirectWith(id, "status");
}

export async function duplicateCatalogueVersion(formData: FormData) {
  const profile = await requireCatalogueManager();
  const id = value(formData, "equipment_type_id");
  const supabase = await createClient();
  const { data: source } = await supabase.from("equipment_types").select("*").eq("id", id).is("organisation_id", null).maybeSingle();
  if (!source) redirect("/catalogue?error=record-not-found");
  const { data: versions } = await supabase.from("equipment_types").select("catalogue_version").is("organisation_id", null).eq("code", source.code).order("catalogue_version", { ascending: false }).limit(1);
  const nextVersion = (versions?.[0]?.catalogue_version ?? source.catalogue_version) + 1;
  const { data: copy, error } = await supabase.from("equipment_types").insert({ organisation_id: null, name: source.name, code: source.code, system_type: source.system_type, description: source.description, active: false, catalogue_version: nextVersion, approval_status: "DRAFT", reference_standards: source.reference_standards, supersedes_id: source.id }).select("id,catalogue_version").single();
  if (error || !copy) redirect(`/catalogue?selected=${id}&error=${encodeURIComponent(error?.message ?? "duplicate-failed")}`);
  const { data: fields } = await supabase.from("equipment_type_fields").select("field_key,label,field_type,unit,options,required,customer_visible,sort_order,active").eq("equipment_type_id", id).is("organisation_id", null);
  if (fields?.length) await supabase.from("equipment_type_fields").insert(fields.map((field) => ({ ...field, organisation_id: null, equipment_type_id: copy.id })));
  const { data: templates } = await supabase.from("inspection_templates").select("id,name,code,version,status,description").eq("equipment_type_id", id).is("organisation_id", null);
  for (const template of templates ?? []) {
    const { data: newTemplate } = await supabase.from("inspection_templates").insert({ organisation_id: null, equipment_type_id: copy.id, name: template.name, code: `${template.code}-V${nextVersion}`, version: nextVersion, status: "DRAFT", description: template.description }).select("id").single();
    if (newTemplate) {
      const { data: items } = await supabase.from("inspection_template_items").select("section,item_code,prompt,field_type,options,required,sort_order,guidance,fail_creates_finding,metadata").eq("template_id", template.id);
      if (items?.length) await supabase.from("inspection_template_items").insert(items.map((item) => ({ ...item, template_id: newTemplate.id })));
    }
  }
  await audit(supabase, profile, { entity_type: "EQUIPMENT_TYPE", entity_id: copy.id, action: "VERSION_DUPLICATED", from_status: source.approval_status, to_status: "DRAFT", catalogue_version: nextVersion, metadata: { supersedes_id: source.id, code: source.code } });
  revalidatePath("/catalogue");
  redirectWith(copy.id, "duplicated");
}

export async function saveCatalogueField(formData: FormData) {
  const profile = await requireCatalogueManager();
  const typeId = value(formData, "equipment_type_id");
  const fieldId = value(formData, "field_id");
  const supabase = await createClient();
  const { data: parent } = await supabase.from("equipment_types").select("approval_status").eq("id", typeId).is("organisation_id", null).maybeSingle();
  if (!parent || !["DRAFT", "IN_REVIEW"].includes(parent.approval_status)) redirect(`/catalogue?selected=${typeId}&error=version-locked`);
  const fieldType = value(formData, "field_type") as Database["public"]["Enums"]["template_field_type"];
  const payload = { equipment_type_id: typeId, organisation_id: null, field_key: value(formData, "field_key"), label: value(formData, "label"), field_type: fieldType, unit: value(formData, "unit") || null, options: standardsValue(value(formData, "options")), required: formData.get("required") === "on", customer_visible: formData.get("customer_visible") === "on", sort_order: Number(value(formData, "sort_order") || 0), active: true };
  const result = fieldId ? await supabase.from("equipment_type_fields").update(payload).eq("id", fieldId).eq("equipment_type_id", typeId) : await supabase.from("equipment_type_fields").insert(payload);
  if (result.error) redirect(`/catalogue?selected=${typeId}&error=${encodeURIComponent(result.error.message)}`);
  await audit(supabase, profile, { entity_type: "EQUIPMENT_TYPE_FIELD", entity_id: fieldId || typeId, action: fieldId ? "FIELD_UPDATED" : "FIELD_CREATED", metadata: { field_key: payload.field_key } });
  revalidatePath("/catalogue");
  redirectWith(typeId, "field-saved");
}

export async function saveChecklistTemplate(formData: FormData) {
  const profile = await requireCatalogueManager();
  const typeId = value(formData, "equipment_type_id");
  const templateId = value(formData, "template_id");
  const supabase = await createClient();
  const { data: parent } = await supabase.from("equipment_types").select("approval_status").eq("id", typeId).is("organisation_id", null).maybeSingle();
  if (!parent || !["DRAFT", "IN_REVIEW"].includes(parent.approval_status)) redirect(`/catalogue?selected=${typeId}&error=version-locked`);
  const payload = { organisation_id: null, equipment_type_id: typeId, name: value(formData, "template_name"), code: value(formData, "template_code").toUpperCase(), version: Number(value(formData, "template_version") || 1), status: "DRAFT" as const, description: value(formData, "template_description") || null };
  const result = templateId ? await supabase.from("inspection_templates").update(payload).eq("id", templateId).eq("equipment_type_id", typeId) : await supabase.from("inspection_templates").insert(payload);
  if (result.error) redirect(`/catalogue?selected=${typeId}&error=${encodeURIComponent(result.error.message)}`);
  await audit(supabase, profile, { entity_type: "INSPECTION_TEMPLATE", entity_id: templateId || typeId, action: templateId ? "TEMPLATE_UPDATED" : "TEMPLATE_CREATED", metadata: { code: payload.code } });
  revalidatePath("/catalogue");
  redirectWith(typeId, "template-saved");
}

export async function saveChecklistItem(formData: FormData) {
  const profile = await requireCatalogueManager();
  const typeId = value(formData, "equipment_type_id");
  const templateId = value(formData, "template_id");
  const itemId = value(formData, "item_id");
  const supabase = await createClient();
  const { data: parent } = await supabase.from("equipment_types").select("approval_status").eq("id", typeId).is("organisation_id", null).maybeSingle();
  if (!parent || !["DRAFT", "IN_REVIEW"].includes(parent.approval_status)) redirect(`/catalogue?selected=${typeId}&error=version-locked`);
  const fieldType = value(formData, "item_field_type") as Database["public"]["Enums"]["template_field_type"];
  const payload = { template_id: templateId, section: value(formData, "item_section") || "General", item_code: value(formData, "item_code").toUpperCase(), prompt: value(formData, "item_prompt"), field_type: fieldType, options: standardsValue(value(formData, "item_options")), required: formData.get("item_required") === "on", sort_order: Number(value(formData, "item_sort_order") || 0), guidance: value(formData, "item_guidance") || null, fail_creates_finding: formData.get("item_fail_finding") === "on", metadata: {} };
  const result = itemId ? await supabase.from("inspection_template_items").update(payload).eq("id", itemId).eq("template_id", templateId) : await supabase.from("inspection_template_items").insert(payload);
  if (result.error) redirect(`/catalogue?selected=${typeId}&error=${encodeURIComponent(result.error.message)}`);
  await audit(supabase, profile, { entity_type: "INSPECTION_TEMPLATE_ITEM", entity_id: itemId || templateId, action: itemId ? "ITEM_UPDATED" : "ITEM_CREATED", metadata: { item_code: payload.item_code } });
  revalidatePath("/catalogue");
  redirectWith(typeId, "item-saved");
}

export async function importCatalogueCsv(formData: FormData) {
  await requireCatalogueManager();
  const file = formData.get("catalogue_file");
  if (!(file instanceof File) || file.size === 0) redirect("/catalogue?error=import-empty");
  const lines = (await file.text()).split(/\r?\n/).filter(Boolean).map((line) => line.split(",").map((value) => value.trim().replace(/^"|"$/g, "")));
  const headers = lines.shift()?.map((header) => header.toLowerCase()) ?? [];
  const required = ["code", "name", "system_type", "description", "reference_standards"];
  const exported = [...required, "catalogue_version", "approval_status"];
  if (headers.join("|") !== required.join("|") && headers.join("|") !== exported.join("|")) redirect("/catalogue?error=import-headers");
  const supabase = await createClient();
  let imported = 0;
  for (const row of lines) {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
    const code = String(record.code).toUpperCase();
    const systemType = String(record.system_type) as Database["public"]["Enums"]["system_type"];
    if (!code || !record.name || !systemTypes.has(systemType)) continue;
    const { data: versions } = await supabase.from("equipment_types").select("catalogue_version").is("organisation_id", null).eq("code", code).order("catalogue_version", { ascending: false }).limit(1);
    const nextVersion = (versions?.[0]?.catalogue_version ?? 0) + 1;
    const { error } = await supabase.from("equipment_types").insert({ organisation_id: null, code, name: String(record.name), system_type: systemType, description: String(record.description) || null, reference_standards: standardsValue(String(record.reference_standards)), catalogue_version: nextVersion, approval_status: "DRAFT", active: false });
    if (!error) imported += 1;
  }
  revalidatePath("/catalogue");
  redirect(`/catalogue?imported=${imported}`);
}

