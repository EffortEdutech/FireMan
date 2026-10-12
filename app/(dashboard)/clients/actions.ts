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
