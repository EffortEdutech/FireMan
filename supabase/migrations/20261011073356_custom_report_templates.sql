create table public.report_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  report_type public.report_type not null default 'MAINTENANCE',
  layout jsonb not null,
  active boolean not null default true,
  is_default boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, slug)
);

alter table public.reports
add column template_id uuid references public.report_templates(id) on delete set null;

alter table public.report_templates enable row level security;

create policy report_templates_internal
on public.report_templates
for all
using (organisation_id = private.get_current_organisation_id() and private.is_internal_user())
with check (organisation_id = private.get_current_organisation_id() and private.is_internal_user());

create policy client_issued_report_templates_select
on public.report_templates
for select
using (
  organisation_id = private.get_current_organisation_id()
  and private.get_current_role() = 'CLIENT'
  and exists (
    select 1
    from public.reports r
    join public.maintenance_jobs j on j.id = r.job_id
    where r.template_id = report_templates.id
      and r.status = 'ISSUED'
      and j.client_id = (
        select p.client_id
        from public.profiles p
        where p.id = (select auth.uid())
      )
  )
);

insert into public.report_templates (
  organisation_id,
  name,
  slug,
  description,
  report_type,
  layout,
  active,
  is_default
)
select
  o.id,
  'Standard Maintenance Report',
  'standard-maintenance-report',
  'Default formal maintenance report with summary, assets, field evidence, checklist results, and sign-off.',
  'MAINTENANCE',
  '{
    "layoutId": "standard-maintenance-report",
    "name": "Standard Maintenance Report",
    "version": "1.0.0",
    "locked": true,
    "page": {
      "size": "A4",
      "orientation": "portrait",
      "margins": {
        "top": 20,
        "right": 16,
        "bottom": 20,
        "left": 16
      }
    },
    "sections": [
      {
        "sectionId": "report_header",
        "blockType": "header",
        "content": {
          "title": "Maintenance Report",
          "subtitle": "Fire safety service evidence"
        },
        "binding": {
          "source": "report",
          "fields": ["reportNumber", "title", "status", "issuedAt"]
        }
      },
      {
        "sectionId": "report_summary",
        "blockType": "summary_grid",
        "content": {
          "title": "Report Summary"
        },
        "binding": {
          "source": "summary",
          "fields": ["clientName", "siteName", "jobNumber", "scheduledDate", "generatedAt", "issuedAt"]
        },
        "options": {
          "columns": 3
        }
      },
      {
        "sectionId": "asset_register",
        "blockType": "asset_table",
        "content": {
          "title": "Serviced Assets"
        },
        "binding": {
          "source": "assets",
          "fields": ["assetCode", "equipmentType", "systemName", "location", "inspectionStatus"]
        }
      },
      {
        "sectionId": "field_evidence",
        "blockType": "field_evidence",
        "content": {
          "title": "Field Evidence"
        },
        "binding": {
          "source": "findings",
          "fields": ["title", "severity", "status", "description", "recommendation", "createdAt"]
        }
      },
      {
        "sectionId": "checklist_results",
        "blockType": "checklist_evidence",
        "content": {
          "title": "Checklist Results"
        },
        "binding": {
          "source": "checklistGroups",
          "fields": ["assetCode", "checklistName", "status", "items"]
        }
      },
      {
        "sectionId": "sign_off",
        "blockType": "signature_box",
        "content": {
          "title": "Sign-off",
          "description": "Prepared for client record and audit filing."
        },
        "binding": {},
        "options": {
          "layout": "two_column"
        }
      }
    ]
  }'::jsonb,
  true,
  true
from public.organisations o
on conflict (organisation_id, slug) do nothing;

update public.reports r
set template_id = t.id
from public.report_templates t
where t.organisation_id = r.organisation_id
  and t.slug = 'standard-maintenance-report'
  and r.template_id is null;

create index if not exists idx_report_templates_org_active
on public.report_templates(organisation_id, active, report_type);

create index if not exists idx_reports_template
on public.reports(template_id);
