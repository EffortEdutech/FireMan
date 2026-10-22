create or replace function private.corrective_work_order_photo_limit_available(p_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and private.get_current_role() = 'TECHNICIAN'
    and exists (
      select 1
      from public.corrective_work_orders cwo
      where cwo.id = p_work_order_id
        and cwo.organisation_id = private.get_current_organisation_id()
        and cwo.assigned_technician_id = (select auth.uid())
        and cwo.status = 'IN_PROGRESS'
        and (
          select count(*) < 4
          from public.corrective_work_order_photos p
          where p.corrective_work_order_id = cwo.id
        )
    );
$$;

revoke all on function private.corrective_work_order_photo_limit_available(uuid) from public, anon;
grant execute on function private.corrective_work_order_photo_limit_available(uuid) to authenticated;

create or replace function public.guard_corrective_work_order_photo_count()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.corrective_work_order_id::text, 0));
  if not private.corrective_work_order_photo_limit_available(new.corrective_work_order_id) then
    raise exception 'Corrective work orders are limited to four repair photos';
  end if;
  return new;
end;
$$;

drop policy corrective_work_order_photos_technician_insert
on public.corrective_work_order_photos;

create policy corrective_work_order_photos_technician_insert
on public.corrective_work_order_photos
for insert to authenticated
with check (
  organisation_id = private.get_current_organisation_id()
  and uploaded_by = (select auth.uid())
  and private.get_current_role() = 'TECHNICIAN'
  and exists (
    select 1
    from public.corrective_work_orders cwo
    where cwo.id = corrective_work_order_photos.corrective_work_order_id
      and cwo.finding_id = corrective_work_order_photos.finding_id
      and cwo.organisation_id = corrective_work_order_photos.organisation_id
      and cwo.assigned_technician_id = (select auth.uid())
      and cwo.status = 'IN_PROGRESS'
  )
  and private.corrective_work_order_photo_limit_available(corrective_work_order_id)
);

drop policy corrective_repair_photos_storage_insert on storage.objects;

create policy corrective_repair_photos_storage_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'corrective-repair-photos'
  and (storage.foldername(name))[1] = private.get_current_organisation_id()::text
  and (storage.foldername(name))[2] = 'corrective-work-orders'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.corrective_work_orders cwo
    where cwo.id = case
        when (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then ((storage.foldername(name))[3])::uuid
        else null
      end
      and cwo.organisation_id = private.get_current_organisation_id()
      and cwo.assigned_technician_id = (select auth.uid())
      and cwo.status = 'IN_PROGRESS'
      and private.corrective_work_order_photo_limit_available(cwo.id)
  )
);
