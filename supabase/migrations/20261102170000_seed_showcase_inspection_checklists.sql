-- Give every developer-owned showcase asset an inspection checklist.
-- Existing global templates are reused; missing types receive a minimal
-- synthetic presentation checklist so the workflow is demonstrable end to end.

do $$
declare
  r record;
  v_template uuid;
begin
  for r in
    select distinct et.id as equipment_type_id, et.code as type_code, et.name as type_name
    from public.equipment e
    join public.equipment_types et on et.id = e.equipment_type_id
    where e.asset_code like 'FM-SHOWCASE-%'
      and et.organisation_id is null
      and not exists (
        select 1 from public.inspection_templates t
        where t.equipment_type_id = et.id
          and t.organisation_id is null
          and t.status = 'ACTIVE'
      )
  loop
    insert into public.inspection_templates (
      organisation_id, equipment_type_id, name, code, version, status, description
    )
    values (
      null,
      r.equipment_type_id,
      r.type_name || ' — Showcase Checklist v1',
      'SHOWCASE-' || r.type_code || '-CHECK',
      1,
      'ACTIVE',
      'Synthetic presentation checklist for the FireMaint developer showcase.'
    )
    returning id into v_template;

    insert into public.inspection_template_items (
      template_id, section, item_code, prompt, field_type, options,
      required, sort_order, guidance, fail_creates_finding, metadata
    )
    values (
      v_template,
      'General condition',
      'GEN-01',
      'Confirm the equipment is present, accessible, labelled, and in serviceable condition.',
      'PASS_FAIL',
      '[]'::jsonb,
      true,
      10,
      'Synthetic showcase checklist item. Replace with the approved service procedure for a real client asset.',
      true,
      jsonb_build_object('demo_dataset', true, 'not_client_procedure', true)
    );
  end loop;

  insert into public.inspections (
    organisation_id, job_id, job_equipment_id, template_id, status, technician_notes
  )
  select
    j.organisation_id,
    j.id,
    je.id,
    t.id,
    'NOT_STARTED',
    'Synthetic showcase inspection — not a real client service record.'
  from public.maintenance_jobs j
  join public.job_equipment je on je.job_id = j.id
  join public.equipment e on e.id = je.equipment_id
  join lateral (
    select t0.id
    from public.inspection_templates t0
    where t0.equipment_type_id = e.equipment_type_id
      and t0.organisation_id is null
      and t0.status = 'ACTIVE'
    order by t0.version desc
    limit 1
  ) t on true
  where j.job_number = 'FM-SHOWCASE-JOB-001'
    and not exists (
      select 1 from public.inspections i where i.job_equipment_id = je.id
    );
end $$;

