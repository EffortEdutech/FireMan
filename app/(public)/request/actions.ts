"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireUser } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import type { ServiceRequestCategory } from "@/lib/service-requests/constants";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

function clean(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

export async function sendPublicRequestOtp(emailValue: string): Promise<ActionResult> {
  const email = emailValue.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { data: intakeEnabled, error: intakeError } = await supabase.rpc("is_public_request_intake_enabled");
  if (intakeError || !intakeEnabled) {
    return { ok: false, message: "FAST online requests are not available right now. Please contact FAST through your usual service channel." };
  }
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) {
    console.error("[public-request-otp] send failed", { code: error.code ?? "unknown" });
    return { ok: false, message: "We couldn’t send a code just now. Please wait a moment and try again." };
  }
  return { ok: true, message: "If this address can receive messages, a one-time code is on its way. Check your inbox and spam folder." };
}

export async function verifyPublicRequestOtp(emailValue: string, tokenValue: string): Promise<ActionResult> {
  const email = emailValue.trim().toLowerCase();
  const token = tokenValue.replace(/\s/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(token)) {
    return { ok: false, message: "Enter the six-digit code sent to your email." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user?.email || data.user.email.toLowerCase() !== email) {
    return { ok: false, message: "That code could not be verified. Check it and try again, or request a new code." };
  }
  return { ok: true, message: "Email verified. You can now submit and track your request." };
}

export async function createPublicServiceRequest(formData: FormData) {
  const user = await requireUser();
  if (!user.email || user.email_confirmed_at == null) redirect("/request?error=email-not-verified");
  if (clean(formData, "website", 200)) redirect("/request?error=submission-failed");

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
    !requesterName || requesterName.length < 2 || !siteDescription || !categoryValue || !categories.includes(categoryValue as ServiceRequestCategory) ||
    !urgencyValue || !urgencies.includes(urgencyValue as (typeof urgencies)[number]) ||
    !title || title.length < 3 || !details || details.length < 10
  ) redirect("/request?error=invalid-input");

  const supabase = await createClient();
  const { data: requestId, error } = await supabase.rpc("create_public_service_request", {
    p_requester_name: requesterName,
    p_requester_company: requesterCompany,
    p_requester_phone: requesterPhone,
    p_site_description: siteDescription,
    p_category: categoryValue as ServiceRequestCategory,
    p_urgency: urgencyValue as (typeof urgencies)[number],
    p_title: title,
    p_details: details,
    p_affected_asset: clean(formData, "affected_asset", 160),
    p_preferred_access_window: clean(formData, "preferred_access_window", 300),
    p_onsite_contact: clean(formData, "onsite_contact", 160),
    p_reference_note: clean(formData, "reference_note", 160)
  });

  if (error || !requestId) {
    console.error("[public-request] create failed", { code: error?.code ?? "unknown" });
    redirect("/request?error=submission-failed");
  }

  revalidatePath("/request/requests");
  redirect(`/request/requests/${requestId}?submitted=1`);
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

export async function sendRequestAccessCode(emailValue: string): Promise<ActionResult> {
  return sendPublicRequestOtp(emailValue);
}

export async function verifyRequestAccessCode(emailValue: string, tokenValue: string): Promise<ActionResult> {
  return verifyPublicRequestOtp(emailValue, tokenValue);
}

export async function signOutRequestAccess() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/request/access");
}
