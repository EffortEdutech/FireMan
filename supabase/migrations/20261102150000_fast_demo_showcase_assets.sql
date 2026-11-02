-- Goal 23: presentation-only demo dataset.
-- These records are synthetic and must not be presented as FAST customer data.
-- They are intentionally named as a demonstration client so the dataset can
-- be reused for another prospect without implying customer approval.

do $$
declare
  v_org uuid;
  v_client uuid;
  v_site uuid;
  v_tower uuid;
  v_plant uuid;
  v_kitchen uuid;
  v_fas uuid;
  v_spr uuid;
  v_pump uuid;
  v_gas uuid;
  v_foam uuid;
  v_kitchen_system uuid;
  v_life_safety uuid;
  v_dry_chemical uuid;
  v_plan uuid;
  v_job uuid;
begin
  select id into v_org from public.organisations where name = 'FAST' limit 1;
  if v_org is null then raise exception 'FAST organisation was not found'; end if;

  select id into v_client from public.clients where organisation_id = v_org and name = 'FAST Demonstration Client' limit 1;
  if v_client is null then
    insert into public.clients (organisation_id, name, registration_no, industry, phone, address)
    values (v_org, 'FAST Demonstration Client', 'DEMO-FAST-001', 'Commercial property showcase', '+60 3 0000 0000', 'Synthetic presentation data only')
    returning id into v_client;
  end if;

  select id into v_site from public.sites where organisation_id = v_org and site_code = 'FAST-DEMO-SITE' limit 1;
  if v_site is null then
    insert into public.sites (organisation_id, client_id, name, site_code, address, city, state, postcode, country)
    values (v_org, v_client, 'FAST Demo Campus', 'FAST-DEMO-SITE', 'Synthetic presentation address', 'Kuala Lumpur', 'Wilayah Persekutuan', '50000', 'Malaysia')
    returning id into v_site;
  end if;

  select id into v_tower from public.buildings where organisation_id = v_org and site_id = v_site and code = 'TOWER-A' limit 1;
  if v_tower is null then
    insert into public.buildings (organisation_id, site_id, name, code, floors, description)
    values (v_org, v_site, 'Showcase Tower A', 'TOWER-A', 12, 'Synthetic multi-storey commercial building for product presentation')
    returning id into v_tower;
  end if;
  select id into v_plant from public.buildings where organisation_id = v_org and site_id = v_site and code = 'PLANT-ROOM' limit 1;
  if v_plant is null then
    insert into public.buildings (organisation_id, site_id, name, code, floors, description)
    values (v_org, v_site, 'Central Plant Room', 'PLANT-ROOM', 1, 'Synthetic fire pump and suppression plant room')
    returning id into v_plant;
  end if;
  select id into v_kitchen from public.buildings where organisation_id = v_org and site_id = v_site and code = 'KITCHEN' limit 1;
  if v_kitchen is null then
    insert into public.buildings (organisation_id, site_id, name, code, floors, description)
    values (v_org, v_site, 'Commercial Kitchen', 'KITCHEN', 1, 'Synthetic kitchen hood and dry-chemical demonstration area')
    returning id into v_kitchen;
  end if;

  select id into v_fas from public.systems where organisation_id = v_org and code = 'DEMO-FAS-01' limit 1;
  if v_fas is null then insert into public.systems (organisation_id, building_id, name, system_type, code, description) values (v_org, v_tower, 'Addressable fire alarm system', 'FIRE_ALARM', 'DEMO-FAS-01', 'Synthetic demo system') returning id into v_fas; end if;
  select id into v_spr from public.systems where organisation_id = v_org and code = 'DEMO-SPR-01' limit 1;
  if v_spr is null then insert into public.systems (organisation_id, building_id, name, system_type, code, description) values (v_org, v_tower, 'Wet sprinkler system', 'SPRINKLER', 'DEMO-SPR-01', 'Synthetic demo system') returning id into v_spr; end if;
  select id into v_pump from public.systems where organisation_id = v_org and code = 'DEMO-PMP-01' limit 1;
  if v_pump is null then insert into public.systems (organisation_id, building_id, name, system_type, code, description) values (v_org, v_plant, 'Fire pump and water supply', 'FIRE_PUMP', 'DEMO-PMP-01', 'Synthetic demo system') returning id into v_pump; end if;
  select id into v_gas from public.systems where organisation_id = v_org and code = 'DEMO-GAS-01' limit 1;
  if v_gas is null then insert into public.systems (organisation_id, building_id, name, system_type, code, description) values (v_org, v_plant, 'Clean-agent suppression system', 'GASEOUS_SUPPRESSION', 'DEMO-GAS-01', 'Synthetic demo system') returning id into v_gas; end if;
  select id into v_foam from public.systems where organisation_id = v_org and code = 'DEMO-FOAM-01' limit 1;
  if v_foam is null then insert into public.systems (organisation_id, building_id, name, system_type, code, description) values (v_org, v_plant, 'Foam monitor system', 'FOAM_SUPPRESSION', 'DEMO-FOAM-01', 'Synthetic demo system') returning id into v_foam; end if;
  select id into v_kitchen_system from public.systems where organisation_id = v_org and code = 'DEMO-KIT-01' limit 1;
  if v_kitchen_system is null then insert into public.systems (organisation_id, building_id, name, system_type, code, description) values (v_org, v_kitchen, 'Kitchen wet-chemical suppression', 'KITCHEN_SUPPRESSION', 'DEMO-KIT-01', 'Synthetic demo system') returning id into v_kitchen_system; end if;
  select id into v_life_safety from public.systems where organisation_id = v_org and code = 'DEMO-LIFE-01' limit 1;
  if v_life_safety is null then insert into public.systems (organisation_id, building_id, name, system_type, code, description) values (v_org, v_tower, 'Emergency life-safety system', 'EMERGENCY_LIFE_SAFETY', 'DEMO-LIFE-01', 'Synthetic demo system') returning id into v_life_safety; end if;
  select id into v_dry_chemical from public.systems where organisation_id = v_org and code = 'DEMO-DCH-01' limit 1;
  if v_dry_chemical is null then insert into public.systems (organisation_id, building_id, name, system_type, code, description) values (v_org, v_kitchen, 'Dry-chemical kitchen protection', 'DRY_CHEMICAL', 'DEMO-DCH-01', 'Synthetic demo system') returning id into v_dry_chemical; end if;

  insert into public.equipment (organisation_id, building_id, system_id, equipment_type_id, asset_code, serial_number, brand, model, capacity, location_description, installation_date, next_inspection_at, technical_data, metadata)
  select v_org, v_tower, v_fas, et.id, x.asset_code, x.serial_number, x.brand, x.model, x.capacity, x.location_description, x.installation_date, current_date + 90, x.technical_data, jsonb_build_object('demo_dataset', true, 'demo_label', 'Synthetic presentation asset')
  from (values
    ('FAST-DEMO-FAP-001','FAP-STD','DEMO-FAP-001','Notifier','NFS2-3030',null,'Tower A fire command centre','2025-01-15'::date,'{"panel_configuration":"addressable","standby_battery_voltage":24,"battery_capacity":65}'::jsonb),
    ('FAST-DEMO-MCP-001','MCP-STD','DEMO-MCP-001','Apollo','Eaton MCP','', 'Tower A Level 1 east exit','2025-01-15'::date,'{"panel_configuration":"addressable","zone_reference":"Z01","device_address":"001"}'::jsonb),
    ('FAST-DEMO-DET-001','DET-SMOKE','DEMO-DET-001','Apollo','XP95 Smoke Detector',null,'Tower A Level 3 corridor','2025-01-15'::date,'{"panel_configuration":"addressable","zone_reference":"Z03","device_address":"031"}'::jsonb),
    ('FAST-DEMO-SPR-001','SPR-STD','DEMO-SPR-001','Tyco','TY-B','K80','Tower A Level 5 office zone','2025-01-15'::date,'{"system_configuration":"wet","hazard_classification":"OH2","design_area":216,"k_factor":80}'::jsonb),
    ('FAST-DEMO-SPR-VLV-001','SPR-VLV','DEMO-SPR-V-001','Tyco','CV-200',null,'Tower A Level 5 sprinkler valve room','2025-01-15'::date,'{"system_configuration":"wet","hazard_classification":"OH2","valve_zone":"Level 5"}'::jsonb)
  ) as x(asset_code,type_code,serial_number,brand,model,capacity,location_description,installation_date,technical_data)
  join public.equipment_types et on et.code=x.type_code and et.organisation_id is null
  where not exists (select 1 from public.equipment e where e.organisation_id=v_org and e.asset_code=x.asset_code);

  insert into public.equipment (organisation_id, building_id, system_id, equipment_type_id, asset_code, serial_number, brand, model, capacity, location_description, installation_date, next_inspection_at, technical_data, metadata)
  select v_org, v_plant, x.system_id, et.id, x.asset_code, x.serial_number, x.brand, x.model, x.capacity, x.location_description, x.installation_date, current_date + 90, x.technical_data, jsonb_build_object('demo_dataset', true, 'demo_label', 'Synthetic presentation asset')
  from (values
    ('FAST-DEMO-PMP-001',v_pump,'PMP-DIESEL','DEMO-PMP-001','DieselTech','FP-150','1500 L/min','Plant room pump set','2025-01-15'::date,'{"pump_type":"diesel","rated_flow":1500,"rated_pressure":10,"driver_power":45,"controller_type":"diesel"}'::jsonb),
    ('FAST-DEMO-GAS-CTRL-001',v_gas,'GAS-CTRL','DEMO-GAS-C-001','Kidde','ARIES','300 m³','Clean-agent control panel room','2025-01-15'::date,'{"agent_or_medium":"FK-5-1-12","protected_volume":300,"agent_quantity":120,"cylinder_count":4,"design_concentration":5.6}'::jsonb),
    ('FAST-DEMO-GAS-CYL-001',v_gas,'GAS-CYL','DEMO-GAS-CY-001','Kidde','K-120','120 kg','Clean-agent cylinder bank','2025-01-15'::date,'{"agent_or_medium":"FK-5-1-12","protected_volume":300,"agent_quantity":120,"cylinder_count":4,"cylinder_pressure":42}'::jsonb),
    ('FAST-DEMO-FOAM-001',v_foam,'FOAM-MON','DEMO-FOAM-001','Viking','VM-200','2000 L/min','Plant room foam monitor bay','2025-01-15'::date,'{"agent_or_medium":"AFFF 3%","design_flow":2000,"monitor_count":2,"foam_concentration":3,"tank_capacity":5000}'::jsonb),
    ('FAST-DEMO-KITCHEN-001',v_kitchen_system,'KITCHEN-CTRL','DEMO-KIT-001','Ansul','R-102','24 L','Commercial kitchen hood','2025-01-15'::date,'{"agent_or_medium":"Wet chemical","agent_quantity":24,"nozzle_count":8,"protected_appliances":"Fryers, griddle, wok"}'::jsonb),
    ('FAST-DEMO-DCH-001',v_dry_chemical,'DCH-CTRL','DEMO-DCH-001','Amerex','KP','12 kg','Kitchen dry-chemical cabinet','2025-01-15'::date,'{"agent_or_medium":"Dry powder","agent_quantity":12,"protected_appliances":"Cooking line"}'::jsonb),
    ('FAST-DEMO-EML-001',v_life_safety,'EML-SELF','DEMO-EML-001','Cooper','Menvie','3 hours','Tower A Level 1 stair lobby','2025-01-15'::date,'{"battery_duration":180,"lighting_mode":"non_maintained"}'::jsonb),
    ('FAST-DEMO-EXIT-001',v_life_safety,'EXIT-ARROW','DEMO-EXIT-001','Cooper','EURO','3 hours','Tower A Level 1 west exit','2025-01-15'::date,'{"battery_duration":180,"sign_type":"directional"}'::jsonb),
    ('FAST-DEMO-HYD-001',v_pump,'HYD-STD','DEMO-HYD-001','Viking','Landing Valve','65 mm','Plant room riser connection','2025-01-15'::date,'{"pressure_rating":12,"flow_rating":500,"nozzle_size":19}'::jsonb),
    ('FAST-DEMO-EXT-001',v_kitchen_system,'EXT-CO2','DEMO-EXT-001','Gloria','CO2-5','5 kg','Commercial kitchen entrance','2025-01-15'::date,'{"agent_or_medium":"CO2","nominal_capacity":5,"pressure_rating":150}'::jsonb)
  ) as x(asset_code,system_id,type_code,serial_number,brand,model,capacity,location_description,installation_date,technical_data)
  join public.equipment_types et on et.code=x.type_code and et.organisation_id is null
  where not exists (select 1 from public.equipment e where e.organisation_id=v_org and e.asset_code=x.asset_code);

  select id into v_plan from public.maintenance_plans where organisation_id=v_org and name='FAST Demo Annual Fire Protection Service' limit 1;
  if v_plan is null then
    insert into public.maintenance_plans (organisation_id,client_id,site_id,name,frequency,interval_days,start_date)
    values (v_org,v_client,v_site,'FAST Demo Annual Fire Protection Service','YEARLY',null,current_date)
    returning id into v_plan;
  end if;
  select id into v_job from public.maintenance_jobs where organisation_id=v_org and job_number='FAST-DEMO-JOB-001' limit 1;
  if v_job is null then
    insert into public.maintenance_jobs (organisation_id,maintenance_plan_id,client_id,site_id,building_id,job_number,scheduled_date,status,notes)
    values (v_org,v_plan,v_client,v_site,v_tower,'FAST-DEMO-JOB-001',current_date + 7,'SCHEDULED','Synthetic presentation job linking representative fire-system assets.')
    returning id into v_job;
  end if;
  insert into public.job_equipment (organisation_id,job_id,equipment_id,status,notes)
  select v_org,v_job,e.id,'PENDING','Synthetic demo asset linked to annual presentation job.'
  from public.equipment e
  where e.organisation_id=v_org and e.asset_code like 'FAST-DEMO-%'
    and not exists (select 1 from public.job_equipment je where je.job_id=v_job and je.equipment_id=e.id);
end $$;

