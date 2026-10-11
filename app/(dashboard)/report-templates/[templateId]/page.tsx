import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setReportTemplateActive } from "@/app/(dashboard)/report-templates/actions";
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

export default async function ReportTemplateDetailPage({ params }: ReportTemplateDetailPageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const { templateId } = await params;
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

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <Link href="/report-templates" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
          Back to templates
        </Link>
        <h1 style={{ fontSize: "1.75rem", margin: "0.5rem 0 0" }}>{template.name}</h1>
        <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>{template.description ?? "No description"}</p>
      </div>

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
        {!template.is_default ? (
          <form action={setReportTemplateActive} style={{ marginTop: "1rem" }}>
            <input name="template_id" type="hidden" value={template.id} />
            <input name="active" type="hidden" value={template.active ? "false" : "true"} />
            <Button type="submit" variant="secondary">
              {template.active ? "Deactivate Template" : "Activate Template"}
            </Button>
          </form>
        ) : null}
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Template Preview</h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {visibleSections.map((section, index) => (
            <div key={section.sectionId} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "0.75rem" }}>
              <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                {index + 1}. {blockLabel[section.blockType] ?? section.blockType}
              </div>
              <strong>{section.content.title ?? section.sectionId}</strong>
              {section.content.description ? <div style={{ color: "var(--muted)", marginTop: 4 }}>{section.content.description}</div> : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
