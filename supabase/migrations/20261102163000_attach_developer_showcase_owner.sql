-- Attach the explicitly approved developer login to the developer-owned showcase tenant.
-- This is not a FAST customer account.

do $$
declare
  v_user_id uuid;
  v_org_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower('myeffort.studio@gmail.com')
  limit 1;

  select id into v_org_id
  from public.organisations
  where name = 'FireMaint Showcase'
  limit 1;

  if v_user_id is null then
    raise exception 'Approved developer login was not found';
  end if;
  if v_org_id is null then
    raise exception 'FireMaint Showcase organisation was not found';
  end if;

  insert into public.profiles (id, organisation_id, full_name, role, active)
  values (v_user_id, v_org_id, 'FireMaint Developer', 'OWNER', true)
  on conflict (id) do update set
    organisation_id = excluded.organisation_id,
    full_name = excluded.full_name,
    role = excluded.role,
    active = true;
end $$;

