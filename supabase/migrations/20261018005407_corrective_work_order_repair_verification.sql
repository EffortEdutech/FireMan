alter table public.corrective_work_orders
  add column repair_notes text,
  add column parts_used text,
  add column repair_completed_at timestamptz,
  add column verification_notes text,
  add column verified_at timestamptz,
  add column verified_by uuid references public.profiles(id) on delete restrict,
  add constraint corrective_work_orders_repair_evidence_length check (
    (repair_notes is null or length(btrim(repair_notes)) between 10 and 5000)
    and (parts_used is null or length(btrim(parts_used)) <= 2000)
    and (verification_notes is null or length(btrim(verification_notes)) between 10 and 2000)
  ),
  add constraint corrective_work_orders_verification_shape check (
    (status = 'VERIFIED' and verified_at is not null and verified_by is not null and verification_notes is not null)
    or
    (status <> 'VERIFIED' and verified_at is null and verified_by is null and verification_notes is null)
  ),
  add constraint corrective_work_orders_repair_submission_shape check (
    (status in ('REPAIR_SUBMITTED', 'VERIFIED') and repair_notes is not null and repair_completed_at is not null)
    or
    (status not in ('REPAIR_SUBMITTED', 'VERIFIED') and repair_notes is null and parts_used is null and repair_completed_at is null)
  );

create table public.corrective_work_order_photos (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  corrective_work_order_id uuid not null references public.corrective_work_orders(id) on delete cascade,
  finding_id uuid not null references public.findings(id) on delete cascade,
  storage_path text not null,
  caption text,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint corrective_work_order_photos_path_unique unique (storage_path),
  constraint corrective_work_order_photos_caption_length check (caption is null or length(caption) <= 300)
);

create index idx_corrective_work_order_photos_order
  on public.corrective_work_order_photos (corrective_work_order_id, created_at);
create index idx_corrective_work_order_photos_finding
  on public.corrective_work_order_photos (finding_id);

create or replace function public.guard_corrective_work_order_photo_count()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.corrective_work_order_id::text, 0));
  if (
    select count(*)
    from public.corrective_work_order_photos p
    where p.corrective_work_order_id = new.corrective_work_order_id
  ) >= 4 then
    raise exception 'Corrective work orders are limited to four repair photos';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_corrective_work_order_photo_count() from public, anon, authenticated;

create trigger corrective_work_order_photo_count_guard
before insert on public.corrective_work_order_photos
for each row execute function public.guard_corrective_work_order_photo_count();

alter table public.corrective_work_order_photos enable row level security;

revoke all on public.corrective_work_order_photos from anon, authenticated;
grant select (
  id, organisation_id, corrective_work_order_id, finding_id, storage_path, caption, created_at
) on public.corrective_work_order_photos to authenticated;
grant insert (
  organisation_id, corrective_work_order_id, finding_id, storage_path, caption, uploaded_by
) on public.corrective_work_order_photos to authenticated;
grant all on public.corrective_work_order_photos to service_role;

revoke select (exception_reason) on public.corrective_work_orders from authenticated;
grant select (
  repair_notes, parts_used, repair_completed_at, verification_notes, verified_at, verified_by
) on public.corrective_work_orders to authenticated;

create policy corrective_work_order_photos_management_select
on public.corrective_work_order_photos
for select to authenticated
using (
  organisation_id = private.get_current_organisation_id()
  and private.is_admin_or_supervisor()
);

create policy corrective_work_order_photos_technician_select
on public.corrective_work_order_photos
for select to authenticated
using (
  organisation_id = private.get_current_organisation_id()
  and private.get_current_role() = 'TECHNICIAN'
  and exists (
    select 1 from public.corrective_work_orders cwo
    where cwo.id = corrective_work_order_photos.corrective_work_order_id
      and cwo.assigned_technician_id = (select auth.uid())
  )
);

create policy corrective_work_order_photos_client_issued_select
on public.corrective_work_order_photos
for select to authenticated
using (
  organisation_id = private.get_current_organisation_id()
  and private.get_current_role() = 'CLIENT'
  and exists (
    select 1
    from public.corrective_work_orders cwo
    join public.findings f on f.id = cwo.finding_id
    join public.maintenance_jobs j on j.id = f.job_id
    join public.reports r on r.job_id = j.id
    where cwo.id = corrective_work_order_photos.corrective_work_order_id
      and cwo.status = 'VERIFIED'
      and cwo.organisation_id = corrective_work_order_photos.organisation_id
      and f.id = corrective_work_order_photos.finding_id
      and j.client_id = (select client_id from public.profiles where id = auth.uid())
      and r.status = 'ISSUED'
  )
);

create policy corrective_work_order_photos_technician_insert
on public.corrective_work_order_photos
for insert to authenticated
with check (
  organisation_id = private.get_current_organisation_id()
  and uploaded_by = (select auth.uid())
  and private.get_current_role() = 'TECHNICIAN'
  and exists (
    select 1 from public.corrective_work_orders cwo
    where cwo.id = corrective_work_order_photos.corrective_work_order_id
      and cwo.finding_id = corrective_work_order_photos.finding_id
      and cwo.organisation_id = corrective_work_order_photos.organisation_id
      and cwo.assigned_technician_id = (select auth.uid())
      and cwo.status = 'IN_PROGRESS'
      and (
        select count(*) < 4
        from public.corrective_work_order_photos p
        where p.corrective_work_order_id = cwo.id
      )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'corrective-repair-photos',
  'corrective-repair-photos',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy corrective_repair_photos_storage_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'corrective-repair-photos'
  and (storage.foldername(name))[1] = private.get_current_organisation_id()::text
  and (storage.foldername(name))[2] = 'corrective-work-orders'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1 from public.corrective_work_orders cwo
    where cwo.id = case
        when (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then ((storage.foldername(name))[3])::uuid
        else null
      end
      and cwo.organisation_id = private.get_current_organisation_id()
      and cwo.assigned_technician_id = (select auth.uid())
      and cwo.status = 'IN_PROGRESS'
      and (
        select count(*) < 4
        from public.corrective_work_order_photos p
        where p.corrective_work_order_id = cwo.id
      )
  )
);

create policy corrective_repair_photos_storage_select
on storage.objects
for select to authenticated
using (
  bucket_id = 'corrective-repair-photos'
  and (storage.foldername(name))[1] = private.get_current_organisation_id()::text
  and (storage.foldername(name))[2] = 'corrective-work-orders'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.corrective_work_orders cwo
    join public.findings f on f.id = cwo.finding_id
    join public.maintenance_jobs j on j.id = f.job_id
    where cwo.id = case
        when (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then ((storage.foldername(name))[3])::uuid
        else null
      end
      and cwo.organisation_id = private.get_current_organisation_id()
      and (
        (private.is_admin_or_supervisor())
        or (private.get_current_role() = 'TECHNICIAN' and cwo.assigned_technician_id = (select auth.uid()))
        or (
          private.get_current_role() = 'CLIENT'
          and j.client_id = (select client_id from public.profiles where id = auth.uid())
          and exists (select 1 from public.reports r where r.job_id = j.id and r.status = 'ISSUED')
        )
      )
  )
);

create or replace function public.start_corrective_work_order(p_work_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.corrective_work_orders
  set status = 'IN_PROGRESS'
  where id = p_work_order_id
    and organisation_id = private.get_current_organisation_id()
    and assigned_technician_id = (select auth.uid())
    and status = 'SCHEDULED';

  if not found then
    raise exception 'Corrective work order is unavailable or cannot be started';
  end if;
end;
$$;
revoke all on function public.start_corrective_work_order(uuid) from public, anon, authenticated;
grant execute on function public.start_corrective_work_order(uuid) to authenticated;

create or replace function public.verify_corrective_work_order(p_work_order_id uuid, p_verification_notes text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_admin_or_supervisor()
    or p_verification_notes is null
    or length(btrim(p_verification_notes)) not between 10 and 2000 then
    raise exception 'Authorized management verification notes are required';
  end if;

  update public.corrective_work_orders
  set status = 'VERIFIED',
      verification_notes = btrim(p_verification_notes),
      verified_at = now(),
      verified_by = (select auth.uid())
  where id = p_work_order_id
    and organisation_id = private.get_current_organisation_id()
    and status = 'REPAIR_SUBMITTED';

  if not found then
    raise exception 'Corrective repair changed before verification';
  end if;
end;
$$;
revoke all on function public.verify_corrective_work_order(uuid, text) from public, anon, authenticated;
grant execute on function public.verify_corrective_work_order(uuid, text) to authenticated;

create or replace function public.guard_corrective_work_order_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organisation_id <> old.organisation_id
    or new.finding_id <> old.finding_id
    or new.quote_request_id is distinct from old.quote_request_id
    or new.authorization_type <> old.authorization_type
    or new.exception_reason is distinct from old.exception_reason
    or new.assigned_technician_id <> old.assigned_technician_id
    or new.scheduled_date <> old.scheduled_date
    or new.created_by <> old.created_by then
    raise exception 'Corrective work order authorization fields are immutable';
  end if;

  if old.status = 'SCHEDULED' and new.status = 'IN_PROGRESS'
    and old.assigned_technician_id = (select auth.uid())
    and private.get_current_role() = 'TECHNICIAN'
    and new.repair_notes is null and new.parts_used is null and new.repair_completed_at is null
    and new.verification_notes is null and new.verified_at is null and new.verified_by is null then
    null;
  elsif old.status = 'IN_PROGRESS' and new.status = 'REPAIR_SUBMITTED'
    and old.assigned_technician_id = (select auth.uid())
    and private.get_current_role() = 'TECHNICIAN'
    and new.repair_notes is not null and length(btrim(new.repair_notes)) between 10 and 5000
    and (new.parts_used is null or length(btrim(new.parts_used)) <= 2000)
    and new.repair_completed_at is not null
    and new.verification_notes is null and new.verified_at is null and new.verified_by is null then
    null;
  elsif old.status = 'REPAIR_SUBMITTED' and new.status = 'VERIFIED'
    and private.is_admin_or_supervisor()
    and new.verified_by = (select auth.uid())
    and new.verified_at is not null
    and new.verification_notes is not null
    and length(btrim(new.verification_notes)) between 10 and 2000
    and new.repair_notes = old.repair_notes
    and new.parts_used is not distinct from old.parts_used
    and new.repair_completed_at = old.repair_completed_at then
    update public.findings
    set status = 'RESOLVED',
        resolved_at = coalesce(resolved_at, now()),
        resolved_by = coalesce(resolved_by, (select auth.uid()))
    where id = old.finding_id
      and organisation_id = old.organisation_id
      and status in ('OPEN', 'IN_PROGRESS');

    if not found and not exists (
      select 1 from public.findings
      where id = old.finding_id and organisation_id = old.organisation_id and status = 'RESOLVED'
    ) then
      raise exception 'Finding is not in a repairable state';
    end if;

    update public.findings
    set status = 'VERIFIED', verified_at = now(), verified_by = (select auth.uid())
    where id = old.finding_id and organisation_id = old.organisation_id and status = 'RESOLVED';

    update public.findings
    set status = 'CLOSED'
    where id = old.finding_id and organisation_id = old.organisation_id and status = 'VERIFIED';
  else
    raise exception 'Invalid corrective work order transition';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create trigger corrective_work_order_transition_guard
before update on public.corrective_work_orders
for each row execute function public.guard_corrective_work_order_transition();
revoke all on function public.guard_corrective_work_order_transition() from public, anon, authenticated;

create or replace function public.audit_corrective_work_order_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.audit_logs (
    organisation_id, actor_id, action, entity_type, entity_id, before_data, after_data
  ) values (
    new.organisation_id,
    (select auth.uid()),
    case new.status
      when 'IN_PROGRESS' then 'CORRECTIVE_WORK_ORDER_STARTED'
      when 'REPAIR_SUBMITTED' then 'CORRECTIVE_REPAIR_SUBMITTED'
      when 'VERIFIED' then 'CORRECTIVE_REPAIR_VERIFIED'
      else 'CORRECTIVE_WORK_ORDER_UPDATED'
    end,
    'CORRECTIVE_WORK_ORDER',
    new.id,
    jsonb_build_object('status', old.status),
    jsonb_build_object(
      'status', new.status,
      'repair_notes', new.repair_notes,
      'parts_used', new.parts_used,
      'repair_completed_at', new.repair_completed_at,
      'verification_notes', new.verification_notes,
      'verified_at', new.verified_at,
      'verified_by', new.verified_by
    )
  );
  return new;
end;
$$;
revoke all on function public.audit_corrective_work_order_update() from public, anon, authenticated;

create trigger corrective_work_order_update_audit
after update on public.corrective_work_orders
for each row execute function public.audit_corrective_work_order_update();

create policy corrective_work_orders_technician_update
on public.corrective_work_orders
for update to authenticated
using (
  organisation_id = private.get_current_organisation_id()
  and private.get_current_role() = 'TECHNICIAN'
  and assigned_technician_id = (select auth.uid())
  and status in ('SCHEDULED', 'IN_PROGRESS')
)
with check (
  organisation_id = private.get_current_organisation_id()
  and private.get_current_role() = 'TECHNICIAN'
  and assigned_technician_id = (select auth.uid())
  and status in ('IN_PROGRESS', 'REPAIR_SUBMITTED')
);

create policy corrective_work_orders_management_verify
on public.corrective_work_orders
for update to authenticated
using (
  organisation_id = private.get_current_organisation_id()
  and private.is_admin_or_supervisor()
  and status = 'REPAIR_SUBMITTED'
)
with check (
  organisation_id = private.get_current_organisation_id()
  and private.is_admin_or_supervisor()
  and status = 'VERIFIED'
  and verified_by = (select auth.uid())
);

create policy corrective_work_orders_client_issued_select
on public.corrective_work_orders
for select to authenticated
using (
  organisation_id = private.get_current_organisation_id()
  and private.get_current_role() = 'CLIENT'
  and status = 'VERIFIED'
  and exists (
    select 1
    from public.findings f
    join public.maintenance_jobs j on j.id = f.job_id
    join public.reports r on r.job_id = j.id
    where f.id = corrective_work_orders.finding_id
      and f.organisation_id = corrective_work_orders.organisation_id
      and j.client_id = (select client_id from public.profiles where id = auth.uid())
      and r.status = 'ISSUED'
  )
);

grant update (status, repair_notes, parts_used, repair_completed_at, verification_notes, verified_at, verified_by)
on public.corrective_work_orders to authenticated;
