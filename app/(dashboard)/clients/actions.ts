"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  const text = typeof entry === "string" ? entry.trim() : "";
  return text.length > 0 ? text : null;
}

export async function createClientRecord(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const name = value(formData, "name");

  if (!name) {
    redirect("/clients?error=missing-name");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    organisation_id: profile.organisation_id,
    name,
    registration_no: value(formData, "registration_no"),
    industry: value(formData, "industry"),
    phone: value(formData, "phone"),
    email: value(formData, "email"),
    address: value(formData, "address")
  });

  if (error) {
    redirect(`/clients?error=${encodeURIComponent(error.code ?? "create-failed")}`);
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  redirect("/clients?created=1");
}

export async function updateClientReportTemplate(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const clientId = value(formData, "client_id");
  const templateId = value(formData, "default_report_template_id");

  if (!clientId) {
    redirect("/clients?error=missing-client");
  }

  const supabase = await createClient();

  if (templateId) {
    const { data: template, error: templateError } = await supabase
      .from("report_templates")
      .select("id")
      .eq("id", templateId)
      .eq("organisation_id", profile.organisation_id)
      .eq("active", true)
      .single();

    if (templateError || !template) {
      redirect("/clients?error=template-not-found");
    }
  }

  const { error } = await supabase
    .from("clients")
    .update({
      default_report_template_id: templateId,
      updated_at: new Date().toISOString()
    })
    .eq("id", clientId)
    .eq("organisation_id", profile.organisation_id);

  if (error) {
    redirect(`/clients?error=${encodeURIComponent(error.code ?? "template-update-failed")}`);
  }

  revalidatePath("/clients");
  revalidatePath("/reports");
  redirect("/clients?template=1");
}
