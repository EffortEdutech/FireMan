-- Customer-facing timeline and replies are explicitly marked public by FAST staff.
alter table public.service_requests
  add column if not exists public_update_visible boolean not null default false;
grant update (public_update_visible) on public.service_requests to authenticated;

alter table public.service_request_events
  add column if not exists public_visible boolean not null default false;

alter table public.service_request_replies
  add column if not exists public_visible boolean not null default false;

create index if not exists service_request_events_public_visible_idx
  on public.service_request_events (service_request_id, public_visible, created_at asc);

create index if not exists service_request_replies_public_visible_idx
  on public.service_request_replies (service_request_id, public_visible, created_at asc);

-- The request trigger records whether the staff update was deliberately published.
create or replace function public.record_service_request_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.service_request_events (
    organisation_id, service_request_id, actor_id, event_type, from_status, to_status, message,
    next_action_owner, next_action, hold_reason, appointment_at, public_visible
  ) values (
    new.organisation_id, new.id,
    case when exists (select 1 from public.profiles p where p.id = (select auth.uid())) then (select auth.uid()) else null end,
    case when tg_op = 'INSERT' then 'SUBMITTED' when new.status is distinct from old.status then 'STATUS_CHANGED' else 'CUSTOMER_UPDATE' end,
    case when tg_op = 'INSERT' then null else old.status end, new.status,
    case when tg_op = 'INSERT' then 'Your request has been received.' else new.customer_message end,
    new.next_action_owner, new.next_action, new.hold_reason, new.appointment_at, new.public_update_visible
  );
  return new;
end;
$$;

create or replace function public.reply_to_service_request_public(p_service_request_id uuid, p_message text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare v_reply_id uuid;
begin
  if auth.uid() is null or nullif(btrim(p_message), '') is null or length(p_message) > 2000 or not private.is_admin_or_supervisor() then
    raise exception 'An authenticated user and a message of at most 2000 characters are required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('reply:' || auth.uid()::text, 0));
  if (select count(*) from public.service_request_replies r where r.sender_user_id = auth.uid() and r.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Reply limit reached; try again later' using errcode = '22023';
  end if;
  insert into public.service_request_replies (organisation_id, service_request_id, sender_user_id, sender_type, message, public_visible)
  select r.organisation_id, r.id, auth.uid(), 'FAST', btrim(p_message), true
  from public.service_requests r where r.id = p_service_request_id returning id into v_reply_id;
  if v_reply_id is null then raise exception 'Request not found or access denied' using errcode = '42501'; end if;
  return v_reply_id;
end;
$$;

revoke all on function public.reply_to_service_request_public(uuid, text) from public, anon;
grant execute on function public.reply_to_service_request_public(uuid, text) to authenticated;

