-- Seeds reading checklists (pressure, flow, battery voltage, sound level, duration).
-- Review before applying. Requires 20261021120000 and 20261022120000 applied first.
-- Pass/fail limits are NOT stored here: they come only from lib/reports/readings.ts
-- (standard-defined limits). Items with no standard range are recorded and trended only.
insert into public.equipment_types (organisation_id,name,code,system_type,description)
values
  (null,'Hydrant / Landing Valve','HYD-STD','HYDRANT_RISER','Hydrant, riser outlet or landing valve'),
  (null,'Fire Pump Set','PMP-STD','FIRE_PUMP','Fire pump set with controller'),
  (null,'Sprinkler Control Valve Set','SPR-VLV','SPRINKLER','Alarm or control valve set with system gauges')
on conflict do nothing;

do $$
declare
  spec record;
  et uuid;
  t uuid;
begin
  for spec in
    select * from (values
      ('FAP-STD','FAP-READINGS','Fire Alarm Panel — Readings v1','BAT-01','Standby battery voltage','fire_alarm.battery_voltage','Measure on load where the standard requires it.',10),
      ('SND-STD','SND-READINGS','Fire Alarm Sounder — Readings v1','SL-01','Sounder level at representative location','fire_alarm.sounder_level','Record dB(A) at the test position.',10),
      ('EML-STD','EML-READINGS','Emergency Light — Readings v1','DUR-01','Discharge duration on battery','emergency_lighting.discharge_duration','Time until the unit goes out.',10),
      ('SPR-VLV','SPR-READINGS','Sprinkler Valve Set — Readings v1','SP-01','System static pressure','sprinkler.static_pressure','Read with the supply valve open.',10),
      ('SPR-VLV','SPR-READINGS','Sprinkler Valve Set — Readings v1','SP-02','Residual pressure at main drain','sprinkler.residual_pressure','Read during main drain flow.',20),
      ('HYD-STD','HYD-READINGS','Hydrant / Landing Valve — Readings v1','HY-01','Static pressure at outlet','hydrant.static_pressure','Gauge at the outlet, valve closed.',10),
      ('HYD-STD','HYD-READINGS','Hydrant / Landing Valve — Readings v1','HY-02','Flow at outlet','hydrant.flow','Record the test flow.',20),
      ('PMP-STD','PMP-READINGS','Fire Pump Set — Readings v1','PU-01','Suction pressure','fire_pump.suction_pressure','At test condition.',10),
      ('PMP-STD','PMP-READINGS','Fire Pump Set — Readings v1','PU-02','Discharge pressure','fire_pump.discharge_pressure','At test condition.',20),
      ('PMP-STD','PMP-READINGS','Fire Pump Set — Readings v1','PU-03','Pump flow','fire_pump.flow','At test condition.',30),
      ('HR-STD','HR-READINGS','Hose Reel — Readings v1','HRF-01','Flow at nozzle','hose_reel.flow','Record the measured flow.',10)
    ) as v(etype,tcode,tname,icode,prompt,skey,guide,sort)
  loop
    select id into et from public.equipment_types where organisation_id is null and code = spec.etype limit 1;
    continue when et is null;

    insert into public.inspection_templates (organisation_id,equipment_type_id,name,code,version,status,description)
    values (null,et,spec.tname,spec.tcode,1,'ACTIVE','Recorded readings for trend reporting.')
    on conflict (organisation_id,code,version) do nothing;

    select id into t from public.inspection_templates
      where organisation_id is null and code = spec.tcode and version = 1 limit 1;

    insert into public.inspection_template_items
      (template_id,section,item_code,prompt,field_type,required,sort_order,guidance,fail_creates_finding,metadata)
    values
      (t,'Readings',spec.icode,spec.prompt,'NUMBER',true,spec.sort,spec.guide,false,
       jsonb_build_object('semanticKey',spec.skey))
    on conflict (template_id,item_code) do nothing;
  end loop;
end $$;
