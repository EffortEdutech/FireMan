import type { ChangeEvent } from "react";
import type { ReportLayoutSection } from "@/lib/reports/report-layout";
import type { ReportTemplateSectionDefinition } from "@/lib/reports/template-builder";

type ReportTemplateSectionCardProps = {
  checked?: boolean;
  defaultIndex: number;
  fieldChecked?: Record<string, boolean>;
  existing?: {
    index: number;
    section: ReportLayoutSection;
  } | undefined;
  onFieldChange?: (field: string, checked: boolean) => void;
  onSectionChange?: (checked: boolean) => void;
  onTitleChange?: (title: string) => void;
  section: ReportTemplateSectionDefinition;
  title?: string;
};

const fieldStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
};

const labelStyle = {
  color: "var(--muted)",
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 700,
  marginBottom: 4,
  textTransform: "uppercase" as const
};

function blockLabel(blockType: string) {
  const labels: Record<string, string> = {
    asset_table: "Asset table",
    checklist_evidence: "Checklist",
    field_evidence: "Evidence photos",
    signature_box: "Signatures",
    summary_grid: "Summary cards"
  };

  return labels[blockType] ?? blockType;
}

export function ReportTemplateSectionCard({
  checked,
  defaultIndex,
  existing,
  fieldChecked,
  onFieldChange,
  onSectionChange,
  onTitleChange,
  section,
  title
}: ReportTemplateSectionCardProps) {
  const enabled = checked ?? (existing ? Boolean(existing) : true);
  const columns = Number(existing?.section.options?.columns ?? section.defaultColumns ?? 1);
  const photoRows = Number(existing?.section.options?.photoRows ?? section.defaultPhotoRows ?? 2);
  const photoSlots = section.supportsPhotoOptions ? Math.max(1, columns) * Math.max(1, photoRows) : null;
  const existingFields = new Set(existing?.section.binding.fields ?? section.fields ?? []);
  const sectionInputProps =
    checked === undefined
      ? { defaultChecked: enabled }
      : {
          checked: enabled,
          onChange: (event: ChangeEvent<HTMLInputElement>) => onSectionChange?.(event.target.checked)
        };

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        display: "grid",
        gap: "0.875rem",
        padding: "1rem"
      }}
    >
      <div style={{ alignItems: "flex-start", display: "flex", gap: "0.75rem", justifyContent: "space-between" }}>
        <label style={{ alignItems: "center", display: "flex", gap: "0.5rem", fontWeight: 700 }}>
          <input name="section_id" type="checkbox" value={section.id} {...sectionInputProps} />
          {section.defaultTitle}
        </label>
        <span
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            color: "var(--muted)",
            fontSize: "0.75rem",
            fontWeight: 700,
            padding: "0.25rem 0.625rem",
            whiteSpace: "nowrap"
          }}
        >
          {blockLabel(section.blockType)}
        </span>
      </div>

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <div>
          <label style={labelStyle}>Order</label>
          <input
            aria-label={`${section.defaultTitle} section order`}
            defaultValue={(existing?.index ?? defaultIndex) + 1}
            min={1}
            name={`section_order_${section.id}`}
            style={fieldStyle}
            type="number"
          />
        </div>
        <div>
          <label style={labelStyle}>Columns</label>
          <input
            aria-label={`${section.defaultTitle} columns per row`}
            defaultValue={columns}
            max={4}
            min={1}
            name={`section_columns_${section.id}`}
            style={fieldStyle}
            type="number"
          />
        </div>
        {section.supportsPhotoOptions ? (
          <div>
            <label style={labelStyle}>Photo Rows</label>
            <input
              aria-label={`${section.defaultTitle} photo rows`}
              defaultValue={photoRows}
              max={8}
              min={1}
              name={`section_photo_rows_${section.id}`}
              style={fieldStyle}
              type="number"
            />
          </div>
        ) : null}
        <div style={{ gridColumn: "span 2" }}>
          <label style={labelStyle}>Section Title</label>
          <input
            aria-label={`${section.defaultTitle} section title`}
            name={`section_title_${section.id}`}
            {...(title === undefined
              ? { defaultValue: existing?.section.content.title ?? section.defaultTitle }
              : {
                  onChange: (event: ChangeEvent<HTMLInputElement>) => onTitleChange?.(event.target.value),
                  value: title
                })}
            style={{ ...fieldStyle, width: "100%" }}
          />
        </div>
      </div>

      {section.supportsPhotoOptions ? (
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "space-between" }}>
          <label style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
            <input
              defaultChecked={existing?.section.options?.showCaptions !== false}
              name={`section_show_captions_${section.id}`}
              type="checkbox"
              value="true"
            />
            Show photo captions
          </label>
          <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Preview: up to {photoSlots} photo{photoSlots === 1 ? "" : "s"} per finding
          </div>
        </div>
      ) : (
        <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
          Preview: {columns} column{columns === 1 ? "" : "s"} for this section where the output supports columns.
        </div>
      )}

      {section.fields && section.fields.length > 0 ? (
        <div style={{ borderTop: "1px solid var(--border)", display: "grid", gap: "0.625rem", paddingTop: "0.875rem" }}>
          <div>
            <div style={labelStyle}>Included Fields</div>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Choose what this section contributes to the generated report.
            </div>
          </div>
          <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {section.fields.map((field) => (
              <label key={field} style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
                <input
                  {...(fieldChecked
                    ? {
                        checked: fieldChecked[field] ?? false,
                        onChange: (event: ChangeEvent<HTMLInputElement>) => onFieldChange?.(field, event.target.checked)
                      }
                    : { defaultChecked: existingFields.has(field) })}
                  name={`section_field_${section.id}`}
                  type="checkbox"
                  value={field}
                />
                {section.fieldLabels?.[field] ?? field}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
