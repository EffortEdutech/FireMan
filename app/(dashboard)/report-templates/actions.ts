"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { buildReportLayoutDefinition, reportTemplateSections, slugifyTemplateName, type TemplatePreset } from "@/lib/reports/template-builder";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  const text = typeof entry === "string" ? entry.trim() : "";
  return text.length > 0 ? text : null;
}

function templatePreset(value: string | null): TemplatePreset {
  return value === "client_summary" || value === "detailed_evidence" || value === "custom" ? value : "custom";
}

export async function createReportTemplate(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const name = value(formData, "name");
  const description = value(formData, "description");
  const preset = templatePreset(value(formData, "preset"));

  if (!name) {
    redirect("/report-templates?error=missing-name");
  }

  const selectedSectionIds = new Set(formData.getAll("section_id").filter((entry): entry is string => typeof entry === "string"));
  const sectionTitles = new Map(
    reportTemplateSections.map((section) => [section.id, value(formData, `section_title_${section.id}`) ?? section.defaultTitle])
  );
  const layout = buildReportLayoutDefinition({
    description,
    name,
    preset,
    sectionTitles,
    selectedSectionIds
  });
  const slug = `${slugifyTemplateName(name)}-${Date.now().toString(36)}`;
  const supabase = await createClient();
  const { error } = await supabase.from("report_templates").insert({
    active: true,
    created_by: profile.id,
    description,
    is_default: false,
    layout,
    name,
    organisation_id: profile.organisation_id,
    report_type: "MAINTENANCE",
    slug
  });

  if (error) {
    redirect(`/report-templates?error=${encodeURIComponent(error.code ?? "create-failed")}`);
  }

  revalidatePath("/report-templates");
  revalidatePath("/reports");
  redirect("/report-templates?created=1");
}

export async function setReportTemplateActive(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const templateId = value(formData, "template_id");
  const active = value(formData, "active") === "true";

  if (!templateId) {
    redirect("/report-templates?error=missing-template");
  }

  const supabase = await createClient();
  const { data: template, error: templateError } = await supabase
    .from("report_templates")
    .select("id,is_default")
    .eq("id", templateId)
    .eq("organisation_id", profile.organisation_id)
    .single();

  if (templateError || !template) {
    redirect("/report-templates?error=template-not-found");
  }

  if (template.is_default && !active) {
    redirect("/report-templates?error=default-template");
  }

  const { error } = await supabase
    .from("report_templates")
    .update({
      active,
      updated_at: new Date().toISOString()
    })
    .eq("id", templateId)
    .eq("organisation_id", profile.organisation_id);

  if (error) {
    redirect(`/report-templates?error=${encodeURIComponent(error.code ?? "update-failed")}`);
  }

  revalidatePath("/report-templates");
  revalidatePath(`/report-templates/${templateId}`);
  revalidatePath("/reports");
  redirect(`/report-templates?${active ? "activated" : "deactivated"}=1`);
}
