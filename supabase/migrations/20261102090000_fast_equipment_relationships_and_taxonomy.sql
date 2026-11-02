-- Goal 16: FAST equipment data-model enhancement and controlled migration
--
-- This migration is additive. It preserves existing equipment, systems,
-- equipment types, field definitions, documents, and RLS boundaries while
-- adding the approved taxonomy values and relationship model needed for
-- system/component/hazard tracking.

-- Approved Goal 15 system families that are not yet present in the live enum.
alter type public.system_type add value if not exists 'WATER_SPRAY_MIST';
alter type public.system_type add value if not exists 'CO2_SUPPRESSION';
alter type public.system_type add value if not exists 'KITCHEN_SUPPRESSION';
alter type public.system_type add value if not exists 'EMERGENCY_LIFE_SAFETY';
alter type public.system_type add value if not exists 'SPECIAL_HAZARD';

-- A system may contain subordinate systems while remaining within one
-- organisation boundary (for example, a releasing system under a clean-agent
-- system). Existing systems remain root systems because this is nullable.
alter table public.systems
  add column if not exists parent_system_id uuid;

alter table public.systems
  add constraint systems_parent_same_organisation_fkey
  foreign key (organisation_id, parent_system_id)
  references public.systems (organisation_id, id)
  on delete set null;

create index if not exists idx_systems_parent
  on public.systems (organisation_id, parent_system_id);

-- A protected hazard describes the area, process, room, or risk being served
-- by a system. It is deliberately separate from component equipment so a
-- system can serve one or more documented hazards without duplicating assets.
create table if not exists public.protected_hazards (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete restrict,
  system_id uuid not null references public.systems(id) on delete cascade,
  code text,
  name text not null,
  hazard_type text,
  protected_area text,
  design_basis text,
  notes text,
  customer_visible boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, building_id, code)
);

alter table public.protected_hazards
  add constraint protected_hazards_building_same_organisation_fkey
  foreign key (organisation_id, building_id)
  references public.buildings (organisation_id, id)
  on delete restrict;

alter table public.protected_hazards
  add constraint protected_hazards_system_same_organisation_fkey
  foreign key (organisation_id, system_id)
  references public.systems (organisation_id, id)
  on delete cascade;

create index if not exists idx_protected_hazards_org_building
  on public.protected_hazards (organisation_id, building_id);

create index if not exists idx_protected_hazards_system
  on public.protected_hazards (organisation_id, system_id);

create index if not exists idx_protected_hazards_active
  on public.protected_hazards (organisation_id, active);

-- Component assets can be nested under another asset (for example a nozzle,
-- cylinder, or controller under a suppression system asset). Nullable columns
-- preserve all existing equipment records.
alter table public.equipment
  add column if not exists parent_equipment_id uuid,
  add column if not exists protected_hazard_id uuid;

alter table public.equipment
  add constraint equipment_organisation_id_id_key unique (organisation_id, id);

alter table public.equipment
  add constraint equipment_parent_same_organisation_fkey
  foreign key (organisation_id, parent_equipment_id)
  references public.equipment (organisation_id, id)
  on delete set null;

alter table public.equipment
  add constraint equipment_hazard_same_organisation_fkey
  foreign key (organisation_id, protected_hazard_id)
  references public.protected_hazards (organisation_id, id)
  on delete set null;

create index if not exists idx_equipment_parent
  on public.equipment (organisation_id, parent_equipment_id);

create index if not exists idx_equipment_protected_hazard
  on public.equipment (organisation_id, protected_hazard_id);

-- Close the FK index gaps identified by the Supabase performance advisor for
-- the equipment data model. These are additive and safe for existing rows.
create index if not exists idx_equipment_building
  on public.equipment (building_id);

create index if not exists idx_equipment_system
  on public.equipment (system_id);

create index if not exists idx_equipment_documents_organisation
  on public.equipment_documents (organisation_id);

create index if not exists idx_equipment_documents_uploaded_by
  on public.equipment_documents (uploaded_by);

create index if not exists idx_equipment_type_fields_organisation
  on public.equipment_type_fields (organisation_id);

-- New table access: internal staff manage hazards within their organisation;
-- clients can read only explicitly customer-visible hazards attached to their
-- own client's buildings. No anonymous access is granted.
alter table public.protected_hazards enable row level security;

grant select, insert, update, delete on table public.protected_hazards to authenticated;

create policy protected_hazards_internal
  on public.protected_hazards
  for all
  to authenticated
  using (
    organisation_id = private.get_current_organisation_id()
    and private.is_internal_user()
  )
  with check (
    organisation_id = private.get_current_organisation_id()
    and private.is_internal_user()
  );

create policy protected_hazards_client_select
  on public.protected_hazards
  for select
  to authenticated
  using (
    customer_visible = true
    and organisation_id = private.get_current_organisation_id()
    and exists (
      select 1
      from public.buildings b
      join public.sites s
        on s.id = b.site_id
       and s.organisation_id = b.organisation_id
      where b.id = protected_hazards.building_id
        and b.organisation_id = protected_hazards.organisation_id
        and s.client_id = (
          select p.client_id
          from public.profiles p
          where p.id = auth.uid()
        )
    )
  );

create trigger protected_hazards_set_updated_at
  before update on public.protected_hazards
  for each row execute function public.touch_updated_at();
