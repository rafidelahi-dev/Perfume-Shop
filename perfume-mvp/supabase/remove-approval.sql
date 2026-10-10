-- Applied to prod 2026-10-09 (migration remove_approval_and_price_history).
-- 1. New accounts are active immediately. Admins still flag/ban after the fact.
-- 2. Price history dropped: never populated for real listings (listings use perfume_score ids,
--    price_history keyed on the perfumes directory) and too little data to be useful.
--    Supersedes the record_price_history fix at the end of engagement-features.sql
--    and the price_history objects in perfume-profile-depth.sql.
-- The listings_insert_owner policy is unchanged: it requires profiles.status = 'active',
-- which now blocks only flagged/banned users.

UPDATE public.profiles SET status = 'active' WHERE status = 'pending';
ALTER TABLE public.profiles DROP CONSTRAINT profiles_status_values;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_values
  CHECK (status = ANY (ARRAY['active','flagged','banned']));
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'active';

DROP TRIGGER IF EXISTS trg_record_price_history_insert ON public.listings;
DROP TRIGGER IF EXISTS trg_record_price_history_update ON public.listings;
DROP FUNCTION IF EXISTS public.record_price_history();
DROP FUNCTION IF EXISTS public.get_perfume_price_history(uuid);
DROP TABLE IF EXISTS public.price_history;
