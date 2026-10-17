-- Supports the organisation-scoped operational dashboard queues.
create index if not exists idx_jobs_org_status_date
on public.maintenance_jobs(organisation_id, status, scheduled_date);

create index if not exists idx_findings_org_status_severity
on public.findings(organisation_id, status, severity);

create index if not exists idx_reports_org_status_reviewed
on public.reports(organisation_id, status, reviewed_at);
