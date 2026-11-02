-- Goal 22: add explicit system families for dry-chemical suppression and
-- fire-water supply assets. These values are used by the following seed
-- migration after this enum alteration has committed.
alter type public.system_type add value if not exists 'DRY_CHEMICAL';
alter type public.system_type add value if not exists 'FIRE_WATER_SUPPLY';

