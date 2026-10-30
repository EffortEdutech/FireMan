"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReportTemplatePreviewPanel } from "@/components/reports/report-template-preview-panel";
import { resolveReportLayout } from "@/lib/reports/report-template";
import type { Json } from "@/lib/supabase/database.types";

type ReportableJob = {
  clients: { name: string | null } | null;
  id: string;
  job_number: string;
  scheduled_date: string;
  sites: { name: string | null } | null;
};

type ReportTemplateOption = {
  description: string | null;
  id: string;
  is_default: boolean;
  layout: Json;
  name: string;
};

type ReportGenerationFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultTemplateId: string;
  jobs: ReportableJob[];
  templates: ReportTemplateOption[];
};

const fieldStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
};

function templateSummary(template: ReportTemplateOption) {
  const layout = resolveReportLayout(template.layout);
  const sections = layout.sections.filter((section) => section.blockType !== "header");
  const evidenceSection = sections.find((section) => section.blockType === "field_evidence");
  const columns = evidenceSection?.options?.columns;
  const photoRows = evidenceSection?.options?.photoRows;
  const fieldCount = sections.reduce((count, section) => count + (section.binding.fields?.length ?? 0), 0);

  return {
    evidenceLayout:
      evidenceSection && typeof columns === "number" && typeof photoRows === "number"
        ? `${columns} x ${photoRows} evidence photo grid`
        : "Standard evidence layout",
    fieldCount,
    layout,
    sectionCount: sections.length
  };
}

function ContextPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.65rem 0.75rem" }}>
      <div style={{ color: "var(--muted)", fontSize: "0.7rem", fontWeight: 700 }}>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

export function ReportGenerationForm({ action, defaultTemplateId, jobs, templates }: ReportGenerationFormProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const hasJobs = jobs.length > 0;
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
    [selectedTemplateId, templates]
  );
  const selectedSummary = selectedTemplate ? templateSummary(selectedTemplate) : null;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <form action={action} style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <select aria-label="Maintenance job" disabled={!hasJobs} name="job_id" required style={fieldStyle}>
            <option value="">{hasJobs ? "Select reviewed field job" : "No field jobs ready for report"}</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.job_number} - {job.clients?.name ?? "Client"} / {job.sites?.name ?? "Site"}
              </option>
            ))}
          </select>
          <select
            aria-label="Report template"
            disabled={!hasJobs || templates.length === 0}
            name="template_id"
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            required
            style={fieldStyle}
            value={selectedTemplateId}
          >
            <option value="">{templates.length > 0 ? "Select report template" : "No report templates"}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.is_default ? " (default)" : ""}
              </option>
            ))}
          </select>
          <input aria-label="Report title" disabled={!hasJobs} name="title" placeholder="Report title" style={fieldStyle} />
        </div>
        <div>
          <Button disabled={!hasJobs} type="submit">
            Create report from evidence
          </Button>
        </div>
      </form>

      {selectedTemplate && selectedSummary ? (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <div style={{ alignItems: "flex-start", display: "flex", gap: "1rem", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", margin: 0 }}>{selectedTemplate.name}</h3>
              <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 4 }}>
                This exact template version will be saved on the report shell when generated.
              </div>
              {selectedTemplate.description ? (
                <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>{selectedTemplate.description}</p>
              ) : null}
            </div>
            <Link href={`/report-templates/${selectedTemplate.id}`} style={{ color: "var(--accent)", fontSize: "0.875rem", fontWeight: 700 }}>
              Open full preview
            </Link>
          </div>
          <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: "1rem" }}>
            <ContextPill label="Template Type" value={selectedTemplate.is_default ? "Default" : "Custom"} />
            <ContextPill label="Version Behavior" value="Frozen on report" />
            <ContextPill
              label="Sections"
              value={`${selectedSummary.sectionCount} section${selectedSummary.sectionCount === 1 ? "" : "s"}`}
            />
            <ContextPill
              label="Selected Fields"
              value={`${selectedSummary.fieldCount} field${selectedSummary.fieldCount === 1 ? "" : "s"}`}
            />
            <ContextPill label="Evidence Layout" value={selectedSummary.evidenceLayout} />
          </div>
          <ReportTemplatePreviewPanel compact layout={selectedSummary.layout} />
        </div>
      ) : null}
    </div>
  );
}
