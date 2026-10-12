alter table public.clients
add column default_report_template_id uuid references public.report_templates(id) on delete set null;

create index if not exists idx_clients_default_report_template
on public.clients(default_report_template_id);
