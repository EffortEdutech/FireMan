import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateReportTemplate } from "@/app/(dashboard)/report-templates/actions";
import { ReportTemplateSectionCard } from "@/components/reports/report-template-section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { resolveReportLayout } from "@/lib/reports/report-template";
import { reportTemplateSections } from "@/lib/reports/template-builder";
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

const fieldStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
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
  const sectionById = new Map(layout.sections.map((section, index) => [section.sectionId, { section, index }]));

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
        <form action={updateReportTemplate} style={{ display: "grid", gap: "1rem" }}>
          <input name="template_id" type="hidden" value={template.id} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <input aria-label="Template name" defaultValue={template.name} name="name" required style={fieldStyle} />
            <textarea
              aria-label="Template description"
              defaultValue={template.description ?? ""}
              name="description"
              placeholder="Short description"
              style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }}
            />
          </div>

          <div style={{ display: "grid", gap: "0.75rem" }}>
            {reportTemplateSections.map((section, defaultIndex) => {
              const existing = sectionById.get(section.id);

              return <ReportTemplateSectionCard defaultIndex={defaultIndex} existing={existing} key={section.id} section={section} />;
            })}
          </div>

          <div>
            <Button type="submit">Save Template</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
