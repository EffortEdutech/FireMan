alter table public.notifications
  add column if not exists dedupe_key text;

create unique index if not exists idx_notifications_dedupe
on public.notifications(organisation_id, recipient_id, dedupe_key)
where dedupe_key is not null;

create or replace function public.create_internal_notification(
  p_recipient_id uuid,
  p_title text,
  p_message text,
  p_notification_type text,
  p_dedupe_key text,
  p_entity_type text default null,
  p_entity_id uuid default null
)
returns public.notifications
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid := private.get_current_organisation_id();
  v_notification public.notifications;
begin
  if v_org is null or not private.is_internal_user() then
    raise exception 'Only internal users can create management notifications';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_recipient_id
      and organisation_id = v_org
      and active = true
      and role in ('OWNER', 'ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  ) then
    raise exception 'Notification recipient is not an active internal user';
  end if;

  insert into public.notifications(
    organisation_id, recipient_id, title, message, notification_type,
    dedupe_key, entity_type, entity_id
  )
  values (
    v_org, p_recipient_id, p_title, p_message, p_notification_type,
    nullif(p_dedupe_key, ''), p_entity_type, p_entity_id
  )
  on conflict (organisation_id, recipient_id, dedupe_key)
    where dedupe_key is not null
  do update set
    title = excluded.title,
    message = excluded.message,
    notification_type = excluded.notification_type,
    entity_type = excluded.entity_type,
    entity_id = excluded.entity_id
  returning * into v_notification;

  return v_notification;
end $$;
