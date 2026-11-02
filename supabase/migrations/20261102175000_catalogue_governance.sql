-- Goal 24: global catalogue governance and version metadata.

alter type public.system_type add value if not exists 'ASPIRATING_SMOKE';
alter type public.system_type add value if not exists 'GAS_DETECTION';
alter type public.system_type add value if not exists 'FIRE_EVACUATION';
alter type public.system_type add value if not exists 'FIRE_BRIGADE_COMMS';

alter table public.equipment_types add column if not exists catalogue_version integer not null default 1;
alter table public.equipment_types add column if not exists approval_status text not null default 'APPROVED';
alter table public.equipment_types add column if not exists reference_standards jsonb not null default '[]'::jsonb;
alter table public.equipment_types add column if not exists supersedes_id uuid;
alter table public.equipment_types add column if not exists approved_at timestamptz;
alter table public.equipment_types add constraint equipment_types_approval_status_check check (approval_status in ('DRAFT','IN_REVIEW','APPROVED','RETIRED'));
alter table public.equipment_types drop constraint if exists equipment_types_organisation_id_code_key;
alter table public.equipment_types add constraint equipment_types_organisation_code_version_key unique (organisation_id,code,catalogue_version);

update public.equipment_types
set approval_status='APPROVED',
    approved_at=coalesce(approved_at,now()),
    reference_standards=case system_type
      when 'FIRE_ALARM' then '["NFPA 72"]'::jsonb
      when 'SPRINKLER' then '["NFPA 13","NFPA 25"]'::jsonb
      when 'FIRE_PUMP' then '["NFPA 20","NFPA 25"]'::jsonb
      when 'GASEOUS_SUPPRESSION' then '["NFPA 2001"]'::jsonb
      when 'CO2_SUPPRESSION' then '["NFPA 12"]'::jsonb
      when 'FOAM_SUPPRESSION' then '["NFPA 11"]'::jsonb
      when 'SMOKE_CONTROL' then '["NFPA 92"]'::jsonb
      when 'PASSIVE_PROTECTION' then '["NFPA 80","NFPA 101"]'::jsonb
      when 'EMERGENCY_LIFE_SAFETY' then '["NFPA 72","NFPA 101"]'::jsonb
      else reference_standards
    end
where organisation_id is null;

