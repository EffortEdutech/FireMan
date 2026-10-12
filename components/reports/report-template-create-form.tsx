"use client";

import { useMemo, useState } from "react";
import { ReportTemplateSectionCard } from "@/components/reports/report-template-section-card";
import { ReportTemplatePreviewPanel } from "@/components/reports/report-template-preview-panel";
import { Button } from "@/components/ui/button";
import {
  buildReportLayoutDefinition,
  presetSectionFields,
  presetSectionIds,
  reportTemplateSections,
  type TemplatePreset
} from "@/lib/reports/template-builder";

type ReportTemplateCreateFormProps = {
  action: (formData: FormData) => Promise<void>;
};

const fieldStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
};

function presetState(preset: TemplatePreset) {
  const sectionIds = new Set(presetSectionIds[preset]);
  const fieldsBySection = new Map(
    reportTemplateSections.map((section) => {
      const presetFields = presetSectionFields[preset][section.id] ?? section.fields ?? [];

      return [section.id, new Set(presetFields)] as const;
    })
  );

  return { fieldsBySection, sectionIds };
}

export function ReportTemplateCreateForm({ action }: ReportTemplateCreateFormProps) {
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<TemplatePreset>("client_summary");
  const [selectedSectionIds, setSelectedSectionIds] = useState(() => presetState("client_summary").sectionIds);
  const [selectedFieldsBySection, setSelectedFieldsBySection] = useState(() => presetState("client_summary").fieldsBySection);
  const selectedCount = selectedSectionIds.size;
  const selectedFieldCount = useMemo(
    () => Array.from(selectedFieldsBySection.values()).reduce((count, fields) => count + fields.size, 0),
    [selectedFieldsBySection]
  );
  const previewLayout = useMemo(() => {
    const sectionFields = new Map(
      Array.from(selectedFieldsBySection.entries()).map(([sectionId, fields]) => [sectionId, Array.from(fields)] as const)
    );
    const sectionTitles = new Map(reportTemplateSections.map((section) => [section.id, section.defaultTitle] as const));

    return buildReportLayoutDefinition({
      description: description.trim() || null,
      name: name.trim() || "New Report Template",
      preset,
      sectionFields,
      sectionOrderIds: reportTemplateSections.map((section) => section.id),
      sectionTitles,
      selectedSectionIds
    });
  }, [description, name, preset, selectedFieldsBySection, selectedSectionIds]);

  function applyPreset(nextPreset: TemplatePreset) {
    const nextState = presetState(nextPreset);

    setPreset(nextPreset);
    setSelectedSectionIds(nextState.sectionIds);
    setSelectedFieldsBySection(nextState.fieldsBySection);
  }

  function toggleSection(sectionId: string, checked: boolean) {
    setPreset("custom");
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
    setPreset("custom");
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))", gap: "1rem" }}>
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <input
              aria-label="Template name"
              name="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Template name"
              required
              style={fieldStyle}
              value={name}
            />
            <select
              aria-label="Template preset"
              name="preset"
              onChange={(event) => applyPreset(event.target.value as TemplatePreset)}
              style={fieldStyle}
              value={preset}
            >
              <option value="client_summary">Client Summary Report</option>
              <option value="detailed_evidence">Detailed Evidence Report</option>
              <option value="custom">Custom Section Set</option>
            </select>
          </div>
          <textarea
            aria-label="Template description"
            name="description"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short description"
            style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }}
            value={description}
          />
          <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Current setup: {selectedCount} section{selectedCount === 1 ? "" : "s"} and {selectedFieldCount} field
            {selectedFieldCount === 1 ? "" : "s"} selected.
          </div>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {reportTemplateSections.map((section, index) => {
              const selectedFields = selectedFieldsBySection.get(section.id) ?? new Set<string>();

              return (
                <ReportTemplateSectionCard
                  checked={selectedSectionIds.has(section.id)}
                  defaultIndex={index}
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
            <Button type="submit">Create Template</Button>
          </div>
        </div>
        <div style={{ display: "grid", gap: "0.75rem", alignContent: "start" }}>
          <div>
            <h3 style={{ fontSize: "1rem", margin: 0 }}>Live Preview</h3>
            <p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>
              Updates as you change preset, sections, and included fields.
            </p>
          </div>
          <ReportTemplatePreviewPanel compact layout={previewLayout} />
        </div>
      </div>
    </form>
  );
}
