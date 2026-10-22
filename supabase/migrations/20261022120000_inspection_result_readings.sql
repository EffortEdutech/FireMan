-- Reading capture for trend reporting. Review before applying.
alter table public.inspection_results
  add column if not exists reading_unit text,
  add column if not exists value_standard numeric,
  add column if not exists semantic_key text,
  add column if not exists limit_status text
    check (limit_status in ('WITHIN_LIMIT','OUT_OF_LIMIT','NO_LIMIT'));

create index if not exists inspection_results_semantic_key_idx
  on public.inspection_results (organisation_id, semantic_key)
  where semantic_key is not null;
