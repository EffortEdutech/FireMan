create type public.corrective_work_order_status as enum (
  'SCHEDULED', 'IN_PROGRESS', 'REPAIR_SUBMITTED', 'VERIFIED', 'CANCELLED'
);

create type public.corrective_work_order_authorization as enum (
  'APPROVED_QUOTE', 'MANAGEMENT_EXCEPTION'
);

create table public.corrective_work_orders (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  work_order_number text not null default (
    'CWO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  finding_id uuid not null references public.findings(id) on delete restrict,
  quote_request_id uuid unique references public.finding_quote_requests(id) on delete restrict,
  authorization_type public.corrective_work_order_authorization not null,
  exception_reason text,
  assigned_technician_id uuid not null references public.profiles(id) on delete restrict,
  scheduled_date date not null,
  status public.corrective_work_order_status not null default 'SCHEDULED',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint corrective_work_orders_org_number_unique unique (organisation_id, work_order_number),
  constraint corrective_work_orders_authorization_shape check (
    (authorization_type = 'APPROVED_QUOTE' and quote_request_id is not null and exception_reason is null)
    or
    (authorization_type = 'MANAGEMENT_EXCEPTION'
      and quote_request_id is null
      and exception_reason is not null
      and length(btrim(exception_reason)) between 10 and 1000)
  )
);

create unique index idx_corrective_work_orders_one_active_per_finding
  on public.corrective_work_orders (organisation_id, finding_id)
  where status not in ('VERIFIED', 'CANCELLED');

create index idx_corrective_work_orders_technician_schedule
  on public.corrective_work_orders (assigned_technician_id, scheduled_date)
  where status not in ('VERIFIED', 'CANCELLED');

alter table public.corrective_work_orders enable row level security;

revoke all on public.corrective_work_orders from anon, authenticated;
grant select (
  id,
  organisation_id,
  work_order_number,
  finding_id,
  quote_request_id,
  authorization_type,
  exception_reason,
  assigned_technician_id,
  scheduled_date,
  status,
  created_at,
  updated_at
) on public.corrective_work_orders to authenticated;
grant insert (
  organisation_id,
  finding_id,
  quote_request_id,
  authorization_type,
  exception_reason,
  assigned_technician_id,
  scheduled_date,
  created_by
) on public.corrective_work_orders to authenticated;
grant all on public.corrective_work_orders to service_role;

create policy corrective_work_orders_management_select
on public.corrective_work_orders
for select
to authenticated
using (
  organisation_id = private.get_current_organisation_id()
  and private.is_admin_or_supervisor()
);

create policy corrective_work_orders_assigned_technician_select
on public.corrective_work_orders
for select
to authenticated
using (
  organisation_id = private.get_current_organisation_id()
  and private.get_current_role() = 'TECHNICIAN'
  and assigned_technician_id = (select auth.uid())
);

create policy corrective_work_orders_management_insert
on public.corrective_work_orders
for insert
to authenticated
with check (
  organisation_id = private.get_current_organisation_id()
  and created_by = (select auth.uid())
  and private.is_admin_or_supervisor()
  and exists (
    select 1
    from public.findings f
    where f.id = corrective_work_orders.finding_id
      and f.organisation_id = corrective_work_orders.organisation_id
      and f.status in ('OPEN', 'IN_PROGRESS')
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = corrective_work_orders.assigned_technician_id
      and p.organisation_id = corrective_work_orders.organisation_id
      and p.role = 'TECHNICIAN'
      and p.active = true
  )
  and (
    (
      authorization_type = 'APPROVED_QUOTE'
      and exception_reason is null
      and exists (
        select 1
        from public.finding_quote_requests qr
        where qr.id = corrective_work_orders.quote_request_id
          and qr.finding_id = corrective_work_orders.finding_id
          and qr.organisation_id = corrective_work_orders.organisation_id
          and qr.status = 'APPROVED'
      )
    )
    or
    (
      authorization_type = 'MANAGEMENT_EXCEPTION'
      and quote_request_id is null
      and exception_reason is not null
      and length(btrim(exception_reason)) between 10 and 1000
    )
  )
);

create or replace function public.audit_corrective_work_order_creation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.audit_logs (
    organisation_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    after_data
  ) values (
    new.organisation_id,
    (select auth.uid()),
    'CORRECTIVE_WORK_ORDER_CREATED',
    'CORRECTIVE_WORK_ORDER',
    new.id,
    jsonb_build_object(
      'work_order_number', new.work_order_number,
      'finding_id', new.finding_id,
      'quote_request_id', new.quote_request_id,
      'authorization_type', new.authorization_type,
      'exception_reason', new.exception_reason,
      'assigned_technician_id', new.assigned_technician_id,
      'scheduled_date', new.scheduled_date,
      'status', new.status
    )
  );
  return new;
end;
$$;

revoke all on function public.audit_corrective_work_order_creation() from public, anon, authenticated;

create trigger corrective_work_order_creation_audit
after insert on public.corrective_work_orders
for each row execute function public.audit_corrective_work_order_creation();
