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

export async function generateReportShell(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const jobId = value(formData, "job_id");
  const templateId = value(formData, "template_id");

  if (!jobId) {
    redirect("/reports?error=missing-job");
  }

  if (!templateId) {
    redirect("/reports?error=missing-template");
  }

  const supabase = await createClient();
  const { data: job, error: jobError } = await supabase
    .from("maintenance_jobs")
    .select("id,organisation_id,job_number,status")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    redirect("/reports?error=job-not-found");
  }

  if (job.status !== "UNDER_REVIEW") {
    redirect("/reports?error=job-not-under-review");
  }

  const { data: template, error: templateError } = await supabase
    .from("report_templates")
    .select("id,name")
    .eq("id", templateId)
    .eq("organisation_id", profile.organisation_id)
    .eq("active", true)
    .single();

  if (templateError || !template) {
    redirect("/reports?error=template-not-found");
  }

  const { count: existingReportCount, error: existingReportError } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job.id)
    .neq("status", "VOID");

  if (existingReportError) {
    redirect(`/reports?error=${encodeURIComponent(existingReportError.code ?? "report-check-failed")}`);
  }

  if ((existingReportCount ?? 0) > 0) {
    redirect("/reports?error=report-exists");
  }

  const { data: reportNumber, error: numberError } = await supabase.rpc("generate_report_number");

  if (numberError || !reportNumber) {
    redirect(`/reports?error=${encodeURIComponent(numberError?.code ?? "number-failed")}`);
  }

  const title = value(formData, "title") ?? `Maintenance Report ${job.job_number}`;
  const { error } = await supabase.from("reports").insert({
    organisation_id: profile.organisation_id,
    job_id: job.id,
    report_number: reportNumber,
    report_type: "MAINTENANCE",
    status: "GENERATED",
    template_id: template.id,
    title,
    generated_at: new Date().toISOString(),
    generated_by: profile.id,
    report_data: {
      source: "management-report-shell",
      job_number: job.job_number,
      template_name: template.name
    }
  });

  if (error) {
    redirect(`/reports?error=${encodeURIComponent(error.code ?? "create-failed")}`);
  }

  revalidatePath("/reports");
  revalidatePath("/dashboard");
  redirect("/reports?created=1");
}

export async function reviewReport(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const reportId = value(formData, "report_id");

  if (!reportId) {
    redirect("/reports?error=missing-report");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({
      status: "REVIEWED",
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id
    })
    .eq("id", reportId)
    .eq("status", "GENERATED");

  if (error) {
    redirect(`/reports?error=${encodeURIComponent(error.code ?? "review-failed")}`);
  }

  revalidatePath("/reports");
  revalidatePath("/dashboard");
  redirect("/reports?reviewed=1");
}

export async function issueReport(formData: FormData) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const reportId = value(formData, "report_id");

  if (!reportId) {
    redirect("/reports?error=missing-report");
  }

  const supabase = await createClient();
  const { data: issuedReport, error } = await supabase.rpc("issue_report", { p_report_id: reportId });

  if (error || !issuedReport) {
    redirect(`/reports?error=${encodeURIComponent(error.code ?? "issue-failed")}`);
  }

  const { error: jobError } = await supabase
    .from("maintenance_jobs")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString()
    })
    .eq("id", issuedReport.job_id)
    .eq("status", "UNDER_REVIEW");

  if (jobError) {
    redirect(`/reports?error=${encodeURIComponent(jobError.code ?? "job-complete-failed")}`);
  }

  revalidatePath("/reports");
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  revalidatePath("/client/dashboard");
  redirect("/reports?issued=1");
}
