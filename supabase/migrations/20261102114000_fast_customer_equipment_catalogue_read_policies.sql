-- Goal 22: expose only customer-safe catalogue metadata through RLS.
-- Equipment type fields are filtered again in the customer page, but the
-- database must enforce the same boundary for every client query path.

drop policy if exists equipment_types_client_select on public.equipment_types;
create policy equipment_types_client_select on public.equipment_types
for select
using (
  private.get_current_role() = 'CLIENT'::public.app_role
  and (organisation_id is null or organisation_id = private.get_current_organisation_id())
  and (
    organisation_id is null
    or exists (
      select 1
      from public.equipment e
      join public.buildings b on b.id = e.building_id and b.organisation_id = e.organisation_id
      join public.sites s on s.id = b.site_id and s.organisation_id = b.organisation_id
      where e.equipment_type_id = equipment_types.id
        and e.organisation_id = equipment_types.organisation_id
        and s.client_id = (select p.client_id from public.profiles p where p.id = auth.uid())
    )
  )
);

drop policy if exists equipment_type_fields_client_select on public.equipment_type_fields;
create policy equipment_type_fields_client_select on public.equipment_type_fields
for select
using (
  private.get_current_role() = 'CLIENT'::public.app_role
  and customer_visible = true
  and (organisation_id is null or organisation_id = private.get_current_organisation_id())
  and exists (
    select 1
    from public.equipment_types et
    where et.id = equipment_type_fields.equipment_type_id
      and (et.organisation_id is null or et.organisation_id = private.get_current_organisation_id())
  )
);

