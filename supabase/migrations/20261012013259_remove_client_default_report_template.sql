drop index if exists public.idx_clients_default_report_template;

alter table public.clients
drop column if exists default_report_template_id;
