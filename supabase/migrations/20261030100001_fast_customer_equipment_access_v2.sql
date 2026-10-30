+-- Goal 9C: customer-safe equipment access
create policy equipment_documents_client_select
on public.equipment_documents
for select
to authenticated
using (
  customer_visible = true
  and organisation_id = (select private.get_current_organisation_id())
  and exists (
    select 1
    from public.equipment e
    join public.buildings b on b.id = e.building_id and b.organisation_id = e.organisation_id
    join public.sites s on s.id = b.site_id and s.organisation_id = b.organisation_id
    where e.id = equipment_documents.equipment_id
      and e.organisation_id = equipment_documents.organisation_id
      and s.client_id = (select p.client_id from public.profiles p where p.id = auth.uid())
  )
);

drop policy if exists storage_read_org on storage.objects;
create policy storage_read_org
on storage.objects
for select
to authenticated
using (
  bucket_id in ('inspection-photos','report-pdfs','company-assets','documents')
  and (
    (
      bucket_id <> 'documents'
      and (storage.foldername(name))[1] = (select private.get_current_organisation_id())::text
    )
    or (
      bucket_id = 'documents'
      and (
        (select private.is_internal_user())
        or exists (
          select 1
          from public.equipment_documents d
          join public.equipment e on e.id = d.equipment_id and e.organisation_id = d.organisation_id
          join public.buildings b on b.id = e.building_id and b.organisation_id = e.organisation_id
          join public.sites s on s.id = b.site_id and s.organisation_id = b.organisation_id
          where d.customer_visible = true
            and d.storage_path = storage.objects.name
            and d.organisation_id = (select private.get_current_organisation_id())
            and s.client_id = (select p.client_id from public.profiles p where p.id = auth.uid())
        )
      )
    )
  )
);
