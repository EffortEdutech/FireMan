import { redirect } from "next/navigation";
import Link from "next/link";
import {
  createReportTemplate,
  duplicateReportTemplate,
  setReportTemplateActive
} from "@/app/(dashboard)/report-templates/actions";
import { ReportTemplateCreateForm } from "@/components/reports/report-template-create-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { resolveReportLayout } from "@/lib/reports/report-template";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type ReportTemplatesPageProps = {
  searchParams?: Promise<{
    created?: string;
    activated?: string;
    deactivated?: string;
    error?: string;
  }>;
};

function errorMessage(error: string) {
  switch (error) {
    case "missing-name":
      return "Template name is required.";
    case "missing-template":
      return "Template is required.";
    case "template-not-found":
      return "Template was not found.";
    case "default-template":
      return "The default template must stay active.";
    case "update-failed":
      return "The template status could not be updated.";
    case "create-failed":
      return "The template could not be created.";
    case "duplicate-failed":
      return "The template could not be duplicated.";
    default:
      return "The template could not be saved.";
  }
}

function templateStats(layoutValue: Json | null | undefined) {
  const layout = resolveReportLayout(layoutValue);
  const sections = layout.sections.filter((section) => section.blockType !== "header");
  const fieldCount = sections.reduce((count, section) => count + (section.binding.fields?.length ?? 0), 0);

  return {
    fieldCount,
    sectionCount: sections.length
  };
}

export default async function ReportTemplatesPage({ searchParams }: ReportTemplatesPageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createClient();
  const { data: templates, error } = await supabase
    .from("report_templates")
    .select("id,name,description,slug,is_default,active,created_at,layout,reports(id)")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Report Settings</h1>
        <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>
          Create controlled report layouts, then choose the layout when generating each maintenance report.
        </p>
      </div>

      {params?.created ? <SuccessState message="Report template created. It is now available when generating a report shell." /> : null}
      {params?.activated ? <SuccessState message="Report template activated. It is available for new report shells." /> : null}
      {params?.deactivated ? <SuccessState message="Report template deactivated. Existing reports still keep their selected template." /> : null}
      {params?.error ? <ErrorState title="Template not saved" message={errorMessage(params.error)} /> : null}

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>Create Report Setting</h2>
        <ReportTemplateCreateForm action={createReportTemplate} />
      </Card>

      {error ? (
        <ErrorState title="Templates unavailable" message="Report templates could not be loaded." />
      ) : templates && templates.length > 0 ? (
        <Card className="table-scroll" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Template</th>
                <th>Description</th>
                <th>Status</th>
                <th>Layout</th>
                <th>Reports</th>
                <th>Slug</th>
                <th>Workflow</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => {
                const stats = templateStats(template.layout);
                const reportCount = template.reports?.length ?? 0;
                const locked = template.is_default || reportCount > 0;

                return (
                  <tr key={template.id}>
                    <td>
                      <Link href={`/report-templates/${template.id}`}>
                        <strong>{template.name}</strong>
                      </Link>
                      <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                        {template.is_default ? "Default" : locked ? "Locked after use" : "Editable"}
                      </div>
                    </td>
                    <td>{template.description ?? "No description"}</td>
                    <td>{template.active ? "Active" : "Inactive"}</td>
                    <td>
                      <strong>{stats.sectionCount}</strong> section{stats.sectionCount === 1 ? "" : "s"}
                      <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                        {stats.fieldCount} field{stats.fieldCount === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td>{reportCount}</td>
                    <td>{template.slug}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                        <Link href={`/report-templates/${template.id}`} style={{ color: "var(--accent)", fontWeight: 700 }}>
                          Inspect
                        </Link>
                        {!locked ? (
                          <Link href={`/report-templates/${template.id}/edit`} style={{ color: "var(--accent)", fontWeight: 700 }}>
                            Edit
                          </Link>
                        ) : null}
                        {locked ? (
                          <form action={duplicateReportTemplate}>
                            <input name="template_id" type="hidden" value={template.id} />
                            <Button type="submit" variant="secondary">
                              Duplicate and Edit
                            </Button>
                          </form>
                        ) : null}
                        {template.is_default ? null : (
                        <form action={setReportTemplateActive}>
                          <input name="template_id" type="hidden" value={template.id} />
                          <input name="active" type="hidden" value={template.active ? "false" : "true"} />
                          <Button type="submit" variant="secondary">
                            {template.active ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState title="No templates yet" message="Create a template to make it available during report generation." />
      )}
    </div>
  );
}
