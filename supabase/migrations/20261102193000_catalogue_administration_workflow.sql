-- Goal 25: global catalogue administration, approvals, and audit history.
-- Catalogue rows are product-owned global records (organisation_id is NULL).

alter table public.equipment_types
  alter column approval_status set default 'DRAFT';

alter table public.equipment_types
  add constraint equipment_types_supersedes_id_fkey
  foreign key (supersedes_id) references public.equipment_types(id);

create table if not exists public.catalogue_audit_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id),
  actor_id uuid not null references public.profiles(id),
  entity_type text not null check (entity_type in ('EQUIPMENT_TYPE','EQUIPMENT_TYPE_FIELD','INSPECTION_TEMPLATE','INSPECTION_TEMPLATE_ITEM')),
  entity_id uuid not null,
  action text not null,
  from_status text,
  to_status text,
  catalogue_version integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists catalogue_audit_events_entity_idx
  on public.catalogue_audit_events(entity_id, created_at desc);
create index if not exists catalogue_audit_events_created_idx
  on public.catalogue_audit_events(created_at desc);

alter table public.catalogue_audit_events enable row level security;

drop policy if exists catalogue_audit_events_internal_select on public.catalogue_audit_events;
create policy catalogue_audit_events_internal_select
on public.catalogue_audit_events for select
to authenticated
using (private.is_internal_user());

drop policy if exists catalogue_audit_events_internal_insert on public.catalogue_audit_events;
create policy catalogue_audit_events_internal_insert
on public.catalogue_audit_events for insert
to authenticated
with check (private.is_internal_user() and actor_id = (select auth.uid()));

create or replace function private.enforce_catalogue_status_transition()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if tg_table_name = 'equipment_types' then
    if tg_op = 'DELETE' then
      if old.approval_status in ('APPROVED','RETIRED') then
        raise exception 'Approved or retired catalogue versions cannot be deleted';
      end if;
      return old;
    end if;

    if old.approval_status = 'RETIRED' then
      raise exception 'Retired catalogue versions are immutable';
    end if;

    if old.approval_status = 'APPROVED' then
      if new.approval_status <> 'RETIRED'
         or new.active is distinct from false
         or new.name is distinct from old.name
         or new.code is distinct from old.code
         or new.system_type is distinct from old.system_type
         or new.description is distinct from old.description
         or new.catalogue_version is distinct from old.catalogue_version
         or new.organisation_id is distinct from old.organisation_id
         or new.reference_standards is distinct from old.reference_standards
         or new.supersedes_id is distinct from old.supersedes_id then
        raise exception 'Approved catalogue versions cannot be edited; create a new version instead';
      end if;
    end if;

    if old.approval_status = 'DRAFT' and new.approval_status not in ('DRAFT','IN_REVIEW') then
      raise exception 'Draft catalogue versions must enter review before approval';
    end if;
    if old.approval_status = 'IN_REVIEW' and new.approval_status not in ('DRAFT','IN_REVIEW','APPROVED') then
      raise exception 'Catalogue versions in review can return to draft or be approved';
    end if;
    if new.approval_status = 'APPROVED' then
      new.active := true;
      new.approved_at := coalesce(new.approved_at, now());
    elsif new.approval_status <> 'APPROVED' then
      new.approved_at := null;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if exists (
      select 1
      from public.equipment_types et
      where et.id = case when tg_table_name = 'equipment_type_fields' then old.equipment_type_id
                         when tg_table_name = 'inspection_templates' then old.equipment_type_id
                         when tg_table_name = 'inspection_template_items' then old.template_id
                    end
        and et.approval_status in ('APPROVED','RETIRED')
    ) then
      raise exception 'Approved or retired catalogue version content cannot be deleted';
    end if;
    return old;
  end if;

  if exists (
    select 1
    from public.equipment_types et
    where et.id = case when tg_table_name = 'equipment_type_fields' then new.equipment_type_id
                       when tg_table_name = 'inspection_templates' then new.equipment_type_id
                       when tg_table_name = 'inspection_template_items' then new.template_id
                  end
      and et.approval_status in ('APPROVED','RETIRED')
  ) then
    raise exception 'Approved or retired catalogue version content cannot be edited';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_catalogue_status_transition() from public, anon, authenticated;

drop trigger if exists equipment_types_catalogue_immutability on public.equipment_types;
create trigger equipment_types_catalogue_immutability
before update or delete on public.equipment_types
for each row execute function private.enforce_catalogue_status_transition();

drop trigger if exists equipment_type_fields_catalogue_immutability on public.equipment_type_fields;
create trigger equipment_type_fields_catalogue_immutability
before update or delete on public.equipment_type_fields
for each row execute function private.enforce_catalogue_status_transition();

drop trigger if exists inspection_templates_catalogue_immutability on public.inspection_templates;
create trigger inspection_templates_catalogue_immutability
before update or delete on public.inspection_templates
for each row execute function private.enforce_catalogue_status_transition();

drop trigger if exists inspection_template_items_catalogue_immutability on public.inspection_template_items;
create trigger inspection_template_items_catalogue_immutability
before update or delete on public.inspection_template_items
for each row execute function private.enforce_catalogue_status_transition();

