alter table public.finding_quote_requests
  add constraint finding_quote_requests_external_reference_not_blank
  check (external_quote_reference is null or length(btrim(external_quote_reference)) > 0);

revoke select on public.finding_quote_requests from authenticated;
grant select (
  id,
  organisation_id,
  finding_id,
  request_reference,
  external_quote_reference,
  status,
  created_at,
  updated_at
) on public.finding_quote_requests to authenticated;

grant update (status, external_quote_reference)
  on public.finding_quote_requests to authenticated;

create policy finding_quote_requests_management_update
on public.finding_quote_requests
for update
to authenticated
using (
  organisation_id = private.get_current_organisation_id()
  and private.is_admin_or_supervisor()
)
with check (
  organisation_id = private.get_current_organisation_id()
  and private.is_admin_or_supervisor()
);

create policy finding_quote_requests_client_issued_select
on public.finding_quote_requests
for select
to authenticated
using (
  organisation_id = private.get_current_organisation_id()
  and private.get_current_role() = 'CLIENT'
  and exists (
    select 1
    from public.findings f
    join public.maintenance_jobs j on j.id = f.job_id
    join public.reports r on r.job_id = j.id and r.status = 'ISSUED'
    where f.id = finding_quote_requests.finding_id
      and f.organisation_id = finding_quote_requests.organisation_id
      and j.client_id = (select client_id from public.profiles where id = (select auth.uid()))
  )
);

create or replace function public.guard_finding_quote_request_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'REQUESTED' and new.status in ('SUBMITTED', 'CANCELLED'))
      or (old.status = 'SUBMITTED' and new.status in ('APPROVED', 'REJECTED', 'CANCELLED'))
    ) then
      raise exception 'Invalid quotation request status transition: % to %', old.status, new.status
        using errcode = '23514';
    end if;
  elsif new.external_quote_reference is not distinct from old.external_quote_reference then
    raise exception 'No quotation request changes were provided'
      using errcode = '23514';
  end if;

  if new.status = 'SUBMITTED' and nullif(btrim(new.external_quote_reference), '') is null then
    raise exception 'An external quote reference is required before marking the quotation submitted'
      using errcode = '23514';
  end if;

  if old.status in ('APPROVED', 'REJECTED', 'CANCELLED')
    and new.external_quote_reference is distinct from old.external_quote_reference then
    raise exception 'A terminal quotation request cannot be changed'
      using errcode = '23514';
  end if;

  new.external_quote_reference := nullif(btrim(new.external_quote_reference), '');
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.guard_finding_quote_request_update() from public, anon, authenticated;

create trigger finding_quote_request_update_guard
before update on public.finding_quote_requests
for each row execute function public.guard_finding_quote_request_update();

create or replace function public.audit_finding_quote_request_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_action text;
begin
  v_action := case
    when new.status is distinct from old.status then 'CORRECTIVE_QUOTE_REQUEST_STATUS_CHANGED'
    else 'CORRECTIVE_QUOTE_REFERENCE_UPDATED'
  end;

  insert into public.audit_logs (
    organisation_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  ) values (
    new.organisation_id,
    (select auth.uid()),
    v_action,
    'FINDING_QUOTE_REQUEST',
    new.id,
    jsonb_build_object(
      'status', old.status,
      'external_quote_reference', old.external_quote_reference
    ),
    jsonb_build_object(
      'status', new.status,
      'external_quote_reference', new.external_quote_reference
    )
  );
  return new;
end;
$$;

revoke all on function public.audit_finding_quote_request_update() from public, anon, authenticated;

create trigger finding_quote_request_update_audit
after update on public.finding_quote_requests
for each row execute function public.audit_finding_quote_request_update();
