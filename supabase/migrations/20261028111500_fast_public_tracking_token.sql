-- Public tracking uses a dedicated Edge Function. Keep the base tables private.
alter table public.service_requests
  add column if not exists public_tracking_token text;

update public.service_requests
set public_tracking_token = lower(encode(gen_random_bytes(12), 'hex'))
where public_tracking_token is null;

alter table public.service_requests
  alter column public_tracking_token set default lower(encode(gen_random_bytes(12), 'hex')),
  alter column public_tracking_token set not null;

create unique index if not exists service_requests_public_tracking_token_idx
  on public.service_requests (public_tracking_token);
