create policy client_issued_report_finding_photos_select
on public.finding_photos
for select
using (
  organisation_id = private.get_current_organisation_id()
  and private.get_current_role() = 'CLIENT'
  and exists (
    select 1
    from public.findings f
    join public.maintenance_jobs j on j.id = f.job_id
    join public.reports r on r.job_id = j.id
    where f.id = finding_photos.finding_id
      and r.status = 'ISSUED'
      and j.client_id = (
        select p.client_id
        from public.profiles p
        where p.id = (select auth.uid())
      )
  )
);
