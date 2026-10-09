-- Weekly alerts/follows email digest.
-- Already applied to prod: extensions pg_cron + pg_net, profiles.digest_opt_out, profiles.last_digest_at.
-- NOT yet applied: the schedule below. Run it once in the Supabase SQL editor after:
--   1. CRON_SECRET is set in the hosting env (same value as .env.local), and
--   2. the app with /api/digest is deployed.
-- Replace <CRON_SECRET>. Fires Fridays 04:00 UTC (10:00 Dhaka).

alter table public.profiles add column if not exists digest_opt_out boolean not null default false;
alter table public.profiles add column if not exists last_digest_at timestamptz;

select cron.schedule(
  'weekly-digest',
  '0 4 * * 5',
  $$
  select net.http_post(
    url := 'https://www.cloudperfumebd.com/api/digest',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- To stop it:  select cron.unschedule('weekly-digest');
