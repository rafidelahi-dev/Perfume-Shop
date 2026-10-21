-- Day / night poll: a five-point spectrum from daytime to nighttime.
-- Applied via execute_sql on 2026-10-21. Mirrors lib/polls.ts ("timeofday").
INSERT INTO public.poll_options (dimension, option, kind, sort) VALUES
  ('timeofday', 'day',         'single', 1),
  ('timeofday', 'leans_day',   'single', 2),
  ('timeofday', 'anytime',     'single', 3),
  ('timeofday', 'leans_night', 'single', 4),
  ('timeofday', 'night',       'single', 5)
ON CONFLICT (dimension, option) DO NOTHING;
