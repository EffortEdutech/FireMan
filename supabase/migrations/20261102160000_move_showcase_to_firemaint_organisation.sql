-- Move the synthetic presentation dataset into a separate developer-owned tenant.
-- FAST remains a prospect/portal brand; no FAST customer records are moved or created.

do $$
declare
  v_showcase_org uuid;
begin
  select id into v_showcase_org from public.organisations where name = 'FireMaint Showcase' limit 1;
  if v_showcase_org is null then
    insert into public.organisations (
      name, legal_name, registration_no, phone, email, address,
      report_prefix, timezone, active, public_request_enabled
    )
    values (
      'FireMaint Showcase',
      'FireMaint Developer Showcase',
      'DEMO-FIREMAINT-001',
      '+60 3 0000 0000',
      'showcase@firemaint.demo',
      'Developer-owned synthetic presentation environment',
      'FM',
      'Asia/Kuala_Lumpur',
      true,
      false
    )
    returning id into v_showcase_org;
  end if;

  -- These two composite constraints temporarily prevent changing the tenant
  -- key on a parent and its child in separate statements. They are restored
  -- after all showcase rows have been moved.
  alter table public.equipment drop constraint if exists equipment_building_same_organisation_fkey;
  alter table public.equipment drop constraint if exists equipment_system_same_organisation_fkey;

  update public.clients
  set organisation_id = v_showcase_org
  where name = 'FireMaint Developer Showcase';

  update public.sites
  set organisation_id = v_showcase_org
  where site_code = 'FM-SHOWCASE-SITE';

  update public.buildings
  set organisation_id = v_showcase_org
  where code like 'SHOWCASE-%';

  update public.systems
  set organisation_id = v_showcase_org
  where code like 'DEMO-%' and description like 'Developer-owned synthetic showcase%';

  update public.equipment
  set organisation_id = v_showcase_org
  where asset_code like 'FM-SHOWCASE-%';

  update public.maintenance_plans
  set organisation_id = v_showcase_org
  where name = 'FireMaint Showcase Annual Fire Protection Service';

  update public.maintenance_jobs
  set organisation_id = v_showcase_org
  where job_number = 'FM-SHOWCASE-JOB-001';

  update public.job_equipment
  set organisation_id = v_showcase_org
  where notes = 'Developer-owned synthetic showcase asset linked to presentation job.';

  update public.equipment_documents
  set organisation_id = v_showcase_org
  where equipment_id in (select id from public.equipment where asset_code like 'FM-SHOWCASE-%');

  update public.findings
  set organisation_id = v_showcase_org
  where equipment_id in (select id from public.equipment where asset_code like 'FM-SHOWCASE-%')
     or job_id in (select id from public.maintenance_jobs where job_number = 'FM-SHOWCASE-JOB-001');

  update public.inspections
  set organisation_id = v_showcase_org
  where job_id in (select id from public.maintenance_jobs where job_number = 'FM-SHOWCASE-JOB-001');

  update public.reports
  set organisation_id = v_showcase_org
  where job_id in (select id from public.maintenance_jobs where job_number = 'FM-SHOWCASE-JOB-001');

  alter table public.equipment
    add constraint equipment_building_same_organisation_fkey
    foreign key (organisation_id, building_id) references public.buildings(organisation_id, id);
  alter table public.equipment
    add constraint equipment_system_same_organisation_fkey
    foreign key (organisation_id, system_id) references public.systems(organisation_id, id);
end $$;

