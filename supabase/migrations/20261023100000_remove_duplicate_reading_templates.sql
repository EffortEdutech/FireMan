-- Removes empty, unused duplicate shared reading templates created by the first run of
-- 20261022120100 (NULL organisation_id never conflicts, so re-runs inserted copies).
-- Keeps the oldest template per code that has items; deletes only empty, unused copies.
delete from public.inspection_templates t
where t.organisation_id is null
  and t.code like '%-READINGS'
  and not exists (select 1 from public.inspection_template_items x where x.template_id = t.id)
  and not exists (select 1 from public.inspections i where i.template_id = t.id);
