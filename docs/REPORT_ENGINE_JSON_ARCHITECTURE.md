# FireMaint JSON Report Generation Engine

## Bismillah

This document captures the report-engine direction and the first implemented vertical path.

## Reference Learned From WorkLedger

The WorkLedger report setup separates report generation into three layers:

1. Template/data schema: defines what data is collected.
2. Layout JSON: defines how collected data is presented.
3. Render engine: maps data into layout blocks, then renders HTML/PDF.

The key idea to bring into FireMaint is not to hardcode one PDF page. FireMaint should produce a canonical report data object, then render it through a JSON layout definition.

## FireMaint Direction

FireMaint report output will be JSON-layout driven:

1. Standard report format
   - A default locked layout in source control.
   - Used for normal maintenance reports.
   - Includes report summary, client/site/job details, assets, findings, checklist results, and sign-off placeholders.

2. Custom report format
   - Future organisation/client/site-specific layout records.
   - Can hide, reorder, rename, or configure sections without changing core report data.
   - Must remain RLS-scoped to the organisation/client access model.

## Implemented Vertical Path

The first standard report engine path is implemented:

1. `IssuedReportData` is assembled by `lib/reports/issued-report-data.ts`.
2. `standardMaintenanceReportLayout` defines the standard report sections in source-controlled JSON-compatible TypeScript.
3. `ReportLayoutRenderer` renders the in-app report detail body from the layout.
4. `renderReportHtml` generates the browser-readable downloaded HTML artifact.
5. `renderReportPdf` generates the formal PDF artifact.
6. `/api/reports/[reportId]/download` serves both PDF and HTML through the same data contract.
7. Report detail pages and report queues expose PDF/HTML output links.

## Engine Concepts

### Canonical Report Data

The report data assembler should produce one stable object from the current database:

- `report`
- `client`
- `site`
- `job`
- `summary`
- `assets`
- `findings`
- `checklistGroups`

This data object is the contract between Supabase queries and report rendering.

### Layout Definition

The JSON layout controls presentation:

- page size and orientation
- section order
- section titles
- block type
- source binding
- visible fields
- simple display options

### Block Types

Initial FireMaint block types:

- `header`
- `summary_grid`
- `asset_table`
- `field_evidence`
- `checklist_evidence`
- `signature_box`
- `static_text`

Later block types can include `photo_grid`, `qr_box`, `approval_history`, and `defect_register`.

## MVP Storage Decision

Start without a database migration.

For the first engine slice, keep the standard maintenance report layout in source code under `lib/reports`. This lets us build and verify the engine safely before adding persistent custom layouts.

When customization is ready, add RLS-protected tables similar to:

- `report_layouts`
  - organisation scoped
  - optional client/site scope
  - `layout_schema jsonb`
  - status/version fields

- `report_templates`
  - optional future layer if FireMaint needs configurable capture/report schemas beyond inspection templates

## Updated Sprint Objective

Build the report generation engine first, then generate downloadable output from it.

The sprint is no longer simply "make a PDF". The locked path is:

1. Define JSON report layout contract.
2. Define standard maintenance report layout.
3. Build issued-report data assembler.
4. Render the standard layout as printable HTML.
5. Add PDF/download output from the same render path.
6. Add layout customization only after the standard engine is stable.

## Acceptance Criteria For The Engine Slice

1. Standard maintenance report layout exists as typed JSON.
2. Report data bindings cover the issued report detail data already visible in the UI.
3. The same engine can serve management and client report detail/download pages.
4. Client access remains RLS-scoped.
5. PDF generation and the download route have unit smoke coverage.
6. Existing checks pass:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `git diff --check`
   - `npm run build`

## Future Custom Layout Path

Custom report formats are intentionally not part of the first implementation. When this becomes the active sprint, add RLS-protected persistence for layout definitions and keep the existing source-controlled standard layout as the fallback/default.
