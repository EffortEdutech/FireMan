import type { ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";

type ReportTemplatePreviewPanelProps = {
  layout: ReportLayoutDefinition;
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

function optionNumber(section: ReportLayoutSection, key: string, fallback: number) {
  const value = Number(section.options?.[key] ?? fallback);

  return Number.isFinite(value) ? value : fallback;
}

function optionSummary(section: ReportLayoutSection) {
  const options = [];
  const columns = Number(section.options?.columns);

  if (Number.isFinite(columns)) {
    options.push(`${columns} column${columns === 1 ? "" : "s"}`);
  }

  if (section.options?.photoRows) {
    options.push(`${section.options.photoRows} photo row${section.options.photoRows === 1 ? "" : "s"}`);
  }

  if (section.options?.showCaptions === false) {
    options.push("captions hidden");
  }

  if (section.options?.layout) {
    options.push(String(section.options.layout).replaceAll("_", " "));
  }

  return options;
}

function bindingSummary(section: ReportLayoutSection) {
  const source = section.binding.source ? [section.binding.source] : [];
  const fields = section.binding.fields?.slice(0, 4) ?? [];
  const extra = section.binding.fields && section.binding.fields.length > fields.length ? [`+${section.binding.fields.length - fields.length}`] : [];

  return [...source, ...fields, ...extra];
}

function MiniBlock({ section }: { section: ReportLayoutSection }) {
  const columns = Math.min(4, Math.max(1, optionNumber(section, "columns", section.blockType === "summary_grid" ? 3 : 2)));
  const photoRows = Math.min(4, Math.max(1, optionNumber(section, "photoRows", 2)));

  if (section.blockType === "summary_grid") {
    return (
      <div style={{ display: "grid", gap: 6, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: Math.min(columns * 2, 6) }).map((_, index) => (
          <div key={index} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, minHeight: 34 }} />
        ))}
      </div>
    );
  }

  if (section.blockType === "field_evidence") {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, minHeight: 42 }} />
        <div style={{ display: "grid", gap: 6, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: Math.min(columns * photoRows, 8) }).map((_, index) => (
            <div key={index} style={{ aspectRatio: "4 / 3", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }} />
          ))}
        </div>
      </div>
    );
  }

  if (section.blockType === "asset_table" || section.blockType === "checklist_evidence") {
    return (
      <div style={{ display: "grid", gap: 6 }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} style={{ background: index === 0 ? "#eef2f6" : "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, minHeight: 24 }} />
        ))}
      </div>
    );
  }

  if (section.blockType === "signature_box") {
    return (
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} style={{ border: "1px solid var(--border)", borderRadius: 6, minHeight: 64 }} />
        ))}
      </div>
    );
  }

  return <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, minHeight: 40 }} />;
}

function Chip({ children }: { children: string }) {
  return (
    <span
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 999,
        color: "var(--muted)",
        display: "inline-flex",
        fontSize: "0.75rem",
        fontWeight: 700,
        padding: "0.2rem 0.55rem"
      }}
    >
      {children}
    </span>
  );
}

export function ReportTemplatePreviewPanel({ layout }: ReportTemplatePreviewPanelProps) {
  const sections = layout.sections.filter((section) => section.blockType !== "header");

  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(220px, 0.45fr) minmax(320px, 1fr)" }}>
      <div style={{ display: "grid", gap: "0.75rem", alignContent: "start" }}>
        <div>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>Section Order</h2>
          <p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>This is the sequence used when a report is generated.</p>
        </div>
        {sections.map((section, index) => (
          <div key={section.sectionId} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 700 }}>
              {index + 1}. {blockLabel[section.blockType] ?? section.blockType}
            </div>
            <strong>{section.content.title ?? section.sectionId}</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: 8 }}>
              {optionSummary(section).map((option) => (
                <Chip key={option}>{option}</Chip>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1rem" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
            display: "grid",
            gap: "0.875rem",
            margin: "0 auto",
            maxWidth: 760,
            padding: "1rem"
          }}
        >
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 700 }}>A4 / {layout.page.orientation}</div>
            <h2 style={{ fontSize: "1.15rem", margin: "0.25rem 0 0" }}>{layout.name}</h2>
          </div>

          {sections.map((section, index) => (
            <section key={section.sectionId} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.875rem" }}>
              <div style={{ alignItems: "flex-start", display: "flex", gap: "0.75rem", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 700 }}>
                    {index + 1}. {blockLabel[section.blockType] ?? section.blockType}
                  </div>
                  <strong>{section.content.title ?? section.sectionId}</strong>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", justifyContent: "flex-end" }}>
                  {bindingSummary(section).map((binding) => (
                    <Chip key={binding}>{binding}</Chip>
                  ))}
                </div>
              </div>
              {section.content.description ? <p style={{ color: "var(--muted)", margin: "0.5rem 0" }}>{section.content.description}</p> : null}
              <div style={{ marginTop: "0.75rem" }}>
                <MiniBlock section={section} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
