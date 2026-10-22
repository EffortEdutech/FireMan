create table public.finding_quote_requests (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  finding_id uuid not null unique references public.findings(id) on delete cascade,
  request_reference text not null unique default (
    'FQR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  external_quote_reference text,
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
  request_notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finding_quote_requests_external_reference_length
    check (external_quote_reference is null or length(external_quote_reference) <= 160),
  constraint finding_quote_requests_notes_length
    check (request_notes is null or length(request_notes) <= 2000)
);

create index idx_finding_quote_requests_org_created
  on public.finding_quote_requests (organisation_id, created_at desc);

alter table public.finding_quote_requests enable row level security;

revoke all on public.finding_quote_requests from anon, authenticated;
grant select on public.finding_quote_requests to authenticated;
grant insert (organisation_id, finding_id, created_by, request_notes)
  on public.finding_quote_requests to authenticated;
grant all on public.finding_quote_requests to service_role;

create policy finding_quote_requests_management_select
on public.finding_quote_requests
for select
to authenticated
using (
  organisation_id = private.get_current_organisation_id()
  and private.is_admin_or_supervisor()
);

create policy finding_quote_requests_management_insert
on public.finding_quote_requests
for insert
to authenticated
with check (
  organisation_id = private.get_current_organisation_id()
  and created_by = (select auth.uid())
  and status = 'REQUESTED'
  and external_quote_reference is null
  and private.is_admin_or_supervisor()
  and exists (
    select 1
    from public.findings f
    where f.id = finding_quote_requests.finding_id
      and f.organisation_id = finding_quote_requests.organisation_id
  )
);

create or replace function public.audit_finding_quote_request_creation()
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
    new.created_by,
    'CORRECTIVE_QUOTE_REQUEST_CREATED',
    'FINDING_QUOTE_REQUEST',
    new.id,
    jsonb_build_object(
      'request_reference', new.request_reference,
      'finding_id', new.finding_id,
      'status', new.status
    )
  );
  return new;
end;
$$;

revoke all on function public.audit_finding_quote_request_creation() from public, anon, authenticated;

create trigger finding_quote_request_creation_audit
after insert on public.finding_quote_requests
for each row execute function public.audit_finding_quote_request_creation();
