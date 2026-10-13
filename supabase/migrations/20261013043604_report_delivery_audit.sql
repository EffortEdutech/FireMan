create policy audit_internal_insert
on public.audit_logs
for insert
to authenticated
with check (
  organisation_id = private.get_current_organisation_id()
  and actor_id = auth.uid()
  and private.is_internal_user()
);
