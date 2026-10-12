"use client";

import {
  ReportTemplateFormWorkspace,
  sectionMapFromLayout,
  type ReportTemplateFormState
} from "@/components/reports/report-template-form-workspace";
import type { ReportLayoutDefinition } from "@/lib/reports/report-layout";
import { reportTemplateSections } from "@/lib/reports/template-builder";

type ReportTemplateEditFormProps = {
  action: (formData: FormData) => Promise<void>;
  layout: ReportLayoutDefinition;
  template: {
    description: string | null;
    id: string;
    name: string;
  };
};

function initialState(layout: ReportLayoutDefinition, template: ReportTemplateEditFormProps["template"]): ReportTemplateFormState {
  const sectionById = sectionMapFromLayout(layout);

  return {
    description: template.description ?? "",
    name: template.name,
    sectionById,
    selectedFieldsBySection: new Map(
      reportTemplateSections.map((section) => {
        const existingFields = sectionById.get(section.id)?.section.binding.fields ?? section.fields ?? [];

        return [section.id, new Set(existingFields)] as const;
      })
    ),
    selectedSectionIds: new Set(reportTemplateSections.filter((section) => sectionById.has(section.id)).map((section) => section.id))
  };
}

export function ReportTemplateEditForm({ action, layout, template }: ReportTemplateEditFormProps) {
  return (
    <ReportTemplateFormWorkspace
      action={action}
      initialState={initialState(layout, template)}
      previewFallbackName="Edited Report Template"
      previewHelp="Updates as you adjust the duplicated template before saving."
      submitLabel="Save Template"
      topControls={({ description, fieldStyle, name, setDescription, setName }) => (
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
      )}
    >
      <input name="template_id" type="hidden" value={template.id} />
    </ReportTemplateFormWorkspace>
  );
}
