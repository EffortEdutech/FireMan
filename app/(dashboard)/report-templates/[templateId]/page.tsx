import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { duplicateReportTemplate, setReportTemplateActive } from "@/app/(dashboard)/report-templates/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth/current-user";
import { canAccessManagement } from "@/lib/permissions/roles";
import { resolveReportLayout } from "@/lib/reports/report-template";
import { createClient } from "@/lib/supabase/server";

type ReportTemplateDetailPageProps = {
  params: Promise<{
    templateId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    updated?: string;
  }>;
};

const blockLabel: Record<string, string> = {
  asset_table: "Asset table",
  checklist_evidence: "Checklist evidence",
  field_evidence: "Field evidence",
  header: "Header",
  signature_box: "Signature box",
  static_text: "Static text",
  summary_grid: "Summary grid"
};

export default async function ReportTemplateDetailPage({ params, searchParams }: ReportTemplateDetailPageProps) {
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
      .select("id,name,description,slug,is_default,active,layout,created_at")
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

  const layout = resolveReportLayout(template.layout);
  const visibleSections = layout.sections.filter((section) => section.blockType !== "header");
  const isEditable = !template.is_default && (reportCount ?? 0) === 0;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <Link href="/report-templates" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
          Back to templates
        </Link>
        <h1 style={{ fontSize: "1.75rem", margin: "0.5rem 0 0" }}>{template.name}</h1>
        <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>{template.description ?? "No description"}</p>
      </div>

      {pageParams?.updated ? (
        <Card role="status" style={{ borderColor: "#9cc9a8", color: "#22543d" }}>
          Template updated.
        </Card>
      ) : null}
      {pageParams?.error === "template-locked" ? (
        <Card role="alert" style={{ borderColor: "#f0b4ae", color: "#8a1f17" }}>
          This template is locked because it is the default template or already used by reports.
        </Card>
      ) : null}

      <Card>
        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Status</div>
            <strong>{template.active ? "Active" : "Inactive"}</strong>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Reports using template</div>
            <strong>{reportCount ?? 0}</strong>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Slug</div>
            <strong>{template.slug}</strong>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {isEditable ? (
            <Link href={`/report-templates/${template.id}/edit`} style={{ color: "var(--accent)", fontWeight: 700 }}>
              Edit Template
            </Link>
          ) : null}
          <form action={duplicateReportTemplate}>
            <input name="template_id" type="hidden" value={template.id} />
            <Button type="submit" variant="secondary">
              Duplicate Template
            </Button>
          </form>
          {!template.is_default ? (
            <form action={setReportTemplateActive}>
              <input name="template_id" type="hidden" value={template.id} />
              <input name="active" type="hidden" value={template.active ? "false" : "true"} />
              <Button type="submit" variant="secondary">
                {template.active ? "Deactivate Template" : "Activate Template"}
              </Button>
            </form>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Template Preview</h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {visibleSections.map((section, index) => {
            const columns = Number(section.options?.columns);

            return (
              <div key={section.sectionId} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "0.75rem" }}>
                <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                  {index + 1}. {blockLabel[section.blockType] ?? section.blockType}
                </div>
                <strong>{section.content.title ?? section.sectionId}</strong>
                {section.content.description ? <div style={{ color: "var(--muted)", marginTop: 4 }}>{section.content.description}</div> : null}
                {section.options ? (
                  <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 6 }}>
                    {Number.isFinite(columns) ? `${columns} column${columns === 1 ? "" : "s"}` : null}
                    {section.options.layout ? `${Number.isFinite(columns) ? " / " : ""}${section.options.layout}` : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
