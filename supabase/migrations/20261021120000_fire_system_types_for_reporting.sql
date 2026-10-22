-- Additional system types so reports can be scoped per fire system.
-- Adds enum values only; no existing rows or policies change.
alter type public.system_type add value if not exists 'HYDRANT_RISER';
alter type public.system_type add value if not exists 'FIRE_PUMP';
alter type public.system_type add value if not exists 'GASEOUS_SUPPRESSION';
alter type public.system_type add value if not exists 'FOAM_SUPPRESSION';
alter type public.system_type add value if not exists 'PASSIVE_PROTECTION';
alter type public.system_type add value if not exists 'SMOKE_CONTROL';
