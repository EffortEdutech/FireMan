"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { serviceRequestStatuses } from "@/lib/service-requests/constants";
import { createClient } from "@/lib/supabase/server";

function textValue(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

export async function updateServiceRequest(formData: FormData) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");

  const id = textValue(formData, "id", 64);
  const clientId = textValue(formData, "client_id", 64);
  const siteId = textValue(formData, "site_id", 64);
  const status = textValue(formData, "status", 40);
  const customerMessage = textValue(formData, "customer_message", 1000);
  const nextActionOwner = textValue(formData, "next_action_owner", 100);
  const nextAction = textValue(formData, "next_action", 500);
  const holdReason = textValue(formData, "hold_reason", 500);
  const appointmentRaw = textValue(formData, "appointment_at", 40);
  const appointmentAt = appointmentRaw && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(appointmentRaw)
    ? new Date(`${appointmentRaw}:00+08:00`)
    : null;

  if (
    !id || Boolean(clientId) !== Boolean(siteId) || !status || !serviceRequestStatuses.includes(status as (typeof serviceRequestStatuses)[number]) ||
    !customerMessage || !nextActionOwner || !nextAction || (appointmentRaw && (!appointmentAt || !appointmentAt.getTime()))
  ) {
    redirect("/service-requests?error=invalid-input");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_requests")
    .update({
      client_id: clientId,
      site_id: siteId,
      status: status as (typeof serviceRequestStatuses)[number],
      customer_message: customerMessage,
      next_action_owner: nextActionOwner,
      next_action: nextAction,
      hold_reason: holdReason,
      appointment_at: appointmentAt?.toISOString() ?? null
    })
    .eq("id", id);

  if (error) redirect(`/service-requests?error=${encodeURIComponent(error.code ?? "update-failed")}`);

  revalidatePath("/service-requests");
  revalidatePath(`/service-requests/${id}`);
  revalidatePath("/client/requests");
  revalidatePath(`/client/requests/${id}`);
  redirect(`/service-requests/${id}?updated=1`);
}

export async function setPublicRequestIntake(formData: FormData) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");
  const enabled = formData.get("enabled") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("organisations")
    .update({ public_request_enabled: enabled })
    .eq("id", profile.organisation_id);
  if (error) redirect("/service-requests?intake-error=1");
  revalidatePath("/service-requests");
  redirect("/service-requests?intake-updated=1");
}

export async function replyToServiceRequestFromStaff(formData: FormData) {
  const profile = await requireProfile();
  if (!canAccessManagement(profile.role)) redirect("/dashboard");
  const id = textValue(formData, "service_request_id", 64);
  const message = textValue(formData, "message", 2000);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id) || !message) redirect("/service-requests?error=invalid-reply");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_service_request", { p_service_request_id: id, p_message: message });
  if (error) redirect(`/service-requests/${id}?error=reply-failed`);
  revalidatePath(`/service-requests/${id}`);
  revalidatePath(`/request/requests/${id}`);
  redirect(`/service-requests/${id}?replied=1`);
}

