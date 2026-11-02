-- Goal 16 follow-up: cover direct foreign keys identified by the advisor.

create index if not exists idx_equipment_org_system
  on public.equipment (organisation_id, system_id);

create index if not exists idx_protected_hazards_building
  on public.protected_hazards (building_id);

create index if not exists idx_protected_hazards_system_id
  on public.protected_hazards (system_id);
