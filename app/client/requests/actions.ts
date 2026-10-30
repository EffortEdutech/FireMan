"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile, requireUser } from "@/lib/auth/current-user";
import { canAccessClientPortal } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

function textValue(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

export async function createCustomerServiceRequest(formData: FormData) {
  const profile = await requireProfile();
  const user = await requireUser();
  if (!canAccessClientPortal(profile.role) || !profile.client_id) redirect("/client/dashboard");
  if (!user.email) redirect("/client/requests/new?error=email-required");

  const siteId = textValue(formData, "site_id", 64);
  const category = textValue(formData, "category", 40);
  const urgency = textValue(formData, "urgency", 20);
  const title = textValue(formData, "title", 160);
  const details = textValue(formData, "details", 5000);
  if (
    !siteId || !category || !["REACTIVE_ISSUE", "PLANNED_SERVICE", "INSPECTION", "FINDING_FOLLOW_UP", "QUOTATION", "OTHER"].includes(category) ||
    !urgency || !["ROUTINE", "PRIORITY", "URGENT"].includes(urgency) ||
    !title || title.length < 3 || !details || details.length < 10
  ) redirect("/client/requests/new?error=invalid-input");

  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from("service_requests")
    .insert({
      organisation_id: profile.organisation_id,
      client_id: profile.client_id,
      site_id: siteId,
      created_by: profile.id,
      requester_user_id: user.id,
      requester_email: user.email,
      requester_name: profile.full_name,
      category: category as "REACTIVE_ISSUE" | "PLANNED_SERVICE" | "INSPECTION" | "FINDING_FOLLOW_UP" | "QUOTATION" | "OTHER",
      urgency: urgency as "ROUTINE" | "PRIORITY" | "URGENT",
      title,
      details,
      affected_asset: textValue(formData, "affected_asset", 160),
      preferred_access_window: textValue(formData, "preferred_access_window", 300),
      onsite_contact: textValue(formData, "onsite_contact", 160),
      reference_note: textValue(formData, "reference_note", 160)
    })
    .select("id")
    .single();

  if (error || !request) redirect(`/client/requests/new?error=${encodeURIComponent(error?.code ?? "create-failed")}`);

  revalidatePath("/client/requests");
  redirect(`/client/requests/${request.id}?submitted=1`);
}
