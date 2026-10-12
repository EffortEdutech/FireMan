"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { ReportTemplateSectionCard } from "@/components/reports/report-template-section-card";
import { ReportTemplatePreviewPanel } from "@/components/reports/report-template-preview-panel";
import { Button } from "@/components/ui/button";
import type { ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";
import { buildReportLayoutDefinition, reportTemplateSections, type TemplatePreset } from "@/lib/reports/template-builder";

export type ReportTemplateFormState = {
  description: string;
  name: string;
  sectionColumns: Map<string, number>;
  sectionPhotoRows: Map<string, number>;
  sectionShowCaptions: Map<string, boolean>;
  sectionById?: Map<string, { section: ReportLayoutSection; index: number }>;
  sectionOrder: Map<string, number>;
  sectionTitles: Map<string, string>;
  selectedFieldsBySection: Map<string, Set<string>>;
  selectedSectionIds: Set<string>;
};

type ReportTemplateFormWorkspaceProps = {
  action: (formData: FormData) => Promise<void>;
  children?: React.ReactNode;
  initialState: ReportTemplateFormState;
  previewFallbackName: string;
  previewHelp: string;
  submitLabel: string;
  topControls?: (controls: {
    description: string;
    fieldStyle: typeof fieldStyle;
    name: string;
    setDescription: (value: string) => void;
    setName: (value: string) => void;
  }) => React.ReactNode;
};

const fieldStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
};

function sectionFieldsPayload(selectedFieldsBySection: Map<string, Set<string>>) {
  return new Map(Array.from(selectedFieldsBySection.entries()).map(([sectionId, fields]) => [sectionId, Array.from(fields)] as const));
}

function sectionTitlesPayload(sectionTitles: Map<string, string>) {
  return new Map(
    reportTemplateSections.map((section) => {
      const title = sectionTitles.get(section.id)?.trim();

      return [section.id, title && title.length > 0 ? title : section.defaultTitle] as const;
    })
  );
}

function numberSettingPayload(settings: Map<string, number>) {
  return new Map(settings);
}

function booleanSettingPayload(settings: Map<string, boolean>) {
  return new Map(settings);
}

function orderedSectionIds(sectionOrder: Map<string, number>) {
  return [...reportTemplateSections]
    .sort((a, b) => (sectionOrder.get(a.id) ?? 999) - (sectionOrder.get(b.id) ?? 999))
    .map((section) => section.id);
}

function normalizeSectionOrder(sectionIds: string[]) {
  return new Map(sectionIds.map((sectionId, index) => [sectionId, index + 1] as const));
}

export function sectionMapFromLayout(layout: ReportLayoutDefinition) {
  return new Map(layout.sections.map((section, index) => [section.sectionId, { section, index }]));
}

export function ReportTemplateFormWorkspace({
  action,
  children,
  initialState,
  previewFallbackName,
  previewHelp,
  submitLabel,
  topControls
}: ReportTemplateFormWorkspaceProps) {
  const [description, setDescription] = useState(initialState.description);
  const [name, setName] = useState(initialState.name);
  const [sectionColumns, setSectionColumns] = useState(initialState.sectionColumns);
  const [sectionPhotoRows, setSectionPhotoRows] = useState(initialState.sectionPhotoRows);
  const [sectionShowCaptions, setSectionShowCaptions] = useState(initialState.sectionShowCaptions);
  const [sectionOrder, setSectionOrder] = useState(initialState.sectionOrder);
  const [sectionTitles, setSectionTitles] = useState(initialState.sectionTitles);
  const [selectedSectionIds, setSelectedSectionIds] = useState(initialState.selectedSectionIds);
  const [selectedFieldsBySection, setSelectedFieldsBySection] = useState(initialState.selectedFieldsBySection);
  const selectedCount = selectedSectionIds.size;
  const selectedFieldCount = useMemo(
    () => Array.from(selectedFieldsBySection.values()).reduce((count, fields) => count + fields.size, 0),
    [selectedFieldsBySection]
  );
  const previewLayout = useMemo(
    () =>
      buildReportLayoutDefinition({
        description: description.trim() || null,
        name: name.trim() || previewFallbackName,
        preset: "custom" as TemplatePreset,
        sectionColumns: numberSettingPayload(sectionColumns),
        sectionFields: sectionFieldsPayload(selectedFieldsBySection),
        sectionPhotoRows: numberSettingPayload(sectionPhotoRows),
        sectionShowCaptions: booleanSettingPayload(sectionShowCaptions),
        sectionOrderIds: orderedSectionIds(sectionOrder),
        sectionTitles: sectionTitlesPayload(sectionTitles),
        selectedSectionIds
      }),
    [
      description,
      name,
      previewFallbackName,
      sectionColumns,
      sectionOrder,
      sectionPhotoRows,
      sectionShowCaptions,
      sectionTitles,
      selectedFieldsBySection,
      selectedSectionIds
    ]
  );

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

  function updateSectionTitle(sectionId: string, title: string) {
    setSectionTitles((current) => {
      const next = new Map(current);

      next.set(sectionId, title);
      return next;
    });
  }

  function updateSectionOrder(sectionId: string, order: number) {
    setSectionOrder((current) => {
      const next = new Map(current);

      next.set(sectionId, order);
      return next;
    });
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    setSectionOrder((current) => {
      const orderedIds = orderedSectionIds(current);
      const currentIndex = orderedIds.indexOf(sectionId);

      if (currentIndex < 0) {
        return current;
      }

      const targetIndex = currentIndex + direction;

      if (targetIndex < 0 || targetIndex >= orderedIds.length) {
        return current;
      }

      const nextIds = [...orderedIds];
      const [moved] = nextIds.splice(currentIndex, 1);

      if (!moved) {
        return current;
      }

      nextIds.splice(targetIndex, 0, moved);
      return normalizeSectionOrder(nextIds);
    });
  }

  function updateSectionColumns(sectionId: string, columns: number) {
    setSectionColumns((current) => {
      const next = new Map(current);

      next.set(sectionId, columns);
      return next;
    });
  }

  function updateSectionPhotoRows(sectionId: string, rows: number) {
    setSectionPhotoRows((current) => {
      const next = new Map(current);

      next.set(sectionId, rows);
      return next;
    });
  }

  function updateSectionShowCaptions(sectionId: string, showCaptions: boolean) {
    setSectionShowCaptions((current) => {
      const next = new Map(current);

      next.set(sectionId, showCaptions);
      return next;
    });
  }

  return (
    <form action={action} style={{ display: "grid", gap: "1rem" }}>
      {children}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))", gap: "1rem" }}>
        <div style={{ alignContent: "start", display: "grid", gap: "1rem" }}>
          {topControls ? topControls({ description, fieldStyle, name, setDescription, setName }) : null}

          <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Current setup: {selectedCount} section{selectedCount === 1 ? "" : "s"} and {selectedFieldCount} field
            {selectedFieldCount === 1 ? "" : "s"} selected.
          </div>

          <div style={{ display: "grid", gap: "0.75rem" }}>
            {reportTemplateSections.map((section, defaultIndex) => {
              const existing = initialState.sectionById?.get(section.id);
              const selectedFields = selectedFieldsBySection.get(section.id) ?? new Set<string>();

              return (
                <ReportTemplateSectionCard
                  checked={selectedSectionIds.has(section.id)}
                  defaultIndex={defaultIndex}
                  existing={existing}
                  fieldChecked={Object.fromEntries((section.fields ?? []).map((field) => [field, selectedFields.has(field)]))}
                  key={section.id}
                  columns={sectionColumns.get(section.id) ?? section.defaultColumns ?? 1}
                  order={sectionOrder.get(section.id) ?? defaultIndex + 1}
                  onFieldChange={(field, checked) => toggleField(section.id, field, checked)}
                  onColumnsChange={(columns) => updateSectionColumns(section.id, columns)}
                  onMoveDown={() => moveSection(section.id, 1)}
                  onMoveUp={() => moveSection(section.id, -1)}
                  onOrderChange={(order) => updateSectionOrder(section.id, order)}
                  onPhotoRowsChange={(rows) => updateSectionPhotoRows(section.id, rows)}
                  onSectionChange={(checked) => toggleSection(section.id, checked)}
                  onShowCaptionsChange={(showCaptions) => updateSectionShowCaptions(section.id, showCaptions)}
                  onTitleChange={(title) => updateSectionTitle(section.id, title)}
                  photoRows={sectionPhotoRows.get(section.id) ?? section.defaultPhotoRows ?? 2}
                  section={section}
                  showCaptions={sectionShowCaptions.get(section.id) ?? true}
                  title={sectionTitles.get(section.id) ?? section.defaultTitle}
                />
              );
            })}
          </div>

          <div>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </div>

        <div style={{ alignContent: "start", display: "grid", gap: "0.75rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", margin: 0 }}>Live Preview</h3>
            <p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>{previewHelp}</p>
          </div>
          <ReportTemplatePreviewPanel compact layout={previewLayout} />
        </div>
      </div>
    </form>
  );
}
