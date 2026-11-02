-- Global FireMaint catalogue rows are product data and must be available to
-- customer-facing users in every tenant. Tenant-owned asset rows remain
-- restricted to the customer's own client/site relationship.

create policy equipment_types_client_global_catalogue_v2
on public.equipment_types
for select
to authenticated
using (
  private.get_current_role() = 'CLIENT'
  and organisation_id is null
);

