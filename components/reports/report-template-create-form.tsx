"use client";

import { useState } from "react";
import { ReportTemplateFormWorkspace, type ReportTemplateFormState } from "@/components/reports/report-template-form-workspace";
import { presetSectionFields, presetSectionIds, reportTemplateSections, type TemplatePreset } from "@/lib/reports/template-builder";

type ReportTemplateCreateFormProps = {
  action: (formData: FormData) => Promise<void>;
};

function presetState(preset: TemplatePreset): ReportTemplateFormState {
  const selectedSectionIds = new Set(presetSectionIds[preset]);
  const selectedFieldsBySection = new Map(
    reportTemplateSections.map((section) => {
      const presetFields = presetSectionFields[preset][section.id] ?? section.fields ?? [];

      return [section.id, new Set(presetFields)] as const;
    })
  );

  return {
    description: "",
    name: "",
    sectionColumns: new Map(reportTemplateSections.map((section) => [section.id, section.defaultColumns ?? 1] as const)),
    sectionOrder: new Map(reportTemplateSections.map((section, index) => [section.id, index + 1] as const)),
    sectionPhotoRows: new Map(reportTemplateSections.map((section) => [section.id, section.defaultPhotoRows ?? 2] as const)),
    sectionShowCaptions: new Map(reportTemplateSections.map((section) => [section.id, true] as const)),
    sectionTitles: new Map(reportTemplateSections.map((section) => [section.id, section.defaultTitle] as const)),
    selectedFieldsBySection,
    selectedSectionIds
  };
}

export function ReportTemplateCreateForm({ action }: ReportTemplateCreateFormProps) {
  const [preset, setPreset] = useState<TemplatePreset>("client_summary");
  const [formState, setFormState] = useState(() => presetState("client_summary"));

  function applyPreset(nextPreset: TemplatePreset) {
    setPreset(nextPreset);
    setFormState((current) => ({
      ...presetState(nextPreset),
      description: current.description,
      name: current.name
    }));
  }

  return (
    <ReportTemplateFormWorkspace
      action={action}
      initialState={formState}
      key={preset}
      previewFallbackName="New Report Template"
      previewHelp="Updates as you change preset, sections, and included fields."
      submitLabel="Create Template"
      topControls={({ description, fieldStyle, name, setDescription, setName }) => (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <input
              aria-label="Template name"
              name="name"
              onChange={(event) => {
                setName(event.target.value);
                setFormState((current) => ({ ...current, name: event.target.value }));
              }}
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
            onChange={(event) => {
              setDescription(event.target.value);
              setFormState((current) => ({ ...current, description: event.target.value }));
            }}
            placeholder="Short description"
            style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }}
            value={description}
          />
        </>
      )}
    />
  );
}
