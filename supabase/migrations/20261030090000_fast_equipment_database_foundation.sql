-- FAST Goal 9A: equipment database foundation.
-- The Supabase CLI could not create the local file because its telemetry writer
-- is blocked in the managed Windows environment; the same migration is applied
-- to the connected FAST project through Supabase MCP.

create table public.equipment_type_fields (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete cascade,
  equipment_type_id uuid not null references public.equipment_types(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type public.template_field_type not null default 'TEXT',
  unit text,
  options jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  customer_visible boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (equipment_type_id, field_key),
  check (jsonb_typeof(options) = 'array'),
  check (sort_order >= 0)
);

create table public.equipment_documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  title text not null,
  document_type text not null,
  storage_path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  customer_visible boolean not null default false,
  expires_at date,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(title)) > 0),
  check (length(trim(document_type)) > 0),
  check (length(trim(storage_path)) > 0),
  check (size_bytes is null or size_bytes >= 0)
);

alter table public.equipment
  add column if not exists technical_data jsonb not null default '{}'::jsonb;
alter table public.equipment
  add constraint equipment_technical_data_object check (jsonb_typeof(technical_data) = 'object');

alter table public.buildings
  add constraint buildings_organisation_id_id_key unique (organisation_id, id);
alter table public.systems
  add constraint systems_organisation_id_id_key unique (organisation_id, id);

alter table public.equipment
  add constraint equipment_building_same_organisation_fkey
  foreign key (organisation_id, building_id)
  references public.buildings (organisation_id, id)
  not valid;
alter table public.equipment validate constraint equipment_building_same_organisation_fkey;

alter table public.equipment
  add constraint equipment_system_same_organisation_fkey
  foreign key (organisation_id, system_id)
  references public.systems (organisation_id, id)
  not valid;
alter table public.equipment validate constraint equipment_system_same_organisation_fkey;

create index equipment_asset_code_search_idx on public.equipment (lower(asset_code));
create index equipment_serial_number_search_idx on public.equipment (lower(serial_number)) where serial_number is not null;
create index equipment_type_fields_type_sort_idx on public.equipment_type_fields (equipment_type_id, sort_order);
create index equipment_documents_equipment_idx on public.equipment_documents (equipment_id, created_at desc);

create or replace function public.validate_equipment_technical_data()
returns trigger language plpgsql security invoker set search_path = public
as $$
declare
  required_field record;
  value jsonb;
begin
  for required_field in
    select field_key from public.equipment_type_fields
    where equipment_type_id = new.equipment_type_id and active = true and required = true
  loop
    value := new.technical_data -> required_field.field_key;
    if value is null or value = 'null'::jsonb or
       (jsonb_typeof(value) = 'string' and length(trim(value #>> '{}')) = 0) then
      raise exception 'Required equipment field missing: %', required_field.field_key using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_equipment_validate_technical_data on public.equipment;
create trigger trg_equipment_validate_technical_data
before insert or update of equipment_type_id, technical_data on public.equipment
for each row execute function public.validate_equipment_technical_data();

drop trigger if exists trg_equipment_type_fields_updated_at on public.equipment_type_fields;
create trigger trg_equipment_type_fields_updated_at
before update on public.equipment_type_fields
for each row execute function public.touch_updated_at();
drop trigger if exists trg_equipment_documents_updated_at on public.equipment_documents;
create trigger trg_equipment_documents_updated_at
before update on public.equipment_documents
for each row execute function public.touch_updated_at();

alter table public.equipment_type_fields enable row level security;
alter table public.equipment_documents enable row level security;

create policy equipment_type_fields_internal on public.equipment_type_fields for all
using (
  (organisation_id is null or organisation_id = (select private.get_current_organisation_id()))
  and (select private.is_internal_user())
)
with check (
  (organisation_id is null or organisation_id = (select private.get_current_organisation_id()))
  and exists (
    select 1 from public.equipment_types et
    where et.id = equipment_type_id
      and (et.organisation_id is null or et.organisation_id = (select private.get_current_organisation_id()))
  )
);

create policy equipment_documents_internal on public.equipment_documents for all
using (
  organisation_id = (select private.get_current_organisation_id())
  and (select private.is_internal_user())
)
with check (
  organisation_id = (select private.get_current_organisation_id())
  and (select private.is_internal_user())
  and exists (
    select 1 from public.equipment e
    where e.id = equipment_id and e.organisation_id = (select private.get_current_organisation_id())
  )
);

insert into public.equipment_type_fields
  (organisation_id, equipment_type_id, field_key, label, field_type, unit, required, customer_visible, sort_order)
select null, et.id, f.field_key, f.label, f.field_type::public.template_field_type,
       f.unit, false, true, f.sort_order
from public.equipment_types et
cross join (
  values
    ('agent_or_medium','Agent / medium','TEXT',null,10),
    ('pressure_rating','Pressure rating','NUMBER','bar',20),
    ('flow_rating','Flow rating','NUMBER','L/min',30),
    ('power_rating','Power rating','NUMBER','kW',40),
    ('battery_duration','Battery duration','NUMBER','minutes',50),
    ('zone_reference','Zone reference','TEXT',null,60),
    ('device_address','Device address','TEXT',null,70),
    ('hose_length','Hose length','NUMBER','m',80),
    ('nozzle_size','Nozzle / outlet size','NUMBER','mm',90),
    ('temperature_rating','Temperature rating','NUMBER','°C',100),
    ('k_factor','K-factor','NUMBER',null,110)
) as f(field_key,label,field_type,unit,sort_order)
where et.organisation_id is null
  and (
    (et.system_type = 'FIRE_EXTINGUISHING' and f.field_key in ('agent_or_medium','pressure_rating','flow_rating'))
    or (et.system_type = 'FIRE_ALARM' and f.field_key in ('zone_reference','device_address'))
    or (et.system_type = 'HOSE_REEL' and f.field_key in ('hose_length','pressure_rating','flow_rating'))
    or (et.system_type = 'HYDRANT_RISER' and f.field_key in ('nozzle_size','pressure_rating','flow_rating'))
    or (et.system_type = 'FIRE_PUMP' and f.field_key in ('pressure_rating','flow_rating','power_rating'))
    or (et.system_type = 'SPRINKLER' and f.field_key in ('k_factor','temperature_rating','pressure_rating'))
    or (et.system_type in ('EMERGENCY_LIGHTING','EXIT_SIGNAGE') and f.field_key in ('battery_duration'))
  )
on conflict (equipment_type_id, field_key) do nothing;
