-- Reframe the synthetic dataset as developer-owned FireMaint showcase data.
-- It is not FAST customer data and must not be presented as a client asset register.

do $$
declare
  v_org uuid;
begin
  select id into v_org from public.organisations where name = 'FAST' limit 1;
  if v_org is null then
    raise exception 'Configured demonstration organisation was not found';
  end if;

  update public.clients
  set name = 'FireMaint Developer Showcase',
      registration_no = 'DEMO-FIREMAINT-001',
      industry = 'Synthetic fire-protection product presentation',
      address = 'Developer-owned synthetic data — not a client record'
  where organisation_id = v_org and name = 'FAST Demonstration Client';

  update public.sites
  set name = 'FireMaint Showcase Campus',
      site_code = 'FM-SHOWCASE-SITE',
      address = 'Synthetic presentation location — developer-owned data'
  where organisation_id = v_org and site_code = 'FAST-DEMO-SITE';

  update public.buildings
  set name = 'Showcase Tower A', code = 'SHOWCASE-TOWER-A'
  where organisation_id = v_org and code = 'TOWER-A';

  update public.buildings
  set name = 'Showcase Plant Room', code = 'SHOWCASE-PLANT'
  where organisation_id = v_org and code = 'PLANT-ROOM';

  update public.buildings
  set name = 'Showcase Commercial Kitchen', code = 'SHOWCASE-KITCHEN'
  where organisation_id = v_org and code = 'KITCHEN';

  update public.equipment
  set asset_code = replace(asset_code, 'FAST-DEMO-', 'FM-SHOWCASE-'),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'demo_dataset', true,
        'data_owner', 'FireMaint developer team',
        'demo_label', 'Developer-owned synthetic showcase asset',
        'not_client_data', true
      )
  where organisation_id = v_org and asset_code like 'FAST-DEMO-%';

  update public.maintenance_plans
  set name = 'FireMaint Showcase Annual Fire Protection Service'
  where organisation_id = v_org and name = 'FAST Demo Annual Fire Protection Service';

  update public.maintenance_jobs
  set job_number = 'FM-SHOWCASE-JOB-001',
      notes = 'Developer-owned synthetic showcase job linking representative fire-system assets. Not client work.'
  where organisation_id = v_org and job_number = 'FAST-DEMO-JOB-001';

  update public.job_equipment
  set notes = 'Developer-owned synthetic showcase asset linked to presentation job.'
  where organisation_id = v_org and notes = 'Synthetic demo asset linked to annual presentation job.';

  update public.systems
  set description = 'Developer-owned synthetic showcase system — not client data.'
  where organisation_id = v_org and code like 'DEMO-%';
end $$;

