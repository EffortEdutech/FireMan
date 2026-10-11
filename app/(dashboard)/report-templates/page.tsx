import { redirect } from "next/navigation";
import Link from "next/link";
import { createReportTemplate, setReportTemplateActive } from "@/app/(dashboard)/report-templates/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/states";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { reportTemplateSections } from "@/lib/reports/template-builder";
import { createClient } from "@/lib/supabase/server";

type ReportTemplatesPageProps = {
  searchParams?: Promise<{
    created?: string;
    activated?: string;
    deactivated?: string;
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

export default async function ReportTemplatesPage({ searchParams }: ReportTemplatesPageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createClient();
  const { data: templates, error } = await supabase
    .from("report_templates")
    .select("id,name,description,slug,is_default,active,created_at,reports(id)")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Report Templates</h1>
        <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>
          Create controlled report layouts that can be selected when generating maintenance reports.
        </p>
      </div>

      {params?.created ? <SuccessState message="Report template created. It is now available when generating a report shell." /> : null}
      {params?.activated ? <SuccessState message="Report template activated. It is available for new report shells." /> : null}
      {params?.deactivated ? <SuccessState message="Report template deactivated. Existing reports still keep their selected template." /> : null}
      {params?.error ? <ErrorState title="Template not saved" message={errorMessage(params.error)} /> : null}

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>Create Template</h2>
        <form action={createReportTemplate} style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <input aria-label="Template name" name="name" placeholder="Template name" required style={fieldStyle} />
            <select aria-label="Template preset" name="preset" style={fieldStyle}>
              <option value="client_summary">Client Summary Report</option>
              <option value="detailed_evidence">Detailed Evidence Report</option>
              <option value="custom">Custom Section Set</option>
            </select>
          </div>
          <textarea
            aria-label="Template description"
            name="description"
            placeholder="Short description"
            style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }}
          />
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {reportTemplateSections.map((section) => (
              <div
                key={section.id}
                style={{
                  alignItems: "center",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  display: "grid",
                  gap: "0.75rem",
                  gridTemplateColumns: "minmax(180px, 240px) minmax(0, 1fr)",
                  padding: "0.75rem"
                }}
              >
                <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 700 }}>
                  <input defaultChecked name="section_id" type="checkbox" value={section.id} />
                  {section.defaultTitle}
                </label>
                <input
                  aria-label={`${section.defaultTitle} section title`}
                  defaultValue={section.defaultTitle}
                  name={`section_title_${section.id}`}
                  style={fieldStyle}
                />
              </div>
            ))}
          </div>
          <div>
            <Button type="submit">Create Template</Button>
          </div>
        </form>
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
                <th>Reports</th>
                <th>Slug</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <td>
                    <Link href={`/report-templates/${template.id}`}>
                      <strong>{template.name}</strong>
                    </Link>
                    {template.is_default ? <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Default</div> : null}
                  </td>
                  <td>{template.description ?? "No description"}</td>
                  <td>{template.active ? "Active" : "Inactive"}</td>
                  <td>{template.reports?.length ?? 0}</td>
                  <td>{template.slug}</td>
                  <td>
                    {template.is_default ? (
                      "Default"
                    ) : (
                      <form action={setReportTemplateActive}>
                        <input name="template_id" type="hidden" value={template.id} />
                        <input name="active" type="hidden" value={template.active ? "false" : "true"} />
                        <Button type="submit" variant="secondary">
                          {template.active ? "Deactivate" : "Activate"}
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState title="No templates yet" message="Create a template to make it available during report generation." />
      )}
    </div>
  );
}
