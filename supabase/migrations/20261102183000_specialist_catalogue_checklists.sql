-- Goal 24: complete specialist catalogue checklists and standards metadata.
-- These are global FireMaint product records, not client-owned data.

update public.equipment_types
set reference_standards = case system_type
  when 'ASPIRATING_SMOKE' then '["NFPA 72","EN 54-20"]'::jsonb
  when 'GAS_DETECTION' then '["NFPA 72"]'::jsonb
  when 'FIRE_EVACUATION' then '["NFPA 72","NFPA 101"]'::jsonb
  when 'FIRE_BRIGADE_COMMS' then '["NFPA 72","NFPA 101"]'::jsonb
  else reference_standards
end
where organisation_id is null
  and system_type in ('ASPIRATING_SMOKE','GAS_DETECTION','FIRE_EVACUATION','FIRE_BRIGADE_COMMS');

do $$
declare
  v_template uuid;
  item record;
begin
  for item in
    select * from (values
      ('CAT-ASP-DET-CHECK','ASP-02','Detection status and alarm thresholds','PASS_FAIL',20,'Confirm detector status, alarm thresholds, and event history are normal.',true),
      ('CAT-ASP-DET-CHECK','ASP-03','Airflow and pipe network condition','PASS_FAIL',30,'Inspect airflow indications, pipe integrity, sampling points, and end caps.',true),
      ('CAT-ASP-DET-CHECK','ASP-04','Filter and sampling arrangement','PASS_FAIL',40,'Inspect filter condition and confirm the installed sampling arrangement remains accessible.',true),
      ('CAT-GDET-SENSOR-CHECK','GAS-02','Sensor condition and indication','PASS_FAIL',20,'Confirm sensor head condition, local indication, and controller communication.',true),
      ('CAT-GDET-SENSOR-CHECK','GAS-03','Calibration or bump-test status','PASS_FAIL',30,'Verify calibration or bump-test evidence is current for the gas type and sensor.',true),
      ('CAT-GDET-SENSOR-CHECK','GAS-04','Alarm setpoints and interlocks','PASS_FAIL',40,'Verify alarm setpoints, beacon/sounder operation, and approved shutoff or plant interlock response.',true),
      ('CAT-EVAC-CTRL-CHECK','EVAC-02','Controller and fault indications','PASS_FAIL',20,'Confirm the controller is healthy with no active fault, earth, charger, or zone fault indication.',true),
      ('CAT-EVAC-CTRL-CHECK','EVAC-03','Amplifier and speaker circuit operation','PASS_FAIL',30,'Verify supervised amplifier and speaker circuits operate in the required evacuation zones.',true),
      ('CAT-EVAC-CTRL-CHECK','EVAC-04','Emergency microphone and standby power','PASS_FAIL',40,'Test emergency microphone priority and confirm standby battery/charger condition.',true),
      ('CAT-FBC-PANEL-CHECK','FBC-02','Panel and power supply condition','PASS_FAIL',20,'Confirm panel, charger, batteries, and fault indications are normal.',true),
      ('CAT-FBC-PANEL-CHECK','FBC-03','Handset communication test','PASS_FAIL',30,'Test communication between the panel and each assigned firefighter handset/refuge point.',true),
      ('CAT-FBC-PANEL-CHECK','FBC-04','Labelling, access, and call-point condition','PASS_FAIL',40,'Confirm handsets and refuge communication points are labelled, accessible, and physically serviceable.',true)
    ) as x(template_code,item_code,prompt,field_type,sort_order,guidance,fail_creates_finding)
  loop
    select id into v_template from public.inspection_templates
    where organisation_id is null and code=item.template_code and status='ACTIVE' limit 1;

    if v_template is not null then
      insert into public.inspection_template_items
        (template_id,section,item_code,prompt,field_type,options,required,sort_order,guidance,fail_creates_finding,metadata)
      select v_template,'Specialist service checks',item.item_code,item.prompt,item.field_type::public.template_field_type,
        '[]'::jsonb,true,item.sort_order,item.guidance,item.fail_creates_finding,
        jsonb_build_object('catalogue_checklist','specialist-v1')
      where not exists (
        select 1 from public.inspection_template_items existing
        where existing.template_id=v_template and existing.item_code=item.item_code
      );
    end if;
  end loop;
end $$;

