-- Generate all recurring cycles for an active plan through a requested date.
-- The underlying generator is idempotent, so rerunning a horizon is safe.
create or replace function public.generate_maintenance_plan_horizon(
  p_plan_id uuid,
  p_horizon_end date,
  p_current_date date default current_date
)
returns setof public.maintenance_jobs
language plpgsql
security invoker
set search_path = public
as $$
declare
  p public.maintenance_plans;
  v_anchor date := p_current_date;
  v_job public.maintenance_jobs;
begin
  select * into p
  from public.maintenance_plans
  where id = p_plan_id
    and organisation_id = private.get_current_organisation_id()
    and active = true;

  if p.id is null then
    raise exception 'Maintenance plan not found';
  end if;

  if p_horizon_end < p_current_date then
    raise exception 'Planning horizon must be on or after the current date';
  end if;

  loop
    v_job := public.create_next_maintenance_job(p_plan_id, v_anchor);
    exit when v_job.scheduled_date > p_horizon_end;
    return next v_job;
    v_anchor := v_job.scheduled_date;
  end loop;
end $$;
