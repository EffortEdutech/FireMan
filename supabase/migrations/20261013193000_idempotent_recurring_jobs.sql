-- A maintenance plan can have at most one generated job for a scheduled date.
create unique index if not exists idx_jobs_plan_scheduled_date
on public.maintenance_jobs(maintenance_plan_id, scheduled_date)
where maintenance_plan_id is not null;

create or replace function public.create_next_maintenance_job(p_plan_id uuid, p_current_date date default current_date)
returns public.maintenance_jobs
language plpgsql
security invoker
set search_path = public
as $$
declare
  p public.maintenance_plans;
  existing_job public.maintenance_jobs;
  d date;
  lock_key bigint;
begin
  select * into p
  from public.maintenance_plans
  where id = p_plan_id
    and organisation_id = private.get_current_organisation_id()
    and active = true;

  if p.id is null then
    raise exception 'Maintenance plan not found';
  end if;

  d := case p.frequency
    when 'MONTHLY' then p_current_date + interval '1 month'
    when 'QUARTERLY' then p_current_date + interval '3 months'
    when 'HALF_YEARLY' then p_current_date + interval '6 months'
    when 'YEARLY' then p_current_date + interval '1 year'
    when 'CUSTOM' then p_current_date + make_interval(days => p.interval_days)
  end;

  lock_key := ('x' || substr(md5(p_plan_id::text || d::text), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(lock_key);

  select * into existing_job
  from public.maintenance_jobs
  where maintenance_plan_id = p.id
    and scheduled_date = d
    and organisation_id = private.get_current_organisation_id();

  if existing_job.id is not null then
    return existing_job;
  end if;

  return public.create_maintenance_job(p.id, p.client_id, p.site_id, null, d, null, null);
end $$;
