"use client";

import { useMemo, useState } from "react";
import { ReportTemplateSectionCard } from "@/components/reports/report-template-section-card";
import { ReportTemplatePreviewPanel } from "@/components/reports/report-template-preview-panel";
import { Button } from "@/components/ui/button";
import type { ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";
import { buildReportLayoutDefinition, reportTemplateSections } from "@/lib/reports/template-builder";

type ReportTemplateEditFormProps = {
  action: (formData: FormData) => Promise<void>;
  layout: ReportLayoutDefinition;
  template: {
    description: string | null;
    id: string;
    name: string;
  };
};

const fieldStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
};

function initialSections(layout: ReportLayoutDefinition) {
  return new Map(layout.sections.map((section, index) => [section.sectionId, { section, index }]));
}

function initialSectionIds(sectionById: Map<string, { section: ReportLayoutSection; index: number }>) {
  return new Set(reportTemplateSections.filter((section) => sectionById.has(section.id)).map((section) => section.id));
}

function initialFields(sectionById: Map<string, { section: ReportLayoutSection; index: number }>) {
  return new Map(
    reportTemplateSections.map((section) => {
      const existingFields = sectionById.get(section.id)?.section.binding.fields ?? section.fields ?? [];

      return [section.id, new Set(existingFields)] as const;
    })
  );
}

export function ReportTemplateEditForm({ action, layout, template }: ReportTemplateEditFormProps) {
  const sectionById = useMemo(() => initialSections(layout), [layout]);
  const [description, setDescription] = useState(template.description ?? "");
  const [name, setName] = useState(template.name);
  const [selectedSectionIds, setSelectedSectionIds] = useState(() => initialSectionIds(sectionById));
  const [selectedFieldsBySection, setSelectedFieldsBySection] = useState(() => initialFields(sectionById));
  const selectedCount = selectedSectionIds.size;
  const selectedFieldCount = useMemo(
    () => Array.from(selectedFieldsBySection.values()).reduce((count, fields) => count + fields.size, 0),
    [selectedFieldsBySection]
  );
  const previewLayout = useMemo(() => {
    const sectionFields = new Map(
      Array.from(selectedFieldsBySection.entries()).map(([sectionId, fields]) => [sectionId, Array.from(fields)] as const)
    );
    const sectionOrderIds = [...reportTemplateSections]
      .sort((a, b) => (sectionById.get(a.id)?.index ?? 999) - (sectionById.get(b.id)?.index ?? 999))
      .map((section) => section.id);
    const sectionTitles = new Map(
      reportTemplateSections.map((section) => [
        section.id,
        sectionById.get(section.id)?.section.content.title ?? section.defaultTitle
      ] as const)
    );

    return buildReportLayoutDefinition({
      description: description.trim() || null,
      name: name.trim() || "Edited Report Template",
      preset: "custom",
      sectionFields,
      sectionOrderIds,
      sectionTitles,
      selectedSectionIds
    });
  }, [description, name, sectionById, selectedFieldsBySection, selectedSectionIds]);

  function toggleSection(sectionId: string, checked: boolean) {
    setSelectedSectionIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(sectionId);
      } else {
        next.delete(sectionId);
      }

      return next;
    });
  }

  function toggleField(sectionId: string, field: string, checked: boolean) {
    setSelectedFieldsBySection((current) => {
      const next = new Map(current);
      const fields = new Set(next.get(sectionId) ?? []);

      if (checked) {
        fields.add(field);
      } else {
        fields.delete(field);
      }

      next.set(sectionId, fields);
      return next;
    });
  }

  return (
    <form action={action} style={{ display: "grid", gap: "1rem" }}>
      <input name="template_id" type="hidden" value={template.id} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))", gap: "1rem" }}>
        <div style={{ alignContent: "start", display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <input
              aria-label="Template name"
              name="name"
              onChange={(event) => setName(event.target.value)}
              required
              style={fieldStyle}
              value={name}
            />
            <textarea
              aria-label="Template description"
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description"
              style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }}
              value={description}
            />
          </div>

          <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Current setup: {selectedCount} section{selectedCount === 1 ? "" : "s"} and {selectedFieldCount} field
            {selectedFieldCount === 1 ? "" : "s"} selected.
          </div>

          <div style={{ display: "grid", gap: "0.75rem" }}>
            {reportTemplateSections.map((section, defaultIndex) => {
              const existing = sectionById.get(section.id);
              const selectedFields = selectedFieldsBySection.get(section.id) ?? new Set<string>();

              return (
                <ReportTemplateSectionCard
                  checked={selectedSectionIds.has(section.id)}
                  defaultIndex={defaultIndex}
                  existing={existing}
                  fieldChecked={Object.fromEntries((section.fields ?? []).map((field) => [field, selectedFields.has(field)]))}
                  key={section.id}
                  onFieldChange={(field, checked) => toggleField(section.id, field, checked)}
                  onSectionChange={(checked) => toggleSection(section.id, checked)}
                  section={section}
                />
              );
            })}
          </div>

          <div>
            <Button type="submit">Save Template</Button>
          </div>
        </div>

        <div style={{ alignContent: "start", display: "grid", gap: "0.75rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", margin: 0 }}>Live Preview</h3>
            <p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>
              Updates as you adjust the duplicated template before saving.
            </p>
          </div>
          <ReportTemplatePreviewPanel compact layout={previewLayout} />
        </div>
      </div>
    </form>
  );
}
