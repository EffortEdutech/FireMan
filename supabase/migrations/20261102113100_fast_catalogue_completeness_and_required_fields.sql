-- Goal 22: complete the FAST fire-system catalogue and enforce the minimum
-- technical data needed to make registered assets useful in operations.
-- This migration is additive and idempotent. It does not make compliance
-- claims; the applicable design standard remains project-specific.

with seed(code, name, system_type, description) as (
  values
    ('FAP-STD', 'Fire alarm control panel', 'FIRE_ALARM', 'Fire alarm control and indicating panel.'),
    ('MCP-STD', 'Manual call point', 'FIRE_ALARM', 'Manual fire alarm call point.'),
    ('SND-STD', 'Fire alarm sounder', 'FIRE_ALARM', 'Audible fire alarm sounder.'),
    ('DET-CO', 'Carbon-monoxide detector', 'FIRE_ALARM', 'Carbon-monoxide detection device.'),
    ('SPR-STD', 'Sprinkler head', 'SPRINKLER', 'Automatic sprinkler discharge head.'),
    ('SPR-VLV', 'Sprinkler control valve set', 'SPRINKLER', 'Sprinkler alarm or control valve set.'),
    ('SPR-PREACT', 'Pre-action valve set', 'SPRINKLER', 'Pre-action sprinkler valve set.'),
    ('SPR-DELUGE', 'Deluge valve set', 'SPRINKLER', 'Deluge system valve set.'),
    ('HR-STD', 'Hose reel', 'HOSE_REEL', 'Fire hose reel assembly.'),
    ('HR-VALVE', 'Hose-reel isolation valve', 'HOSE_REEL', 'Isolation valve serving a hose reel.'),
    ('EML-STD', 'Emergency light', 'EMERGENCY_LIGHTING', 'Emergency lighting unit.'),
    ('EML-SELF', 'Self-contained emergency light', 'EMERGENCY_LIGHTING', 'Self-contained emergency lighting unit.'),
    ('EXIT-STD', 'Exit sign', 'EXIT_SIGNAGE', 'Illuminated emergency exit sign.'),
    ('EXIT-ARROW', 'Directional exit sign', 'EXIT_SIGNAGE', 'Directional illuminated exit sign.'),
    ('TANK-FIRE', 'Fire-water storage tank', 'FIRE_WATER_SUPPLY', 'Dedicated fire-protection water storage tank.'),
    ('WS-MAIN', 'Fire-water supply main', 'FIRE_WATER_SUPPLY', 'Fire-water supply main or incoming connection.'),
    ('WS-SUCT', 'Fire-pump suction assembly', 'FIRE_WATER_SUPPLY', 'Suction pipework and strainer assembly.'),
    ('DCH-CTRL', 'Dry-chemical release panel', 'DRY_CHEMICAL', 'Fixed dry-chemical suppression release panel.'),
    ('DCH-CYL', 'Dry-chemical agent cylinder', 'DRY_CHEMICAL', 'Dry-chemical suppression agent cylinder.'),
    ('DCH-NOZ', 'Dry-chemical discharge nozzle', 'DRY_CHEMICAL', 'Dry-chemical discharge nozzle.'),
    ('DCH-PIPE', 'Dry-chemical discharge pipework', 'DRY_CHEMICAL', 'Dry-chemical discharge pipework.'),
    ('DCH-REL', 'Dry-chemical manual release', 'DRY_CHEMICAL', 'Manual release station for dry-chemical system.'),
    ('DCH-WARN', 'Dry-chemical warning device', 'DRY_CHEMICAL', 'Pre-discharge warning beacon or sounder.'),
    ('FOAM-MON-SYS', 'Foam monitor system', 'FOAM_SUPPRESSION', 'Foam monitor system assembly.'),
    ('FOAM-MON-CTRL', 'Foam monitor control', 'FOAM_SUPPRESSION', 'Control equipment for a foam monitor.'),
    ('GAS-ROOM-DOOR', 'Clean-agent protected-room door', 'GASEOUS_SUPPRESSION', 'Protected-room door record for clean-agent systems.'),
    ('GAS-RELIEF', 'Clean-agent pressure-relief damper', 'GASEOUS_SUPPRESSION', 'Pressure-relief damper for a protected enclosure.'),
    ('KITCHEN-AGENT', 'Kitchen wet-chemical agent supply', 'KITCHEN_SUPPRESSION', 'Wet-chemical agent supply record.'),
    ('KITCHEN-NOZLE', 'Kitchen suppression nozzle assembly', 'KITCHEN_SUPPRESSION', 'Kitchen hood suppression nozzle assembly.'),
    ('PMP-FLOW', 'Fire-pump flow test connection', 'FIRE_PUMP', 'Flow test connection for a fire-pump set.'),
    ('PMP-ROOM', 'Fire-pump room asset', 'FIRE_PUMP', 'Fire-pump room or enclosure record.')
)
insert into public.equipment_types (organisation_id, code, name, system_type, description)
select null, s.code, s.name, s.system_type::public.system_type, s.description
from seed s
where not exists (
  select 1 from public.equipment_types et
  where et.organisation_id is null and et.code = s.code
);

with fields(system_type, field_key, label, field_type, unit, options, required, customer_visible, sort_order) as (
  values
    ('FIRE_ALARM', 'panel_configuration', 'Panel configuration', 'SELECT', null, '["conventional","addressable","wireless","other"]'::jsonb, false, true, 50),
    ('FIRE_ALARM', 'battery_capacity', 'Standby battery capacity', 'NUMBER', 'Ah', '[]'::jsonb, false, true, 60),
    ('FIRE_ALARM', 'cause_effect_reference', 'Cause-and-effect reference', 'TEXT', null, '[]'::jsonb, false, true, 70),
    ('SPRINKLER', 'system_configuration', 'System configuration', 'SELECT', null, '["wet","dry","pre_action","deluge","other"]'::jsonb, true, true, 60),
    ('SPRINKLER', 'hazard_classification', 'Hazard classification', 'TEXT', null, '[]'::jsonb, false, true, 70),
    ('SPRINKLER', 'design_area', 'Design area', 'NUMBER', 'm²', '[]'::jsonb, false, true, 80),
    ('HOSE_REEL', 'hose_length', 'Hose length', 'NUMBER', 'm', '[]'::jsonb, true, true, 10),
    ('HOSE_REEL', 'operating_pressure', 'Operating pressure', 'NUMBER', 'bar', '[]'::jsonb, false, true, 20),
    ('HOSE_REEL', 'flow_rating', 'Flow rating', 'NUMBER', 'L/min', '[]'::jsonb, false, true, 30),
    ('FIRE_WATER_SUPPLY', 'water_source', 'Water source', 'SELECT', null, '["tank","mains","break_tank","other"]'::jsonb, true, true, 10),
    ('FIRE_WATER_SUPPLY', 'tank_capacity', 'Storage capacity', 'NUMBER', 'L', '[]'::jsonb, false, true, 20),
    ('FIRE_WATER_SUPPLY', 'static_pressure', 'Static pressure', 'NUMBER', 'bar', '[]'::jsonb, false, true, 30),
    ('FIRE_PUMP', 'rated_flow', 'Rated flow', 'NUMBER', 'L/min', '[]'::jsonb, true, true, 50),
    ('FIRE_PUMP', 'rated_pressure', 'Rated pressure', 'NUMBER', 'bar', '[]'::jsonb, true, true, 60),
    ('FIRE_PUMP', 'driver_power', 'Driver power', 'NUMBER', 'kW', '[]'::jsonb, false, true, 70),
    ('FIRE_PUMP', 'controller_type', 'Controller type', 'SELECT', null, '["electric","diesel","combined","other"]'::jsonb, false, true, 80),
    ('GASEOUS_SUPPRESSION', 'agent_quantity', 'Agent quantity', 'NUMBER', 'kg', '[]'::jsonb, true, true, 60),
    ('GASEOUS_SUPPRESSION', 'cylinder_count', 'Cylinder count', 'NUMBER', null, '[]'::jsonb, false, true, 70),
    ('GASEOUS_SUPPRESSION', 'room_integrity_test_date', 'Room integrity test date', 'DATE', null, '[]'::jsonb, false, true, 80),
    ('CO2_SUPPRESSION', 'agent_quantity', 'Agent quantity', 'NUMBER', 'kg', '[]'::jsonb, true, true, 60),
    ('CO2_SUPPRESSION', 'cylinder_count', 'Cylinder count', 'NUMBER', null, '[]'::jsonb, false, true, 70),
    ('FOAM_SUPPRESSION', 'design_flow', 'Design flow', 'NUMBER', 'L/min', '[]'::jsonb, true, true, 60),
    ('FOAM_SUPPRESSION', 'monitor_count', 'Monitor count', 'NUMBER', null, '[]'::jsonb, false, true, 70),
    ('KITCHEN_SUPPRESSION', 'agent_quantity', 'Agent quantity', 'NUMBER', 'L', '[]'::jsonb, true, true, 60),
    ('KITCHEN_SUPPRESSION', 'cylinder_capacity', 'Cylinder capacity', 'NUMBER', 'L', '[]'::jsonb, false, true, 70),
    ('KITCHEN_SUPPRESSION', 'last_service_date', 'Last service date', 'DATE', null, '[]'::jsonb, false, true, 80),
    ('DRY_CHEMICAL', 'agent_or_medium', 'Agent / medium', 'TEXT', null, '[]'::jsonb, true, true, 10),
    ('DRY_CHEMICAL', 'agent_quantity', 'Agent quantity', 'NUMBER', 'kg', '[]'::jsonb, true, true, 20),
    ('DRY_CHEMICAL', 'protected_appliances', 'Protected appliances', 'TEXT', null, '[]'::jsonb, false, true, 30),
    ('EMERGENCY_LIGHTING', 'battery_duration', 'Battery duration', 'NUMBER', 'minutes', '[]'::jsonb, true, true, 40),
    ('EMERGENCY_LIGHTING', 'lighting_mode', 'Lighting mode', 'SELECT', null, '["maintained","non_maintained","combined"]'::jsonb, false, true, 50),
    ('EXIT_SIGNAGE', 'battery_duration', 'Battery duration', 'NUMBER', 'minutes', '[]'::jsonb, true, true, 40),
    ('EXIT_SIGNAGE', 'sign_type', 'Sign type', 'SELECT', null, '["standard","directional","custom"]'::jsonb, false, true, 50),
    ('PASSIVE_PROTECTION', 'fire_rating', 'Fire rating', 'TEXT', null, '[]'::jsonb, true, true, 40),
    ('SMOKE_CONTROL', 'cause_effect_reference', 'Cause-and-effect reference', 'TEXT', null, '[]'::jsonb, false, true, 40),
    ('SPECIAL_HAZARD', 'hazard_description', 'Protected hazard description', 'TEXT', null, '[]'::jsonb, true, true, 50)
)
insert into public.equipment_type_fields (
  organisation_id, equipment_type_id, field_key, label, field_type, unit,
  options, required, customer_visible, sort_order
)
select null, et.id, f.field_key, f.label, f.field_type::public.template_field_type,
       f.unit, f.options, f.required, f.customer_visible, f.sort_order
from fields f
join public.equipment_types et
  on et.organisation_id is null
 and et.system_type = f.system_type::public.system_type
where not exists (
  select 1 from public.equipment_type_fields existing
  where existing.equipment_type_id = et.id and existing.field_key = f.field_key
);

update public.equipment_type_fields etf
set required = true
from public.equipment_types et
where et.id = etf.equipment_type_id
  and et.organisation_id is null
  and (
    (et.system_type = 'FIRE_ALARM' and etf.field_key in ('panel_configuration'))
    or (et.system_type = 'SPRINKLER' and etf.field_key in ('system_configuration'))
    or (et.system_type = 'FIRE_PUMP' and etf.field_key in ('pump_type','rated_flow','rated_pressure'))
    or (et.system_type = 'GASEOUS_SUPPRESSION' and etf.field_key in ('agent_or_medium','agent_quantity','protected_volume'))
    or (et.system_type = 'CO2_SUPPRESSION' and etf.field_key in ('agent_or_medium','agent_quantity','protected_volume'))
    or (et.system_type = 'FOAM_SUPPRESSION' and etf.field_key in ('agent_or_medium','design_flow'))
    or (et.system_type = 'KITCHEN_SUPPRESSION' and etf.field_key in ('agent_or_medium','agent_quantity'))
    or (et.system_type = 'DRY_CHEMICAL' and etf.field_key in ('agent_or_medium','agent_quantity'))
    or (et.system_type in ('EMERGENCY_LIGHTING','EXIT_SIGNAGE') and etf.field_key in ('battery_duration'))
    or (et.system_type = 'PASSIVE_PROTECTION' and etf.field_key in ('fire_rating'))
    or (et.system_type = 'SPECIAL_HAZARD' and etf.field_key in ('hazard_description'))
  );

