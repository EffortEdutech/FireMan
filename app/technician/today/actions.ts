"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessTechnician } from "@/lib/permissions/roles";
import {
  correctiveRepairPhotoLimit,
  isValidCorrectiveRepairPhoto,
  isValidRepairSubmission
} from "@/lib/corrective/repair-evidence";
import { evaluateReading, findReadingDefinition, units, type UnitCode } from "@/lib/reports/readings";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type FindingSeverity = Database["public"]["Enums"]["finding_severity"];
type InspectionResultStatus = Database["public"]["Enums"]["inspection_result_status"];

const severities = new Set<FindingSeverity>(["OBSERVATION", "LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const inspectionResultStatuses = new Set<InspectionResultStatus>(["PASS", "ATTENTION", "FAIL", "NA"]);

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  const text = typeof entry === "string" ? entry.trim() : "";
  return text.length > 0 ? text : null;
}

function optionalPhoto(formData: FormData, name: string) {
  const entry = formData.get(name);

  if (!(entry instanceof File) || entry.size === 0) {
    return null;
  }

  return entry;
}

function nextPath(formData: FormData) {
  const next = value(formData, "next");
  return next?.startsWith("/technician/") ? next : "/technician/today";
}

function severityValue(formData: FormData) {
  const severity = value(formData, "severity");
  return severity && severities.has(severity as FindingSeverity) ? (severity as FindingSeverity) : "OBSERVATION";
}

function inspectionResultValue(formData: FormData) {
  const result = value(formData, "result_status");
  return result && inspectionResultStatuses.has(result as InspectionResultStatus) ? (result as InspectionResultStatus) : null;
}

export async function startJob(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessTechnician(profile.role)) {
    redirect("/dashboard");
  }

  const jobId = value(formData, "job_id");

  if (!jobId) {
    redirect("/technician/today?error=missing-job");
  }

  const redirectTo = nextPath(formData);
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_maintenance_job", { p_job_id: jobId });

  if (error) {
    redirect(`/technician/today?error=${encodeURIComponent(error.code ?? "start-failed")}`);
  }

  revalidatePath("/technician/today");
  revalidatePath(`/technician/jobs/${jobId}`);
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  redirect(`${redirectTo}?started=1`);
}

export async function submitJob(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessTechnician(profile.role)) {
    redirect("/dashboard");
  }

  const jobId = value(formData, "job_id");

  if (!jobId) {
    redirect("/technician/today?error=missing-job");
  }

  const redirectTo = nextPath(formData);
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_job", { p_job_id: jobId });

  if (error) {
    redirect(`/technician/today?error=${encodeURIComponent(error.code ?? "submit-failed")}`);
  }

  revalidatePath("/technician/today");
  revalidatePath(`/technician/jobs/${jobId}`);
  revalidatePath("/maintenance");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  redirect(`${redirectTo}?submitted=1`);
}

export async function addFinding(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessTechnician(profile.role)) {
    redirect("/dashboard");
  }

  const jobId = value(formData, "job_id");
  const title = value(formData, "title");
  const equipmentId = value(formData, "equipment_id");

  if (!jobId || !title) {
    redirect("/technician/today?error=missing-finding");
  }

  const redirectTo = nextPath(formData);
  const supabase = await createClient();
  const { data: job, error: jobError } = await supabase
    .from("maintenance_jobs")
    .select("id,organisation_id")
    .eq("id", jobId)
    .eq("assigned_technician_id", profile.id)
    .eq("status", "IN_PROGRESS")
    .single();

  if (jobError || !job) {
    redirect("/technician/today?error=job-not-started");
  }

  if (equipmentId) {
    const { data: assignedAsset, error: equipmentError } = await supabase
      .from("job_equipment")
      .select("id")
      .eq("job_id", job.id)
      .eq("equipment_id", equipmentId)
      .maybeSingle();

    if (equipmentError || !assignedAsset) {
      redirect(`${redirectTo}?error=equipment-not-assigned`);
    }
  }

  const { data: finding, error } = await supabase.from("findings").insert({
    organisation_id: job.organisation_id,
    job_id: job.id,
    equipment_id: equipmentId,
    title,
    severity: severityValue(formData),
    description: value(formData, "description"),
    recommendation: value(formData, "recommendation"),
    created_by: profile.id
  }).select("id").single();

  if (error || !finding) {
    redirect(`/technician/today?error=${encodeURIComponent(error.code ?? "finding-failed")}`);
  }

  const photo = optionalPhoto(formData, "photo");

  if (photo) {
    const extension = photo.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const storagePath = `${job.organisation_id}/${job.id}/${finding.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("inspection-photos")
      .upload(storagePath, photo, {
        contentType: photo.type || "image/jpeg",
        upsert: false
      });

    if (uploadError) {
      redirect(`${redirectTo}?error=${encodeURIComponent(uploadError.message ?? "photo-upload-failed")}`);
    }

    const { error: photoError } = await supabase.from("finding_photos").insert({
      organisation_id: job.organisation_id,
      finding_id: finding.id,
      storage_path: storagePath,
      caption: value(formData, "photo_caption")
    });

    if (photoError) {
      redirect(`${redirectTo}?error=${encodeURIComponent(photoError.code ?? "photo-save-failed")}`);
    }
  }

  revalidatePath("/technician/today");
  revalidatePath(`/technician/jobs/${jobId}`);
  redirect(`${redirectTo}?finding=1`);
}

export async function startAssetInspection(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessTechnician(profile.role)) {
    redirect("/dashboard");
  }

  const jobEquipmentId = value(formData, "job_equipment_id");
  const redirectTo = nextPath(formData);

  if (!jobEquipmentId) {
    redirect(`${redirectTo}?error=missing-asset`);
  }

  const supabase = await createClient();
  const { data: assignedAsset, error: assetError } = await supabase
    .from("job_equipment")
    .select("id,job_id,organisation_id,equipment(equipment_type_id),maintenance_jobs(assigned_technician_id,status)")
    .eq("id", jobEquipmentId)
    .maybeSingle();

  const assignedToCurrentUser = Array.isArray(assignedAsset?.maintenance_jobs)
    ? assignedAsset?.maintenance_jobs[0]?.assigned_technician_id === profile.id
    : assignedAsset?.maintenance_jobs?.assigned_technician_id === profile.id;
  const jobStatus = Array.isArray(assignedAsset?.maintenance_jobs)
    ? assignedAsset?.maintenance_jobs[0]?.status
    : assignedAsset?.maintenance_jobs?.status;
  const equipmentTypeId = Array.isArray(assignedAsset?.equipment)
    ? assignedAsset?.equipment[0]?.equipment_type_id
    : assignedAsset?.equipment?.equipment_type_id;

  if (assetError || !assignedAsset || !assignedToCurrentUser || jobStatus !== "IN_PROGRESS" || !equipmentTypeId) {
    redirect(`${redirectTo}?error=inspection-not-ready`);
  }

  const { data: template, error: templateError } = await supabase
    .from("inspection_templates")
    .select("id")
    .eq("equipment_type_id", equipmentTypeId)
    .eq("status", "ACTIVE")
    .or(`organisation_id.is.null,organisation_id.eq.${profile.organisation_id}`)
    .order("organisation_id", { ascending: false, nullsFirst: false })
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (templateError || !template) {
    redirect(`${redirectTo}?error=missing-template`);
  }

  const { data: inspection, error: inspectionError } = await supabase
    .from("inspections")
    .upsert(
      {
        organisation_id: assignedAsset.organisation_id,
        job_id: assignedAsset.job_id,
        job_equipment_id: assignedAsset.id,
        template_id: template.id,
        technician_id: profile.id,
        status: "IN_PROGRESS",
        started_at: new Date().toISOString()
      },
      { onConflict: "job_equipment_id" }
    )
    .select("id")
    .single();

  if (inspectionError || !inspection) {
    redirect(`${redirectTo}?error=${encodeURIComponent(inspectionError?.code ?? "inspection-start-failed")}`);
  }

  const { error: statusError } = await supabase
    .from("job_equipment")
    .update({ status: "IN_PROGRESS" })
    .eq("id", assignedAsset.id);

  if (statusError) {
    redirect(`${redirectTo}?error=${encodeURIComponent(statusError.code ?? "asset-status-failed")}`);
  }

  revalidatePath("/technician/today");
  revalidatePath(`/technician/jobs/${assignedAsset.job_id}`);
  redirect(`${redirectTo}?inspection=1`);
}

export async function completeAssetInspection(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessTechnician(profile.role)) {
    redirect("/dashboard");
  }

  const inspectionId = value(formData, "inspection_id");
  const jobEquipmentId = value(formData, "job_equipment_id");
  const jobId = value(formData, "job_id");
  const redirectTo = nextPath(formData);

  if (!inspectionId || !jobEquipmentId || !jobId) {
    redirect(`${redirectTo}?error=missing-inspection`);
  }

  const supabase = await createClient();
  const { error: inspectionError } = await supabase.rpc("submit_inspection", { p_inspection_id: inspectionId });

  if (inspectionError) {
    redirect(`${redirectTo}?error=${encodeURIComponent(inspectionError.code ?? "inspection-complete-failed")}`);
  }

  const { error: statusError } = await supabase
    .from("job_equipment")
    .update({ status: "COMPLETED" })
    .eq("id", jobEquipmentId);

  if (statusError) {
    redirect(`${redirectTo}?error=${encodeURIComponent(statusError.code ?? "asset-complete-failed")}`);
  }

  revalidatePath("/technician/today");
  revalidatePath(`/technician/jobs/${jobId}`);
  redirect(`${redirectTo}?inspectionCompleted=1`);
}

export async function saveInspectionResult(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessTechnician(profile.role)) {
    redirect("/dashboard");
  }

  const inspectionId = value(formData, "inspection_id");
  const templateItemId = value(formData, "template_item_id");
  const jobId = value(formData, "job_id");
  const resultStatus = inspectionResultValue(formData);
  const redirectTo = nextPath(formData);

  if (!inspectionId || !templateItemId || !jobId || !resultStatus) {
    redirect(`${redirectTo}?error=missing-result`);
  }

  const supabase = await createClient();
  const { data: inspection, error: inspectionError } = await supabase
    .from("inspections")
    .select("id,organisation_id,template_id,status,maintenance_jobs(assigned_technician_id,status)")
    .eq("id", inspectionId)
    .maybeSingle();

  const assignedToCurrentUser = Array.isArray(inspection?.maintenance_jobs)
    ? inspection?.maintenance_jobs[0]?.assigned_technician_id === profile.id
    : inspection?.maintenance_jobs?.assigned_technician_id === profile.id;
  const jobStatus = Array.isArray(inspection?.maintenance_jobs)
    ? inspection?.maintenance_jobs[0]?.status
    : inspection?.maintenance_jobs?.status;

  if (inspectionError || !inspection || !assignedToCurrentUser || inspection.status !== "IN_PROGRESS" || jobStatus !== "IN_PROGRESS") {
    redirect(`${redirectTo}?error=inspection-not-ready`);
  }

  const { data: templateItem, error: itemError } = await supabase
    .from("inspection_template_items")
    .select("id")
    .eq("id", templateItemId)
    .eq("template_id", inspection.template_id)
    .maybeSingle();

  if (itemError || !templateItem) {
    redirect(`${redirectTo}?error=invalid-checklist-item`);
  }

  const { error } = await supabase.from("inspection_results").upsert(
    {
      organisation_id: inspection.organisation_id,
      inspection_id: inspection.id,
      template_item_id: templateItem.id,
      result_status: resultStatus
    },
    { onConflict: "inspection_id,template_item_id" }
  );

  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.code ?? "result-save-failed")}`);
  }

  revalidatePath("/technician/today");
  revalidatePath(`/technician/jobs/${jobId}`);
  redirect(`${redirectTo}?result=1`);
}

export async function saveInspectionReading(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessTechnician(profile.role)) {
    redirect("/dashboard");
  }

  const inspectionId = value(formData, "inspection_id");
  const templateItemId = value(formData, "template_item_id");
  const jobId = value(formData, "job_id");
  const redirectTo = nextPath(formData);
  const rawValue = value(formData, "reading_value");
  const unit = value(formData, "reading_unit");
  const reading = rawValue === null ? Number.NaN : Number(rawValue);

  if (!inspectionId || !templateItemId || !jobId || !Number.isFinite(reading) || !unit || !(unit in units)) {
    redirect(`${redirectTo}?error=invalid-reading`);
  }

  const supabase = await createClient();
  const { data: inspection, error: inspectionError } = await supabase
    .from("inspections")
    .select("id,organisation_id,template_id,status,maintenance_jobs(assigned_technician_id,status)")
    .eq("id", inspectionId)
    .maybeSingle();

  const job = Array.isArray(inspection?.maintenance_jobs) ? inspection?.maintenance_jobs[0] : inspection?.maintenance_jobs;

  if (inspectionError || !inspection || job?.assigned_technician_id !== profile.id || inspection.status !== "IN_PROGRESS" || job?.status !== "IN_PROGRESS") {
    redirect(`${redirectTo}?error=inspection-not-ready`);
  }

  const { data: templateItem, error: itemError } = await supabase
    .from("inspection_template_items")
    .select("id,field_type,metadata")
    .eq("id", templateItemId)
    .eq("template_id", inspection.template_id)
    .maybeSingle();

  const metadata = (templateItem?.metadata ?? {}) as { semanticKey?: unknown };
  const definition = typeof metadata.semanticKey === "string" ? findReadingDefinition(metadata.semanticKey) : undefined;

  if (itemError || !templateItem || templateItem.field_type !== "NUMBER" || !definition || !definition.allowedUnits.includes(unit as UnitCode)) {
    redirect(`${redirectTo}?error=invalid-checklist-item`);
  }

  // Limits come only from the standard (definition.limit). No limit => recorded, never judged.
  const evaluation = evaluateReading(definition, reading, unit as UnitCode);

  const { error } = await supabase.from("inspection_results").upsert(
    {
      organisation_id: inspection.organisation_id,
      inspection_id: inspection.id,
      template_item_id: templateItem.id,
      value_number: reading,
      reading_unit: unit,
      value_standard: evaluation.standardValue,
      semantic_key: definition.semanticKey,
      limit_status: evaluation.status,
      // Out-of-limit only flags ATTENTION; the technician decides whether to raise a deficiency.
      result_status: evaluation.status === "OUT_OF_LIMIT" ? "ATTENTION" : "PASS",
      notes: evaluation.reason ?? null
    },
    { onConflict: "inspection_id,template_item_id" }
  );

  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.code ?? "reading-save-failed")}`);
  }

  revalidatePath("/technician/today");
  revalidatePath(`/technician/jobs/${jobId}`);
  redirect(`${redirectTo}?${evaluation.suggestDeficiency ? "readingOutOfLimit=1" : "result=1"}`);
}

function correctiveWorkOrderPath(workOrderId: string, query: string): never {
  redirect(`/technician/corrective/${workOrderId}?${query}`);
}

export async function startCorrectiveWorkOrder(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessTechnician(profile.role)) {
    redirect("/dashboard");
  }

  const workOrderId = value(formData, "work_order_id");
  if (!workOrderId) redirect("/technician/today?error=missing-work-order");

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_corrective_work_order", { p_work_order_id: workOrderId });

  if (error) correctiveWorkOrderPath(workOrderId, "error=start-failed");

  revalidatePath("/technician/today");
  revalidatePath(`/technician/corrective/${workOrderId}`);
  revalidatePath("/maintenance");
  correctiveWorkOrderPath(workOrderId, "started=1");
}

export async function submitCorrectiveRepair(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessTechnician(profile.role)) {
    redirect("/dashboard");
  }

  const workOrderId = value(formData, "work_order_id");
  const repairNotes = value(formData, "repair_notes");
  const partsUsed = value(formData, "parts_used");
  const photos = formData.getAll("photos").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!workOrderId) redirect("/technician/today?error=missing-work-order");
  if (!isValidRepairSubmission(repairNotes, partsUsed)) correctiveWorkOrderPath(workOrderId, "error=repair-invalid");
  if (photos.length > correctiveRepairPhotoLimit || photos.some((photo) => !isValidCorrectiveRepairPhoto(photo))) {
    correctiveWorkOrderPath(workOrderId, "error=photos-invalid");
  }

  const supabase = await createClient();
  const { data: workOrder, error: workOrderError } = await supabase
    .from("corrective_work_orders")
    .select("id,organisation_id,finding_id,status,assigned_technician_id")
    .eq("id", workOrderId)
    .eq("assigned_technician_id", profile.id)
    .eq("status", "IN_PROGRESS")
    .maybeSingle();

  if (workOrderError || !workOrder) correctiveWorkOrderPath(workOrderId, "error=work-order-unavailable");

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  for (const photo of photos) {
    const storagePath = `${workOrder.organisation_id}/corrective-work-orders/${workOrder.id}/${crypto.randomUUID()}.${extensionByType[photo.type]}`;
    const { error: uploadError } = await supabase.storage
      .from("corrective-repair-photos")
      .upload(storagePath, photo, { contentType: photo.type, upsert: false });

    if (uploadError) correctiveWorkOrderPath(workOrderId, "error=photo-upload-failed");

    const { error: photoRowError } = await supabase.from("corrective_work_order_photos").insert({
      organisation_id: workOrder.organisation_id,
      corrective_work_order_id: workOrder.id,
      finding_id: workOrder.finding_id,
      storage_path: storagePath,
      caption: value(formData, "photo_caption"),
      uploaded_by: profile.id
    });

    if (photoRowError) correctiveWorkOrderPath(workOrderId, "error=photo-record-failed");
  }

  const { data: updated, error: updateError } = await supabase
    .from("corrective_work_orders")
    .update({
      status: "REPAIR_SUBMITTED",
      repair_notes: repairNotes,
      parts_used: partsUsed,
      repair_completed_at: new Date().toISOString()
    })
    .eq("id", workOrder.id)
    .eq("status", "IN_PROGRESS")
    .select("id")
    .maybeSingle();

  if (updateError || !updated) correctiveWorkOrderPath(workOrderId, "error=repair-submit-failed");

  revalidatePath("/technician/today");
  revalidatePath(`/technician/corrective/${workOrderId}`);
  revalidatePath("/maintenance");
  revalidatePath("/reports");
  revalidatePath("/client/dashboard");
  correctiveWorkOrderPath(workOrderId, "submitted=1");
}
