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
