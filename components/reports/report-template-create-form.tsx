"use client";

import { useMemo, useState } from "react";
import { ReportTemplateSectionCard } from "@/components/reports/report-template-section-card";
import { Button } from "@/components/ui/button";
import {
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
  const [preset, setPreset] = useState<TemplatePreset>("client_summary");
  const [selectedSectionIds, setSelectedSectionIds] = useState(() => presetState("client_summary").sectionIds);
  const [selectedFieldsBySection, setSelectedFieldsBySection] = useState(() => presetState("client_summary").fieldsBySection);
  const selectedCount = selectedSectionIds.size;
  const selectedFieldCount = useMemo(
    () => Array.from(selectedFieldsBySection.values()).reduce((count, fields) => count + fields.size, 0),
    [selectedFieldsBySection]
  );

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <input aria-label="Template name" name="name" placeholder="Template name" required style={fieldStyle} />
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
        placeholder="Short description"
        style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }}
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
    </form>
  );
}
