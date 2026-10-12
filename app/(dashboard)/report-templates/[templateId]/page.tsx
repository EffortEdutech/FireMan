import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { duplicateReportTemplate, setReportTemplateActive } from "@/app/(dashboard)/report-templates/actions";
import { ReportTemplatePreviewPanel } from "@/components/reports/report-template-preview-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth/current-user";
import { formatDate } from "@/lib/format/date";
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

export default async function ReportTemplateDetailPage({ params, searchParams }: ReportTemplateDetailPageProps) {
  const profile = await requireProfile();

  if (!canAccessManagement(profile.role)) {
    redirect("/dashboard");
  }

  const { templateId } = await params;
  const pageParams = await searchParams;
  const supabase = await createClient();
  const [{ data: template, error }, { data: usedReports, count: reportCount }] = await Promise.all([
    supabase
      .from("report_templates")
      .select("id,name,description,slug,is_default,active,layout,created_at")
      .eq("id", templateId)
      .single(),
    supabase
      .from("reports")
      .select(
        "id,report_number,title,status,generated_at,issued_at,maintenance_jobs(job_number,scheduled_date,clients(name),sites(name))",
        { count: "exact" }
      )
      .eq("template_id", templateId)
      .order("created_at", { ascending: false })
  ]);

  if (error || !template) {
    notFound();
  }

  const layout = resolveReportLayout(template.layout);
  const isEditable = !template.is_default && (reportCount ?? 0) === 0;
  const sections = layout.sections.filter((section) => section.blockType !== "header");
  const fieldCount = sections.reduce((count, section) => count + (section.binding.fields?.length ?? 0), 0);
  const lockedReason = template.is_default
    ? "Default template"
    : (reportCount ?? 0) > 0
      ? "Used by issued/generated reports"
      : "Not used yet";

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
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Editability</div>
            <strong>{isEditable ? "Editable" : "Locked"}</strong>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{lockedReason}</div>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Sections</div>
            <strong>{sections.length}</strong>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Selected fields</div>
            <strong>{fieldCount}</strong>
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
        <ReportTemplatePreviewPanel layout={layout} />
      </Card>

      <Card style={{ padding: 0 }}>
        <div style={{ padding: "1rem 1rem 0" }}>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>Reports using this template</h2>
          <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 4 }}>
            These generated or issued reports lock the template layout. Duplicate the template to make a new version.
          </div>
        </div>
        {usedReports && usedReports.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table">
              <colgroup>
                <col style={{ width: 150 }} />
                <col style={{ width: 240 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 120 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Job</th>
                  <th>Client</th>
                  <th>Site</th>
                  <th>Generated</th>
                  <th>Issued</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {usedReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <Link href={`/reports/${report.id}`}>
                        <strong>{report.report_number}</strong>
                      </Link>
                    </td>
                    <td>{report.title ?? "Untitled report"}</td>
                    <td>
                      <StatusBadge>{report.status}</StatusBadge>
                    </td>
                    <td>{report.maintenance_jobs?.job_number ?? "Not set"}</td>
                    <td>{report.maintenance_jobs?.clients?.name ?? "Not set"}</td>
                    <td>{report.maintenance_jobs?.sites?.name ?? "Not set"}</td>
                    <td>{formatDate(report.generated_at)}</td>
                    <td>{formatDate(report.issued_at)}</td>
                    <td>
                      <Link href={`/reports/${report.id}`} style={{ color: "var(--accent)", fontWeight: 700 }}>
                        Open Report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "1rem" }}>
            <EmptyState title="No reports use this template yet" message="This template can still be edited until a report is generated with it." />
          </div>
        )}
      </Card>
    </div>
  );
}
