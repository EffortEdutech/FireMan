import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateReportTemplate } from "@/app/(dashboard)/report-templates/actions";
import { ReportTemplateEditForm } from "@/components/reports/report-template-edit-form";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { resolveReportLayout } from "@/lib/reports/report-template";
import { createClient } from "@/lib/supabase/server";

type EditReportTemplatePageProps = {
  params: Promise<{
    templateId: string;
  }>;
  searchParams?: Promise<{
    duplicated?: string;
    error?: string;
  }>;
};

function errorMessage(error: string) {
  if (error === "missing-name") {
    return "Template name is required.";
  }

  return "Template could not be updated.";
}

export default async function EditReportTemplatePage({ params, searchParams }: EditReportTemplatePageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const { templateId } = await params;
  const pageParams = await searchParams;
  const supabase = await createClient();
  const [{ data: template, error }, { count: reportCount }] = await Promise.all([
    supabase
      .from("report_templates")
      .select("id,name,description,is_default,layout")
      .eq("id", templateId)
      .single(),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("template_id", templateId)
  ]);

  if (error || !template) {
    notFound();
  }

  if (template.is_default || (reportCount ?? 0) > 0) {
    redirect(`/report-templates/${template.id}?error=template-locked`);
  }

  const layout = resolveReportLayout(template.layout);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <Link href={`/report-templates/${template.id}`} style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
          Back to template
        </Link>
        <h1 style={{ fontSize: "1.75rem", margin: "0.5rem 0 0" }}>Edit Template</h1>
        <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>
          Edit is available only before a template is used by a report.
        </p>
      </div>

      {pageParams?.error ? <ErrorState title="Template not updated" message={errorMessage(pageParams.error)} /> : null}
      {pageParams?.duplicated ? (
        <Card role="status" style={{ borderColor: "#9cc9a8", color: "#22543d" }}>
          Template duplicated. Adjust this copy for future reports.
        </Card>
      ) : null}

      <Card>
        <ReportTemplateEditForm action={updateReportTemplate} layout={layout} template={template} />
      </Card>
    </div>
  );
}
