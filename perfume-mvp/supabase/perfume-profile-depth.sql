-- Perfume profile depth: note pyramid, accords, gender lean, verification flag,
-- and carried-over search terms on `perfumes`; nullable perfume_id FK on `reviews`;
-- a SECURITY DEFINER aggregate function so anonymous visitors can read review
-- counts without a public-read policy on `reviews` itself.

ALTER TABLE public.perfumes
  ADD COLUMN top_notes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN heart_notes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN base_notes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN accords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN search_terms text[] NOT NULL DEFAULT '{}',
  ADD COLUMN gender_lean text,
  ADD COLUMN house_description text,
  ADD COLUMN is_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.perfumes
  ADD CONSTRAINT perfumes_gender_lean_check
  CHECK (gender_lean IS NULL OR gender_lean = ANY (ARRAY[
    'very_masculine', 'masculine', 'unisex', 'feminine', 'very_feminine'
  ]));

CREATE INDEX idx_perfumes_accords ON public.perfumes USING gin (accords);

ALTER TABLE public.reviews
  ADD COLUMN perfume_id uuid REFERENCES public.perfumes(id) ON DELETE SET NULL;

CREATE INDEX idx_reviews_perfume_id ON public.reviews(perfume_id) WHERE perfume_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_perfume_review_aggregate(p_perfume_id uuid)
RETURNS TABLE (
  review_count bigint,
  longevity_counts jsonb,
  gender_counts jsonb,
  occasion_counts jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT count(*) FROM public.reviews WHERE perfume_id = p_perfume_id) AS review_count,
    (SELECT coalesce(jsonb_object_agg(longevity, cnt), '{}'::jsonb)
       FROM (
         SELECT longevity, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id AND longevity IS NOT NULL
         GROUP BY longevity
       ) s) AS longevity_counts,
    (SELECT coalesce(jsonb_object_agg(gender, cnt), '{}'::jsonb)
       FROM (
         SELECT gender, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id AND gender IS NOT NULL
         GROUP BY gender
       ) s) AS gender_counts,
    (SELECT coalesce(jsonb_object_agg(occasion, cnt), '{}'::jsonb)
       FROM (
         SELECT unnest(when_to_wear) occasion, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id
         GROUP BY occasion
       ) s) AS occasion_counts;
$$;

GRANT EXECUTE ON FUNCTION public.get_perfume_review_aggregate(uuid) TO anon, authenticated;

-- Numeric rating scale (love=5 ... hate=1), added to unlock schema.org
-- AggregateRating on the fragrance page. Table had 0 rows at migration time,
-- so the enum -> smallint switch needed no data backfill.
ALTER TABLE public.reviews DROP COLUMN rating;
ALTER TABLE public.reviews ADD COLUMN rating smallint CHECK (rating BETWEEN 1 AND 5);

DROP FUNCTION public.get_perfume_review_aggregate(uuid);

CREATE FUNCTION public.get_perfume_review_aggregate(p_perfume_id uuid)
RETURNS TABLE (
  review_count bigint,
  longevity_counts jsonb,
  gender_counts jsonb,
  occasion_counts jsonb,
  rating_avg numeric,
  rating_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT count(*) FROM public.reviews WHERE perfume_id = p_perfume_id) AS review_count,
    (SELECT coalesce(jsonb_object_agg(longevity, cnt), '{}'::jsonb)
       FROM (
         SELECT longevity, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id AND longevity IS NOT NULL
         GROUP BY longevity
       ) s) AS longevity_counts,
    (SELECT coalesce(jsonb_object_agg(gender, cnt), '{}'::jsonb)
       FROM (
         SELECT gender, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id AND gender IS NOT NULL
         GROUP BY gender
       ) s) AS gender_counts,
    (SELECT coalesce(jsonb_object_agg(occasion, cnt), '{}'::jsonb)
       FROM (
         SELECT unnest(when_to_wear) occasion, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id
         GROUP BY occasion
       ) s) AS occasion_counts,
    (SELECT avg(rating) FROM public.reviews WHERE perfume_id = p_perfume_id AND rating IS NOT NULL) AS rating_avg,
    (SELECT count(*) FROM public.reviews WHERE perfume_id = p_perfume_id AND rating IS NOT NULL) AS rating_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_perfume_review_aggregate(uuid) TO anon, authenticated;

-- BD climate + occasion aggregation. climate_season captures which BD
-- season (summer/monsoon/winter) the review's longevity/projection
-- applies to; environment captures AC office vs outdoors. when_to_wear
-- (see ReviewForm WEAR_OPTIONS) is repurposed to real BD occasions
-- (office/university/wedding/Jummah/date night/casual) instead of
-- Western seasons + Day/Night — no schema change needed for that part.
ALTER TABLE public.reviews
  ADD COLUMN climate_season text[] NOT NULL DEFAULT '{}',
  ADD COLUMN environment text;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_climate_season_check
  CHECK (climate_season <@ ARRAY['summer','monsoon','winter']::text[]);

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_environment_check
  CHECK (environment IS NULL OR environment = ANY (ARRAY['ac_office','outdoors','mixed']));

DROP FUNCTION public.get_perfume_review_aggregate(uuid);

CREATE FUNCTION public.get_perfume_review_aggregate(p_perfume_id uuid)
RETURNS TABLE (
  review_count bigint,
  longevity_counts jsonb,
  gender_counts jsonb,
  occasion_counts jsonb,
  rating_avg numeric,
  rating_count bigint,
  climate_counts jsonb,
  environment_counts jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT count(*) FROM public.reviews WHERE perfume_id = p_perfume_id) AS review_count,
    (SELECT coalesce(jsonb_object_agg(longevity, cnt), '{}'::jsonb)
       FROM (
         SELECT longevity, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id AND longevity IS NOT NULL
         GROUP BY longevity
       ) s) AS longevity_counts,
    (SELECT coalesce(jsonb_object_agg(gender, cnt), '{}'::jsonb)
       FROM (
         SELECT gender, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id AND gender IS NOT NULL
         GROUP BY gender
       ) s) AS gender_counts,
    (SELECT coalesce(jsonb_object_agg(occasion, cnt), '{}'::jsonb)
       FROM (
         SELECT unnest(when_to_wear) occasion, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id
         GROUP BY occasion
       ) s) AS occasion_counts,
    (SELECT avg(rating) FROM public.reviews WHERE perfume_id = p_perfume_id AND rating IS NOT NULL) AS rating_avg,
    (SELECT count(*) FROM public.reviews WHERE perfume_id = p_perfume_id AND rating IS NOT NULL) AS rating_count,
    (SELECT coalesce(jsonb_object_agg(season, cnt), '{}'::jsonb)
       FROM (
         SELECT unnest(climate_season) season, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id
         GROUP BY season
       ) s) AS climate_counts,
    (SELECT coalesce(jsonb_object_agg(environment, cnt), '{}'::jsonb)
       FROM (
         SELECT environment, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id AND environment IS NOT NULL
         GROUP BY environment
       ) s) AS environment_counts;
$$;

GRANT EXECUTE ON FUNCTION public.get_perfume_review_aggregate(uuid) TO anon, authenticated;

-- Price history: one row per perfume per effective-price change on
-- `listings` (derived from the existing `min_price` generated column,
-- so decant vs intact/partial pricing is already resolved). Backfilled
-- once from current listings at migration time so history isn't empty
-- for perfumes that already had active listings.
CREATE TABLE public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfume_id uuid NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_perfume_id ON public.price_history(perfume_id, recorded_at);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_history_public_read" ON public.price_history
  FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.record_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.perfume_id IS NOT NULL AND NEW.min_price IS NOT NULL THEN
    INSERT INTO public.price_history (perfume_id, price)
    VALUES (NEW.perfume_id, NEW.min_price);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_price_history_insert
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.record_price_history();

CREATE TRIGGER trg_record_price_history_update
  AFTER UPDATE OF price, decant_options, type ON public.listings
  FOR EACH ROW
  WHEN (OLD.min_price IS DISTINCT FROM NEW.min_price)
  EXECUTE FUNCTION public.record_price_history();

CREATE OR REPLACE FUNCTION public.get_perfume_price_history(p_perfume_id uuid)
RETURNS TABLE (
  month text,
  avg_price numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    to_char(date_trunc('month', recorded_at), 'YYYY-MM') AS month,
    round(avg(price), 2) AS avg_price
  FROM public.price_history
  WHERE perfume_id = p_perfume_id
    AND recorded_at >= now() - interval '12 months'
  GROUP BY date_trunc('month', recorded_at)
  ORDER BY date_trunc('month', recorded_at);
$$;

GRANT EXECUTE ON FUNCTION public.get_perfume_price_history(uuid) TO anon, authenticated;
