-- Goal 24: extend the global FireMaint catalogue with specialist systems.
-- All rows are global product catalogue data (organisation_id is NULL).

alter type public.system_type add value if not exists 'ASPIRATING_SMOKE';
alter type public.system_type add value if not exists 'GAS_DETECTION';
alter type public.system_type add value if not exists 'FIRE_EVACUATION';
alter type public.system_type add value if not exists 'FIRE_BRIGADE_COMMS';

do $$
declare
  r record;
  f record;
  v_type uuid;
  v_template uuid;
begin
  for r in
    select * from (values
      ('ASP-DET','Aspirating smoke detector / VESDA detector','ASPIRATING_SMOKE','Very-early-warning aspirating smoke detection detector.'),
      ('ASP-PIPE','Aspirating sampling pipe network','ASPIRATING_SMOKE','Pipe network serving an aspirating smoke detector.'),
      ('ASP-POINT','Aspirating sampling point','ASPIRATING_SMOKE','Sampling hole, point, or capillary endpoint.'),
      ('ASP-FILTER','Aspirating detector filter','ASPIRATING_SMOKE','Primary or secondary filter used by an aspirating detector.'),
      ('ASP-REMOTE','Aspirating remote display','ASPIRATING_SMOKE','Remote display or annunciator for aspirating detection.'),
      ('ASP-POWER','Aspirating detector power supply','ASPIRATING_SMOKE','Dedicated or supervised power supply for aspirating detection.'),
      ('ASP-HLI','Aspirating high-level interface','ASPIRATING_SMOKE','Network or high-level interface for monitoring and maintenance.'),
      ('ASP-PURGE','Aspirating pipe purge unit','ASPIRATING_SMOKE','Automatic or manual pipe purge assembly.'),
      ('GDET-CTRL','Gas detection controller','GAS_DETECTION','Controller for combustible, toxic, or oxygen-deficiency gas detection.'),
      ('GDET-SENSOR','Gas detection sensor','GAS_DETECTION','Fixed gas sensor or detector head.'),
      ('GDET-BEACON','Gas alarm beacon / sounder','GAS_DETECTION','Local gas alarm notification appliance.'),
      ('GDET-REMOTE','Gas detection remote display','GAS_DETECTION','Remote gas concentration or alarm display.'),
      ('GDET-VALVE','Gas detection shutoff interface','GAS_DETECTION','Automatic gas shutoff or plant interlock interface.'),
      ('GDET-CAL','Gas detector calibration point','GAS_DETECTION','Calibration, bump-test, or sampling point.'),
      ('EVAC-CTRL','Voice evacuation controller','FIRE_EVACUATION','Voice evacuation controller and zone management unit.'),
      ('EVAC-MIC','Emergency microphone station','FIRE_EVACUATION','Emergency or firefighter microphone station.'),
      ('EVAC-AMP','Voice evacuation amplifier','FIRE_EVACUATION','Supervised amplifier serving evacuation speaker circuits.'),
      ('EVAC-SPK','Voice evacuation speaker','FIRE_EVACUATION','Loudspeaker or sounder used for voice evacuation.'),
      ('EVAC-BATT','Voice evacuation standby battery','FIRE_EVACUATION','Standby battery set for voice evacuation equipment.'),
      ('FBC-PANEL','Fire brigade communication panel','FIRE_BRIGADE_COMMS','Firefighter intercom or fire brigade communication panel.'),
      ('FBC-HANDSET','Fire brigade handset','FIRE_BRIGADE_COMMS','Firefighter telephone or intercom handset.'),
      ('FBC-REFUGE','Refuge communication point','FIRE_BRIGADE_COMMS','Emergency refuge-area communication point.'),
      ('FBC-PSU','Fire brigade communication power supply','FIRE_BRIGADE_COMMS','Supervised power supply for fire brigade communications.')
    ) as x(code,name,system_type,description)
  loop
    select id into v_type from public.equipment_types where organisation_id is null and code = r.code limit 1;
    if v_type is null then
      insert into public.equipment_types (organisation_id,name,code,system_type,description,active,catalogue_version,approval_status,reference_standards,approved_at)
      values (null,r.name,r.code,r.system_type::public.system_type,r.description,true,1,'APPROVED','[]'::jsonb,now())
      returning id into v_type;
    end if;

    for f in
      select * from (values
        ('component_role','Component role','TEXT',null,true,true,10),
        ('manufacturer_reference','Manufacturer reference','TEXT',null,false,true,20),
        ('model_reference','Model reference','TEXT',null,false,true,30)
      ) as fields(field_key,label,field_type,unit,required,customer_visible,sort_order)
    loop
      insert into public.equipment_type_fields (organisation_id,equipment_type_id,field_key,label,field_type,unit,options,required,customer_visible,sort_order,active)
      select null,v_type,f.field_key,f.label,f.field_type::public.template_field_type,f.unit,'[]'::jsonb,f.required,f.customer_visible,f.sort_order,true
      where not exists (
        select 1 from public.equipment_type_fields existing
        where existing.organisation_id is null and existing.equipment_type_id=v_type and existing.field_key=f.field_key
      );
    end loop;
  end loop;

  -- Category-specific technical fields for the primary equipment record.
  for f in
    select * from (values
      ('ASP-DET','detector_technology','Detector technology','SELECT',null,true,true,100,'["laser","flair","other"]'::jsonb),
      ('ASP-DET','sampling_pipe_count','Sampling pipe count','NUMBER','pipes',true,true,110,'[]'::jsonb),
      ('ASP-DET','sampling_point_count','Sampling point count','NUMBER','points',true,true,120,'[]'::jsonb),
      ('ASP-DET','alarm_thresholds','Alarm threshold profile','TEXT',null,true,true,130,'[]'::jsonb),
      ('ASP-DET','airflow_status','Airflow status','SELECT',null,true,true,140,'["normal","attention","fault"]'::jsonb),
      ('GDET-SENSOR','gas_type','Gas type','TEXT',null,true,true,100,'[]'::jsonb),
      ('GDET-SENSOR','detection_range','Detection range','TEXT',null,true,true,110,'[]'::jsonb),
      ('GDET-SENSOR','sensor_technology','Sensor technology','SELECT',null,true,true,120,'["electrochemical","infrared","catalytic","photoionization","other"]'::jsonb),
      ('GDET-SENSOR','alarm_setpoints','Alarm setpoints','TEXT',null,true,true,130,'[]'::jsonb),
      ('GDET-SENSOR','calibration_due','Calibration due','DATE',null,true,true,140,'[]'::jsonb),
      ('GDET-CTRL','gas_detection_zones','Detection zones','NUMBER','zones',true,true,100,'[]'::jsonb),
      ('GDET-CTRL','controller_protocol','Controller protocol','TEXT',null,false,true,110,'[]'::jsonb),
      ('EVAC-CTRL','evacuation_zones','Evacuation zones','NUMBER','zones',true,true,100,'[]'::jsonb),
      ('EVAC-CTRL','amplifier_capacity','Amplifier capacity','NUMBER','W',true,true,110,'[]'::jsonb),
      ('EVAC-CTRL','battery_standby_hours','Battery standby duration','NUMBER','hours',true,true,120,'[]'::jsonb),
      ('EVAC-AMP','amplifier_capacity','Amplifier capacity','NUMBER','W',true,true,100,'[]'::jsonb),
      ('EVAC-SPK','speaker_wattage','Speaker wattage','NUMBER','W',true,true,100,'[]'::jsonb),
      ('FBC-PANEL','communication_loop_count','Communication loop count','NUMBER','loops',true,true,100,'[]'::jsonb),
      ('FBC-PANEL','handset_capacity','Handset capacity','NUMBER','handsets',true,true,110,'[]'::jsonb),
      ('FBC-PANEL','battery_standby_hours','Battery standby duration','NUMBER','hours',true,true,120,'[]'::jsonb),
      ('FBC-HANDSET','handset_location','Handset location','TEXT',null,true,true,100,'[]'::jsonb),
      ('FBC-REFUGE','refuge_location','Refuge location','TEXT',null,true,true,100,'[]'::jsonb)
    ) as fields(type_code,field_key,label,field_type,unit,required,customer_visible,sort_order,options)
  loop
    select id into v_type from public.equipment_types where organisation_id is null and code=f.type_code limit 1;
    insert into public.equipment_type_fields (organisation_id,equipment_type_id,field_key,label,field_type,unit,options,required,customer_visible,sort_order,active)
    select null,v_type,f.field_key,f.label,f.field_type::public.template_field_type,f.unit,f.options,f.required,f.customer_visible,f.sort_order,true
    where not exists (
      select 1 from public.equipment_type_fields existing
      where existing.organisation_id is null and existing.equipment_type_id=v_type and existing.field_key=f.field_key
    );
  end loop;

  -- One active checklist per specialist category. Components reuse the same
  -- category-level service workflow when added to a maintenance job.
  for r in
    select * from (values
      ('ASP-DET','Aspirating Smoke Detection — Specialist Checklist v1','Very-early-warning smoke detection inspection.'),
      ('GDET-SENSOR','Gas Detection — Specialist Checklist v1','Gas sensor, calibration, alarm, and interface inspection.'),
      ('EVAC-CTRL','Voice Evacuation — Specialist Checklist v1','Voice evacuation controller, amplifier, and zone inspection.'),
      ('FBC-PANEL','Fire Brigade Communications — Specialist Checklist v1','Fire brigade communication panel and handset inspection.')
    ) as x(type_code,name,description)
  loop
    select t.id into v_template
    from public.inspection_templates t
    join public.equipment_types et on et.id=t.equipment_type_id
    where t.organisation_id is null and t.status='ACTIVE' and et.code=r.type_code
    limit 1;
    if v_template is null then
      insert into public.inspection_templates (organisation_id,equipment_type_id,name,code,version,status,description)
      select null,et.id,r.name,'CAT-'||r.type_code||'-CHECK',1,'ACTIVE',r.description
      from public.equipment_types et
      where et.organisation_id is null and et.code=r.type_code
      returning id into v_template;
      insert into public.inspection_template_items (template_id,section,item_code,prompt,field_type,options,required,sort_order,guidance,fail_creates_finding,metadata)
      values (v_template,'Specialist service checks','GEN-01','Confirm the specialist system is present, accessible, labelled, and serviceable.','PASS_FAIL','[]'::jsonb,true,10,'Use the approved manufacturer and service procedure for the installed system.',true,jsonb_build_object('catalogue_category',r.type_code));
    end if;
  end loop;
end $$;

