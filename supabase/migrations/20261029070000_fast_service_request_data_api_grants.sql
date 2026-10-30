-- FAST Goal 5: expose the request workflow to authenticated Supabase clients.
-- RLS policies remain the row-level authorization boundary; anon keeps no table access.
grant select, insert, update on table public.service_requests to authenticated;
grant select on table public.service_request_events, public.service_request_replies to authenticated;
grant insert on table public.service_request_replies to authenticated;
