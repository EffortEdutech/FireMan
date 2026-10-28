"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireUser } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import type { ServiceRequestCategory } from "@/lib/service-requests/constants";
import { callPublicTracking } from "@/lib/service-requests/public-tracking";
import { createClient } from "@/lib/supabase/server";

function clean(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

export async function createPublicServiceRequest(formData: FormData) {
  if (clean(formData, "website", 200)) redirect("/request?error=submission-failed");

  const requesterEmail = clean(formData, "requester_email", 320);
  const requesterName = clean(formData, "requester_name", 160);
  const requesterCompany = clean(formData, "requester_company", 200);
  const requesterPhone = clean(formData, "requester_phone", 40);
  const siteDescription = clean(formData, "site_description", 500);
  const categoryValue = clean(formData, "category", 40);
  const urgencyValue = clean(formData, "urgency", 20);
  const title = clean(formData, "title", 160);
  const details = clean(formData, "details", 5000);

  const categories: ServiceRequestCategory[] = ["REACTIVE_ISSUE", "PLANNED_SERVICE", "INSPECTION", "FINDING_FOLLOW_UP", "QUOTATION", "OTHER"];
  const urgencies = ["ROUTINE", "PRIORITY", "URGENT"] as const;
  if (
    !requesterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail) || requesterName === null || requesterName.length < 2 || !siteDescription || !categoryValue || !categories.includes(categoryValue as ServiceRequestCategory) ||
    !urgencyValue || !urgencies.includes(urgencyValue as (typeof urgencies)[number]) ||
    !title || title.length < 3 || !details || details.length < 10
  ) redirect("/request?error=invalid-input");

  let trackingResult: { requestReference: string; trackingToken: string };
  try {
    trackingResult = await callPublicTracking("create", {
      requesterEmail, requesterName, requesterCompany, requesterPhone, siteDescription,
      category: categoryValue as ServiceRequestCategory, urgency: urgencyValue as (typeof urgencies)[number],
      title, details, affectedAsset: clean(formData, "affected_asset", 160),
      preferredAccessWindow: clean(formData, "preferred_access_window", 300),
      onsiteContact: clean(formData, "onsite_contact", 160), referenceNote: clean(formData, "reference_note", 160)
    });
  } catch (error) {
    console.error("[public-request] create failed", { message: error instanceof Error ? error.message : "unknown" });
    redirect("/request?error=submission-failed");
  }

  revalidatePath(`/track/${trackingResult.trackingToken}`);
  redirect(`/track/${trackingResult.trackingToken}?submitted=1`);
}

export async function replyToServiceRequest(formData: FormData) {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if ((!user.email || user.email_confirmed_at == null) && !canAccessClientPortal(profile?.role ?? "TECHNICIAN")) redirect("/request/access");
  const serviceRequestId = clean(formData, "service_request_id", 64);
  const message = clean(formData, "message", 2000);
  if (!serviceRequestId || !/^[0-9a-f-]{36}$/i.test(serviceRequestId) || !message) {
    redirect("/request/requests?error=invalid-reply");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_service_request", {
    p_service_request_id: serviceRequestId,
    p_message: message
  });
  if (error) redirect(`/request/requests/${serviceRequestId}?error=reply-failed`);
  revalidatePath(`/request/requests/${serviceRequestId}`);
  revalidatePath("/service-requests");
  redirect(`/request/requests/${serviceRequestId}?replied=1`);
}

export async function replyToPublicTrackingRequest(formData: FormData) {
  const token = clean(formData, "tracking_token", 64);
  const message = clean(formData, "message", 2000);
  if (!token || !message) redirect("/request?error=invalid-reply");

  try {
    await callPublicTracking("reply", { trackingToken: token, message });
  } catch {
    redirect(`/track/${token}?error=reply-failed`);
  }
  revalidatePath(`/track/${token}`);
  redirect(`/track/${token}?replied=1`);
}

export async function signOutRequestAccess() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/request/access");
}

