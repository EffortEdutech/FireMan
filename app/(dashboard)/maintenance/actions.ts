"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { canTransitionQuoteRequest, isQuoteRequestStatus } from "@/lib/corrective/quote-request-status";
import { isValidManagementExceptionReason, isValidWorkOrderDate, isWorkOrderAuthorization } from "@/lib/corrective/work-order";
import { isValidVerificationNotes } from "@/lib/corrective/repair-evidence";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type MaintenanceFrequency = Database["public"]["Enums"]["maintenance_frequency"];

const frequencies = new Set<MaintenanceFrequency>(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"]);

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  const text = typeof entry === "string" ? entry.trim() : "";
  return text.length > 0 ? text : null;
}

function frequencyValue(formData: FormData) {
  const frequency = value(formData, "frequency");
  return frequency && frequencies.has(frequency as MaintenanceFrequency) ? (frequency as MaintenanceFrequency) : null;
}

export async function createPlanAndJob(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const clientId = value(formData, "client_id");
  const siteId = value(formData, "site_id");
  const name = value(formData, "name");
  const frequency = frequencyValue(formData);
  const startDate = value(formData, "start_date");
  const scheduledDate = value(formData, "scheduled_date") ?? startDate;
  const intervalDays = value(formData, "interval_days");
  const technicianId = value(formData, "assigned_technician_id");
  const equipmentId = value(formData, "equipment_id");

  if (!clientId || !siteId || !name || !frequency || !startDate || !scheduledDate) {
    redirect("/maintenance?error=missing-required");
  }

  const supabase = await createClient();
  let buildingId: string | null = null;
  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id,client_id")
    .eq("id", siteId)
    .eq("organisation_id", profile.organisation_id)
    .eq("active", true)
    .maybeSingle();

  if (siteError || !site || site.client_id !== clientId) {
    redirect("/maintenance?error=client-site-mismatch");
  }

  if (equipmentId) {
    const { data: equipment, error: equipmentError } = await supabase
      .from("equipment")
      .select("id,building_id,buildings!inner(site_id)")
      .eq("id", equipmentId)
      .eq("organisation_id", profile.organisation_id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    const equipmentSiteId = Array.isArray(equipment?.buildings)
      ? equipment?.buildings[0]?.site_id
      : equipment?.buildings?.site_id;

    if (equipmentError || !equipment || equipmentSiteId !== siteId) {
      redirect("/maintenance?error=equipment-site-mismatch");
    }

    buildingId = equipment.building_id;
  }

  const { data: plan, error: planError } = await supabase
    .from("maintenance_plans")
    .insert({
      organisation_id: profile.organisation_id,
      client_id: clientId,
      site_id: siteId,
      name,
      frequency,
      interval_days: frequency === "CUSTOM" && intervalDays ? Number(intervalDays) : null,
      start_date: startDate
    })
    .select("id")
    .single();

  if (planError || !plan) {
    redirect(`/maintenance?error=${encodeURIComponent(planError?.code ?? "plan-create-failed")}`);
  }

  const notes = value(formData, "notes");
  const jobArgs = {
    p_maintenance_plan_id: plan.id,
    p_client_id: clientId,
    p_site_id: siteId,
    p_building_id: buildingId,
    p_scheduled_date: scheduledDate,
    ...(technicianId ? { p_assigned_technician_id: technicianId } : {}),
    ...(notes ? { p_notes: notes } : {})
  } as unknown as Database["public"]["Functions"]["create_maintenance_job"]["Args"];

  const { data: job, error: jobError } = await supabase.rpc("create_maintenance_job", jobArgs);

  if (jobError || !job) {
    redirect(`/maintenance?error=${encodeURIComponent(jobError.code ?? "job-create-failed")}`);
  }

  if (equipmentId) {
    const { error: jobEquipmentError } = await supabase.from("job_equipment").insert({
      organisation_id: profile.organisation_id,
      job_id: job.id,
      equipment_id: equipmentId
    });

    if (jobEquipmentError) {
      redirect(`/maintenance?error=${encodeURIComponent(jobEquipmentError.code ?? "job-equipment-create-failed")}`);
    }
  }

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  redirect("/maintenance?created=1");
}

export async function startJobReview(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const jobId = value(formData, "job_id");

  if (!jobId) {
    redirect("/maintenance?error=missing-job");
  }

  const supabase = await createClient();
  const { data: assignedAssets, error: assignedAssetsError } = await supabase
    .from("job_equipment")
    .select("id,status")
    .eq("job_id", jobId);

  if (assignedAssetsError) {
    redirect(`/maintenance?error=${encodeURIComponent(assignedAssetsError.code ?? "asset-check-failed")}`);
  }

  const hasIncompleteChecklist = (assignedAssets ?? []).some((asset) => asset.status !== "COMPLETED");

  if (hasIncompleteChecklist) {
    redirect("/maintenance?error=incomplete-checklists");
  }

  const { data: reviewedJob, error } = await supabase
    .from("maintenance_jobs")
    .update({
      status: "UNDER_REVIEW",
      supervisor_id: profile.id
    })
    .eq("id", jobId)
    .eq("status", "SUBMITTED")
    .select("id")
    .maybeSingle();

  if (error || !reviewedJob) {
    redirect(`/maintenance?error=${encodeURIComponent(error?.code ?? "review-start-failed")}`);
  }

  revalidatePath("/maintenance");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  redirect("/maintenance?review=1");
}

export async function createFindingQuoteRequest(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const findingId = value(formData, "finding_id");
  const jobId = value(formData, "job_id");
  const requestNotes = value(formData, "request_notes");
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!findingId || !jobId || !uuidPattern.test(findingId) || !uuidPattern.test(jobId) || (requestNotes?.length ?? 0) > 2000) {
    redirect("/maintenance?error=quote-request-invalid");
  }

  const supabase = await createClient();
  const { data: finding, error: findingError } = await supabase
    .from("findings")
    .select("id,job_id")
    .eq("id", findingId)
    .eq("job_id", jobId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (findingError || !finding) {
    redirect(`/maintenance/${jobId}?quote-request=unavailable`);
  }

  const { error } = await supabase.from("finding_quote_requests").insert({
    organisation_id: profile.organisation_id,
    finding_id: finding.id,
    created_by: profile.id,
    request_notes: requestNotes
  });

  if (error) {
    redirect(`/maintenance/${jobId}?quote-request=${error.code === "23505" ? "exists" : "failed"}`);
  }

  revalidatePath(`/maintenance/${jobId}`);
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  redirect(`/maintenance/${jobId}?quote-request=created`);
}

export async function updateFindingQuoteRequest(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const requestId = value(formData, "request_id");
  const jobId = value(formData, "job_id");
  const nextStatusValue = value(formData, "status");
  const submittedExternalReference = value(formData, "external_quote_reference");
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!requestId || !jobId || !uuidPattern.test(requestId) || !uuidPattern.test(jobId) || !nextStatusValue || !isQuoteRequestStatus(nextStatusValue)) {
    redirect("/maintenance?error=quote-request-invalid");
  }

  if ((submittedExternalReference?.length ?? 0) > 160) {
    redirect(`/maintenance/${jobId}?quote-request=invalid-reference`);
  }

  const supabase = await createClient();
  const { data: request, error: requestError } = await supabase
    .from("finding_quote_requests")
    .select("id,finding_id,status,external_quote_reference")
    .eq("id", requestId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (requestError || !request || !isQuoteRequestStatus(request.status)) {
    redirect(`/maintenance/${jobId}?quote-request=unavailable`);
  }

  const { data: finding, error: findingError } = await supabase
    .from("findings")
    .select("id")
    .eq("id", request.finding_id)
    .eq("job_id", jobId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (findingError || !finding) {
    redirect(`/maintenance/${jobId}?quote-request=unavailable`);
  }

  const nextStatus = nextStatusValue;
  if (nextStatus !== request.status && !canTransitionQuoteRequest(request.status, nextStatus)) {
    redirect(`/maintenance/${jobId}?quote-request=invalid-transition`);
  }

  const externalQuoteReference = submittedExternalReference ?? request.external_quote_reference;
  if (nextStatus === "SUBMITTED" && !externalQuoteReference?.trim()) {
    redirect(`/maintenance/${jobId}?quote-request=reference-required`);
  }

  if (nextStatus === request.status && externalQuoteReference === request.external_quote_reference) {
    redirect(`/maintenance/${jobId}?quote-request=no-change`);
  }

  const { data: updatedRequest, error: updateError } = await supabase
    .from("finding_quote_requests")
    .update({ status: nextStatus, external_quote_reference: externalQuoteReference })
    .eq("id", request.id)
    .eq("organisation_id", profile.organisation_id)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedRequest) {
    redirect(`/maintenance/${jobId}?quote-request=update-failed`);
  }

  revalidatePath(`/maintenance/${jobId}`);
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  revalidatePath("/client/dashboard");
  redirect(`/maintenance/${jobId}?quote-request=updated`);
}

export async function createCorrectiveWorkOrder(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const findingId = value(formData, "finding_id");
  const jobId = value(formData, "job_id");
  const quoteRequestId = value(formData, "quote_request_id");
  const authorizationType = value(formData, "authorization_type");
  const technicianId = value(formData, "assigned_technician_id");
  const scheduledDate = value(formData, "scheduled_date");
  const exceptionReason = value(formData, "exception_reason");
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    !findingId || !jobId || !technicianId || !scheduledDate || !authorizationType
    || !uuidPattern.test(findingId) || !uuidPattern.test(jobId) || !uuidPattern.test(technicianId)
    || (quoteRequestId !== null && !uuidPattern.test(quoteRequestId))
    || !isWorkOrderAuthorization(authorizationType)
    || !isValidWorkOrderDate(scheduledDate)
  ) {
    redirect("/maintenance?corrective=invalid");
  }

  if (authorizationType === "APPROVED_QUOTE" && !quoteRequestId) {
    redirect(`/maintenance/${jobId}?corrective=quote-required`);
  }

  if (authorizationType === "MANAGEMENT_EXCEPTION" && !isValidManagementExceptionReason(exceptionReason)) {
    redirect(`/maintenance/${jobId}?corrective=reason-required`);
  }

  const supabase = await createClient();
  const { data: finding, error: findingError } = await supabase
    .from("findings")
    .select("id,status")
    .eq("id", findingId)
    .eq("job_id", jobId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (findingError || !finding || !["OPEN", "IN_PROGRESS"].includes(finding.status)) {
    redirect(`/maintenance/${jobId}?corrective=unavailable`);
  }

  const { data: technician, error: technicianError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", technicianId)
    .eq("organisation_id", profile.organisation_id)
    .eq("role", "TECHNICIAN")
    .eq("active", true)
    .maybeSingle();

  if (technicianError || !technician) {
    redirect(`/maintenance/${jobId}?corrective=technician-invalid`);
  }

  if (authorizationType === "APPROVED_QUOTE" && quoteRequestId) {
    const { data: approvedRequest, error: quoteError } = await supabase
      .from("finding_quote_requests")
      .select("id")
      .eq("id", quoteRequestId)
      .eq("finding_id", finding.id)
      .eq("organisation_id", profile.organisation_id)
      .eq("status", "APPROVED")
      .maybeSingle();

    if (quoteError || !approvedRequest) {
      redirect(`/maintenance/${jobId}?corrective=quote-not-approved`);
    }
  }

  const { error: insertError } = await supabase.from("corrective_work_orders").insert({
    organisation_id: profile.organisation_id,
    finding_id: finding.id,
    quote_request_id: authorizationType === "APPROVED_QUOTE" ? quoteRequestId : null,
    authorization_type: authorizationType,
    exception_reason: authorizationType === "MANAGEMENT_EXCEPTION" ? exceptionReason : null,
    assigned_technician_id: technician.id,
    scheduled_date: scheduledDate,
    created_by: profile.id
  });

  if (insertError) {
    redirect(`/maintenance/${jobId}?corrective=${insertError.code === "23505" ? "exists" : "failed"}`);
  }

  revalidatePath(`/maintenance/${jobId}`);
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  revalidatePath("/technician/today");
  redirect(`/maintenance/${jobId}?corrective=created`);
}

export async function verifyCorrectiveWorkOrder(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const workOrderId = value(formData, "work_order_id");
  const jobId = value(formData, "job_id");
  const verificationNotes = value(formData, "verification_notes");

  if (!workOrderId || !jobId || !verificationNotes || !isValidVerificationNotes(verificationNotes)) {
    redirect("/maintenance?corrective=verification-invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_corrective_work_order", {
    p_work_order_id: workOrderId,
    p_verification_notes: verificationNotes
  });

  if (error) {
    redirect(`/maintenance/${jobId}?corrective=verification-failed`);
  }

  revalidatePath(`/maintenance/${jobId}`);
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  revalidatePath("/technician/today");
  revalidatePath("/client/dashboard");
  revalidatePath("/reports");
  redirect(`/maintenance/${jobId}?corrective=verified`);
}

export async function closeJobFromIssuedReport(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const jobId = value(formData, "job_id");

  if (!jobId) {
    redirect("/maintenance?error=missing-job");
  }

  const supabase = await createClient();
  const { count: issuedReportCount, error: reportError } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("status", "ISSUED");

  if (reportError) {
    redirect(`/maintenance?error=${encodeURIComponent(reportError.code ?? "report-check-failed")}`);
  }

  if ((issuedReportCount ?? 0) === 0) {
    redirect("/maintenance?error=missing-issued-report");
  }

  const { data: completedJob, error } = await supabase
    .from("maintenance_jobs")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString()
    })
    .eq("id", jobId)
    .neq("status", "COMPLETED")
    .select("id")
    .maybeSingle();

  if (error || !completedJob) {
    redirect(`/maintenance?error=${encodeURIComponent(error?.code ?? "job-close-failed")}`);
  }

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/client/dashboard");
  redirect("/maintenance?closed=1");
}
