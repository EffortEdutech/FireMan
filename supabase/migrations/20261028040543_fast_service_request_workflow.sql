-- General service requests are separate from finding-linked corrective quote requests.
alter table public.organisations
  add column public_request_enabled boolean not null default false;

create unique index organisations_one_public_request_tenant_idx
  on public.organisations (public_request_enabled) where public_request_enabled;

grant update (public_request_enabled) on public.organisations to authenticated;
grant select (public_request_enabled) on public.organisations to authenticated;

create policy organisations_manage_public_requests
on public.organisations
for update
to authenticated
using (
  id = (select private.get_current_organisation_id())
  and (select private.is_admin_or_supervisor())
)
with check (
  id = (select private.get_current_organisation_id())
  and (select private.is_admin_or_supervisor())
);

create or replace function private.get_public_request_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.organisations where public_request_enabled and active limit 1
$$;

revoke all on function private.get_public_request_organisation_id() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.get_public_request_organisation_id() to authenticated;

create or replace function private.is_current_email_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and lower(u.email) = lower((select auth.jwt() ->> 'email'))
  )
$$;

revoke all on function private.is_current_email_verified() from public, anon;
grant execute on function private.is_current_email_verified() to authenticated;

create or replace function public.is_public_request_intake_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.organisations where public_request_enabled and active)
$$;

revoke all on function public.is_public_request_intake_enabled() from public;
grant execute on function public.is_public_request_intake_enabled() to anon, authenticated;

create type public.service_request_category as enum (
  'REACTIVE_ISSUE', 'PLANNED_SERVICE', 'INSPECTION', 'FINDING_FOLLOW_UP', 'QUOTATION', 'OTHER'
);

create type public.service_request_urgency as enum ('ROUTINE', 'PRIORITY', 'URGENT');

create type public.service_request_status as enum (
  'NEW', 'TRIAGE', 'NEEDS_CUSTOMER_INFO', 'SITE_VISIT_TO_ARRANGE',
  'QUOTE_PREPARATION', 'READY_TO_SCHEDULE', 'AWAITING_CUSTOMER_DECISION',
  'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED',
  'DECLINED', 'CANCELLED', 'UNABLE_TO_PROCEED', 'CLOSED_WITHOUT_WORK'
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete restrict,
  site_id uuid references public.sites(id) on delete restrict,
  request_reference text not null unique default (
    'SR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  created_by uuid references public.profiles(id) on delete set null,
  requester_user_id uuid references auth.users(id) on delete set null,
  requester_email text not null check (length(btrim(requester_email)) between 3 and 320),
  requester_name text not null check (length(btrim(requester_name)) between 2 and 160),
  requester_company text check (requester_company is null or length(requester_company) <= 200),
  requester_phone text check (requester_phone is null or length(requester_phone) <= 40),
  site_description text check (site_description is null or length(site_description) <= 500),
  category public.service_request_category not null,
  urgency public.service_request_urgency not null default 'ROUTINE',
  title text not null check (length(btrim(title)) between 3 and 160),
  details text not null check (length(btrim(details)) between 10 and 5000),
  affected_asset text check (affected_asset is null or length(affected_asset) <= 160),
  preferred_access_window text check (preferred_access_window is null or length(preferred_access_window) <= 300),
  onsite_contact text check (onsite_contact is null or length(onsite_contact) <= 160),
  reference_note text check (reference_note is null or length(reference_note) <= 160),
  status public.service_request_status not null default 'NEW',
  customer_message text not null default 'Your request has been received.',
  next_action_owner text not null default 'FAST team',
  next_action text not null default 'FAST will review your request and provide an update.',
  hold_reason text,
  appointment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_requests_message_length check (length(customer_message) <= 1000),
  constraint service_requests_next_action_length check (length(next_action) between 1 and 500),
  constraint service_requests_hold_reason_length check (hold_reason is null or length(hold_reason) <= 500)
);

create index service_requests_org_status_updated_idx
  on public.service_requests (organisation_id, status, updated_at desc);
create index service_requests_client_created_idx
  on public.service_requests (client_id, created_at desc);
create index service_requests_site_idx on public.service_requests (site_id);
create index service_requests_requester_created_idx on public.service_requests (requester_user_id, created_at desc);

create table public.service_request_events (
  id bigint generated always as identity primary key,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('SUBMITTED', 'STATUS_CHANGED', 'CUSTOMER_UPDATE')),
  from_status public.service_request_status,
  to_status public.service_request_status not null,
  message text not null check (length(btrim(message)) between 1 and 1000),
  next_action_owner text not null,
  next_action text not null,
  hold_reason text,
  appointment_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.service_request_replies (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_type text not null check (sender_type in ('CUSTOMER', 'FAST')),
  message text not null check (length(btrim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index service_request_events_request_created_idx
  on public.service_request_events (service_request_id, created_at asc);

alter table public.service_requests enable row level security;
alter table public.service_request_events enable row level security;
alter table public.service_request_replies enable row level security;

revoke all on public.service_requests, public.service_request_events, public.service_request_replies from public, anon, authenticated;
grant select (
  id, organisation_id, client_id, site_id, requester_user_id, request_reference, created_at, updated_at, requester_email,
  requester_name, requester_company, requester_phone, site_description,
  category, urgency, title, details, affected_asset, preferred_access_window,
  onsite_contact, reference_note, status, customer_message, next_action_owner,
  next_action, hold_reason, appointment_at
) on public.service_requests to authenticated;
grant insert (
  organisation_id, client_id, site_id, created_by, requester_user_id, requester_email,
  requester_name, requester_company, requester_phone, site_description, category, urgency, title, details,
  affected_asset, preferred_access_window, onsite_contact, reference_note
) on public.service_requests to authenticated;
grant update (
  client_id, site_id, status, customer_message, next_action_owner, next_action, hold_reason, appointment_at
) on public.service_requests to authenticated;
grant select (
  id, organisation_id, service_request_id, event_type, from_status, to_status,
  message, next_action_owner, next_action, hold_reason, appointment_at, created_at
) on public.service_request_events to authenticated;
grant select (id, organisation_id, service_request_id, sender_user_id, sender_type, message, created_at)
  on public.service_request_replies to authenticated;
grant insert (organisation_id, service_request_id, sender_user_id, sender_type, message)
  on public.service_request_replies to authenticated;
grant all on public.service_requests, public.service_request_events to service_role;
grant all on public.service_request_replies to service_role;

create policy service_requests_internal_select on public.service_requests
  for select to authenticated
  using (
    organisation_id = (select private.get_current_organisation_id())
    and (select private.is_internal_user())
  );

create policy service_requests_client_select on public.service_requests
  for select to authenticated
  using (
    organisation_id = (select private.get_current_organisation_id())
    and client_id = (select p.client_id from public.profiles p where p.id = (select auth.uid()))
    and (select private.get_current_role()) = 'CLIENT'
  );

create policy service_requests_requester_select on public.service_requests
  for select to authenticated
  using (
    requester_user_id = (select auth.uid())
    and lower(requester_email) = lower((select auth.jwt() ->> 'email'))
    and (select private.is_current_email_verified())
  );

create policy service_requests_client_insert on public.service_requests
  for insert to authenticated
  with check (
    organisation_id = (select private.get_current_organisation_id())
    and client_id = (select p.client_id from public.profiles p where p.id = (select auth.uid()))
    and created_by = (select auth.uid())
    and status = 'NEW'
    and customer_message = 'Your request has been received.'
    and next_action_owner = 'FAST team'
    and appointment_at is null
    and hold_reason is null
    and (select private.get_current_role()) = 'CLIENT'
    and exists (
      select 1 from public.sites s
      where s.id = service_requests.site_id
        and s.organisation_id = service_requests.organisation_id
        and s.client_id = service_requests.client_id
        and s.active = true
    )
  );

create policy service_requests_verified_requester_insert on public.service_requests
  for insert to authenticated
  with check (
    organisation_id = (select private.get_public_request_organisation_id())
    and client_id is null
    and site_id is null
    and created_by is null
    and requester_user_id = (select auth.uid())
    and lower(requester_email) = lower((select auth.jwt() ->> 'email'))
    and (select private.is_current_email_verified())
    and status = 'NEW'
    and customer_message = 'Your request has been received.'
    and next_action_owner = 'FAST team'
    and appointment_at is null
    and hold_reason is null
  );

create policy service_requests_internal_update on public.service_requests
  for update to authenticated
  using (
    organisation_id = (select private.get_current_organisation_id())
    and (select private.is_admin_or_supervisor())
  )
  with check (
    organisation_id = (select private.get_current_organisation_id())
    and (select private.is_admin_or_supervisor())
  );

create policy service_request_events_internal_select on public.service_request_events
  for select to authenticated
  using (
    organisation_id = (select private.get_current_organisation_id())
    and (select private.is_internal_user())
  );

create policy service_request_events_requester_select on public.service_request_events
  for select to authenticated
  using (
    exists (
      select 1 from public.service_requests r
      where r.id = service_request_events.service_request_id
        and r.organisation_id = service_request_events.organisation_id
        and r.requester_user_id = (select auth.uid())
        and lower(r.requester_email) = lower((select auth.jwt() ->> 'email'))
        and (select private.is_current_email_verified())
    )
  );

create policy service_request_events_client_select on public.service_request_events
  for select to authenticated
  using (
    organisation_id = (select private.get_current_organisation_id())
    and (select private.get_current_role()) = 'CLIENT'
    and exists (
      select 1 from public.service_requests r
      where r.id = service_request_events.service_request_id
        and r.organisation_id = service_request_events.organisation_id
        and r.client_id = (select p.client_id from public.profiles p where p.id = (select auth.uid()))
    )
  );

create policy service_request_replies_internal_select on public.service_request_replies
  for select to authenticated
  using (
    organisation_id = (select private.get_current_organisation_id())
    and (select private.is_internal_user())
  );

create policy service_request_replies_requester_select on public.service_request_replies
  for select to authenticated
  using (
    exists (
      select 1 from public.service_requests r
      where r.id = service_request_replies.service_request_id
        and r.organisation_id = service_request_replies.organisation_id
        and r.requester_user_id = (select auth.uid())
        and lower(r.requester_email) = lower((select auth.jwt() ->> 'email'))
        and (select private.is_current_email_verified())
    )
  );

create policy service_request_replies_client_select on public.service_request_replies
  for select to authenticated
  using (
    organisation_id = (select private.get_current_organisation_id())
    and (select private.get_current_role()) = 'CLIENT'
    and exists (
      select 1 from public.service_requests r
      where r.id = service_request_replies.service_request_id
        and r.organisation_id = service_request_replies.organisation_id
        and r.client_id = (select p.client_id from public.profiles p where p.id = (select auth.uid()))
    )
  );

create policy service_request_replies_customer_insert on public.service_request_replies
  for insert to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and sender_type = 'CUSTOMER'
    and exists (
      select 1 from public.service_requests r
      where r.id = service_request_replies.service_request_id
        and r.organisation_id = service_request_replies.organisation_id
        and (
          (r.requester_user_id = (select auth.uid())
            and lower(r.requester_email) = lower((select auth.jwt() ->> 'email'))
            and (select private.is_current_email_verified()))
          or (
            (select private.get_current_role()) = 'CLIENT'
            and service_request_replies.organisation_id = (select private.get_current_organisation_id())
            and r.client_id = (select p.client_id from public.profiles p where p.id = (select auth.uid()))
          )
        )
    )
  );

create policy service_request_replies_internal_insert on public.service_request_replies
  for insert to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and sender_type = 'FAST'
    and organisation_id = (select private.get_current_organisation_id())
    and (select private.is_admin_or_supervisor())
    and exists (
      select 1 from public.service_requests r
      where r.id = service_request_replies.service_request_id
        and r.organisation_id = service_request_replies.organisation_id
    )
  );

create or replace function public.create_public_service_request(
  p_requester_name text,
  p_requester_company text,
  p_requester_phone text,
  p_site_description text,
  p_category public.service_request_category,
  p_urgency public.service_request_urgency,
  p_title text,
  p_details text,
  p_affected_asset text,
  p_preferred_access_window text,
  p_onsite_contact text,
  p_reference_note text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_organisation_id uuid := private.get_public_request_organisation_id();
  v_email text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null or v_email is null or v_organisation_id is null
    or not private.is_current_email_verified() then
    raise exception 'Verified email and an enabled FAST request portal are required'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if (
    select count(*) from public.service_requests r
    where r.requester_user_id = auth.uid()
      and r.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Request submission limit reached; try again later'
      using errcode = '22023';
  end if;

  insert into public.service_requests (
    organisation_id, requester_user_id, requester_email, requester_name, requester_company,
    requester_phone, site_description, category, urgency, title, details, affected_asset,
    preferred_access_window, onsite_contact, reference_note
  ) values (
    v_organisation_id, auth.uid(), lower(v_email), p_requester_name, p_requester_company,
    p_requester_phone, p_site_description, p_category, p_urgency, p_title, p_details,
    p_affected_asset, p_preferred_access_window, p_onsite_contact, p_reference_note
  ) returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.create_public_service_request(text, text, text, text, public.service_request_category, public.service_request_urgency, text, text, text, text, text, text) from public, anon;
grant execute on function public.create_public_service_request(text, text, text, text, public.service_request_category, public.service_request_urgency, text, text, text, text, text, text) to authenticated;

create or replace function public.reply_to_service_request(p_service_request_id uuid, p_message text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reply_id uuid;
begin
  if auth.uid() is null or nullif(btrim(p_message), '') is null or length(p_message) > 2000 then
    raise exception 'An authenticated user and a message of at most 2000 characters are required'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('reply:' || auth.uid()::text, 0));
  if (
    select count(*) from public.service_request_replies r
    where r.sender_user_id = auth.uid()
      and r.created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'Reply limit reached; try again later' using errcode = '22023';
  end if;

  insert into public.service_request_replies (
    organisation_id, service_request_id, sender_user_id, sender_type, message
  )
  select r.organisation_id, r.id, auth.uid(),
    case when private.is_internal_user() then 'FAST' else 'CUSTOMER' end,
    btrim(p_message)
  from public.service_requests r
  where r.id = p_service_request_id
  returning id into v_reply_id;

  if v_reply_id is null then
    raise exception 'Request not found or access denied' using errcode = '42501';
  end if;

  return v_reply_id;
end;
$$;

revoke all on function public.reply_to_service_request(uuid, text) from public, anon;
grant execute on function public.reply_to_service_request(uuid, text) to authenticated;

create or replace function public.touch_service_request_after_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.service_requests set updated_at = now() where id = new.service_request_id;
  return new;
end;
$$;

revoke all on function public.touch_service_request_after_reply() from public, anon, authenticated;
create trigger service_request_reply_touch
after insert on public.service_request_replies
for each row execute function public.touch_service_request_after_reply();

create or replace function public.guard_service_request_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organisation_id is distinct from old.organisation_id
    or new.created_by is distinct from old.created_by
    or new.requester_user_id is distinct from old.requester_user_id
    or new.requester_email is distinct from old.requester_email
    or new.requester_name is distinct from old.requester_name
    or new.requester_company is distinct from old.requester_company
    or new.requester_phone is distinct from old.requester_phone
    or new.site_description is distinct from old.site_description
    or new.request_reference is distinct from old.request_reference
    or new.category is distinct from old.category
    or new.urgency is distinct from old.urgency
    or new.title is distinct from old.title
    or new.details is distinct from old.details
    or new.affected_asset is distinct from old.affected_asset
    or new.preferred_access_window is distinct from old.preferred_access_window
    or new.onsite_contact is distinct from old.onsite_contact
    or new.reference_note is distinct from old.reference_note then
    raise exception 'Service request intake details are immutable after submission'
      using errcode = '23514';
  end if;

  if (old.client_id is not null and new.client_id is distinct from old.client_id)
    or (old.site_id is not null and new.site_id is distinct from old.site_id) then
    raise exception 'A linked client or site cannot be replaced'
      using errcode = '23514';
  end if;

  if (new.client_id is null and new.site_id is not null)
    or (new.client_id is not null and new.site_id is null) then
    raise exception 'Client and site must be linked together'
      using errcode = '23514';
  end if;

  if new.client_id is not null and not exists (
    select 1 from public.clients c join public.sites s on s.client_id = c.id
    where c.id = new.client_id and s.id = new.site_id
      and c.organisation_id = new.organisation_id and s.organisation_id = new.organisation_id
  ) then
    raise exception 'The selected client and site do not belong to this organisation'
      using errcode = '23514';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'NEW' and new.status in ('TRIAGE', 'CANCELLED', 'UNABLE_TO_PROCEED'))
    or (old.status = 'TRIAGE' and new.status in ('NEEDS_CUSTOMER_INFO', 'SITE_VISIT_TO_ARRANGE', 'QUOTE_PREPARATION', 'READY_TO_SCHEDULE', 'SCHEDULED', 'CANCELLED', 'UNABLE_TO_PROCEED'))
    or (old.status = 'NEEDS_CUSTOMER_INFO' and new.status in ('TRIAGE', 'SITE_VISIT_TO_ARRANGE', 'QUOTE_PREPARATION', 'READY_TO_SCHEDULE', 'CANCELLED', 'UNABLE_TO_PROCEED'))
    or (old.status = 'SITE_VISIT_TO_ARRANGE' and new.status in ('TRIAGE', 'QUOTE_PREPARATION', 'READY_TO_SCHEDULE', 'CANCELLED', 'UNABLE_TO_PROCEED'))
    or (old.status = 'QUOTE_PREPARATION' and new.status in ('AWAITING_CUSTOMER_DECISION', 'READY_TO_SCHEDULE', 'CLOSED_WITHOUT_WORK', 'CANCELLED', 'UNABLE_TO_PROCEED'))
    or (old.status = 'AWAITING_CUSTOMER_DECISION' and new.status in ('APPROVED', 'DECLINED', 'QUOTE_PREPARATION', 'CANCELLED'))
    or (old.status = 'APPROVED' and new.status in ('READY_TO_SCHEDULE', 'SCHEDULED', 'CANCELLED'))
    or (old.status = 'READY_TO_SCHEDULE' and new.status in ('SCHEDULED', 'IN_PROGRESS', 'CANCELLED', 'UNABLE_TO_PROCEED'))
    or (old.status = 'SCHEDULED' and new.status in ('IN_PROGRESS', 'CANCELLED', 'UNABLE_TO_PROCEED'))
    or (old.status = 'IN_PROGRESS' and new.status in ('COMPLETED', 'UNABLE_TO_PROCEED'))
    or (old.status = 'COMPLETED' and new.status = 'CLOSED')
    or (old.status = 'DECLINED' and new.status = 'CLOSED')
    or (old.status in ('CANCELLED', 'UNABLE_TO_PROCEED', 'CLOSED_WITHOUT_WORK') and new.status = 'CLOSED')
  ) then
    raise exception 'Invalid service request status transition: % to %', old.status, new.status
      using errcode = '23514';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.guard_service_request_update() from public, anon, authenticated;
create trigger service_request_update_guard
before update on public.service_requests
for each row execute function public.guard_service_request_update();

create or replace function public.record_service_request_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.service_request_events (
    organisation_id, service_request_id, actor_id, event_type, from_status, to_status, message,
    next_action_owner, next_action, hold_reason, appointment_at
  ) values (
    new.organisation_id,
    new.id,
    case when exists (select 1 from public.profiles p where p.id = (select auth.uid()))
      then (select auth.uid()) else null end,
    case when tg_op = 'INSERT' then 'SUBMITTED'
         when new.status is distinct from old.status then 'STATUS_CHANGED'
         else 'CUSTOMER_UPDATE' end,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    case when tg_op = 'INSERT' then 'Your request has been received.' else new.customer_message end,
    new.next_action_owner,
    new.next_action,
    new.hold_reason,
    new.appointment_at
  );
  return new;
end;
$$;

revoke all on function public.record_service_request_event() from public, anon, authenticated;
create trigger service_request_created_event
after insert on public.service_requests
for each row execute function public.record_service_request_event();
create trigger service_request_updated_event
after update of status, customer_message, next_action_owner, next_action, hold_reason, appointment_at on public.service_requests
for each row
when (
  new.status is distinct from old.status
  or new.customer_message is distinct from old.customer_message
  or new.next_action_owner is distinct from old.next_action_owner
  or new.next_action is distinct from old.next_action
  or new.hold_reason is distinct from old.hold_reason
  or new.appointment_at is distinct from old.appointment_at
)
execute function public.record_service_request_event();

