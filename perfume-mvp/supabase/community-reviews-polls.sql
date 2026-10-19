-- Community reviews + polls (slice A of 2026-10-19-community-reviews-polls-design).
-- reviews had 0 rows when this ran, so it is rebuilt rather than altered.
-- Public reads go through SECURITY DEFINER RPCs (reviews/perfume_votes have no
-- public-read policy by design); votes are written only through cast_vote().

-- ── Poll catalog ───────────────────────────────────────────────────────────
CREATE TABLE public.poll_options (
  dimension text NOT NULL,
  option    text NOT NULL,
  kind      text NOT NULL CHECK (kind IN ('single', 'yes_no')),
  sort      smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (dimension, option)
);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_options_public_read" ON public.poll_options
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.poll_options (dimension, option, kind, sort) VALUES
  ('gender', 'very_masculine', 'single', 1),
  ('gender', 'masculine',      'single', 2),
  ('gender', 'unisex',         'single', 3),
  ('gender', 'feminine',       'single', 4),
  ('gender', 'very_feminine',  'single', 5),
  ('longevity', '0-2h',  'single', 1),
  ('longevity', '2-5h',  'single', 2),
  ('longevity', '5-7h',  'single', 3),
  ('longevity', '7-10h', 'single', 4),
  ('longevity', '10h+',  'single', 5),
  ('projection', 'skin',     'single', 1),
  ('projection', 'moderate', 'single', 2),
  ('projection', 'strong',   'single', 3),
  ('projection', 'beast',    'single', 4),
  ('value', 'overpriced', 'single', 1),
  ('value', 'fair',       'single', 2),
  ('value', 'good_value', 'single', 3),
  ('value', 'steal',      'single', 4),
  ('climate', 'hot_summer',  'yes_no', 1),
  ('climate', 'humid_rainy', 'yes_no', 2),
  ('climate', 'winter',      'yes_no', 3),
  ('climate', 'mild',        'yes_no', 4),
  ('place', 'bus_metro',     'yes_no', 1),
  ('place', 'ac_room',       'yes_no', 2),
  ('place', 'restaurant',    'yes_no', 3),
  ('place', 'outdoors',      'yes_no', 4),
  ('place', 'wedding_event', 'yes_no', 5),
  ('place', 'jummah_eid',    'yes_no', 6);

-- ── Reviews (rebuilt) ──────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_perfume_review_aggregate(uuid);
DROP FUNCTION IF EXISTS public.get_perfume_reviews(uuid, int, int);
DROP TABLE public.reviews;

CREATE TABLE public.reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  perfume_id   uuid NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text  text CHECK (review_text IS NULL OR char_length(review_text) <= 2000),
  images       text[] NOT NULL DEFAULT '{}' CHECK (cardinality(images) <= 4),
  owns_bottle  boolean NOT NULL DEFAULT false,
  knows_seller boolean NOT NULL DEFAULT false,
  is_anonymous boolean NOT NULL DEFAULT false,
  is_flagged   boolean NOT NULL DEFAULT false,
  flag_reason  text,
  flagged_at   timestamptz,
  is_hidden    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, perfume_id)
);

CREATE INDEX idx_reviews_perfume_id ON public.reviews(perfume_id, created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_select_own ON public.reviews FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY reviews_insert_own ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_hidden = false AND is_flagged = false);
CREATE POLICY reviews_update_own ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY reviews_delete_own ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Users may edit their content, never the moderation columns.
REVOKE UPDATE ON public.reviews FROM authenticated;
GRANT UPDATE (rating, review_text, images, owns_bottle, knows_seller, is_anonymous, updated_at)
  ON public.reviews TO authenticated;

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.reviews_rate_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM public.reviews
      WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Too many reviews. Please try again later.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reviews_rate_limit
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_rate_limit();

-- ── Votes ──────────────────────────────────────────────────────────────────
CREATE TABLE public.perfume_votes (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfume_id uuid NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  dimension  text NOT NULL,
  option     text NOT NULL,
  value      smallint NOT NULL CHECK (value IN (1, -1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, perfume_id, dimension, option),
  FOREIGN KEY (dimension, option) REFERENCES public.poll_options(dimension, option)
);

CREATE INDEX idx_perfume_votes_perfume ON public.perfume_votes(perfume_id, dimension);

ALTER TABLE public.perfume_votes ENABLE ROW LEVEL SECURITY;
-- Own-row read only; no write policies, writes go through cast_vote().
CREATE POLICY perfume_votes_select_own ON public.perfume_votes FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.perfume_votes FROM authenticated, anon;

CREATE FUNCTION public.cast_vote(
  p_perfume_id uuid, p_dimension text, p_option text, p_value int
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  opt_kind text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_value NOT IN (-1, 0, 1) THEN RAISE EXCEPTION 'Invalid vote value'; END IF;

  SELECT kind INTO opt_kind FROM public.poll_options
   WHERE dimension = p_dimension AND option = p_option;
  IF opt_kind IS NULL THEN RAISE EXCEPTION 'Unknown poll option'; END IF;
  IF opt_kind = 'single' AND p_value = -1 THEN RAISE EXCEPTION 'Invalid vote value'; END IF;

  IF (SELECT count(*) FROM public.perfume_votes
      WHERE user_id = uid AND updated_at > now() - interval '1 hour') >= 60 THEN
    RAISE EXCEPTION 'Too many votes. Please try again later.';
  END IF;

  IF p_value = 0 THEN
    DELETE FROM public.perfume_votes
     WHERE user_id = uid AND perfume_id = p_perfume_id
       AND dimension = p_dimension AND option = p_option;
    RETURN;
  END IF;

  IF opt_kind = 'single' THEN
    DELETE FROM public.perfume_votes
     WHERE user_id = uid AND perfume_id = p_perfume_id
       AND dimension = p_dimension AND option <> p_option;
  END IF;

  INSERT INTO public.perfume_votes (user_id, perfume_id, dimension, option, value)
  VALUES (uid, p_perfume_id, p_dimension, p_option, p_value)
  ON CONFLICT (user_id, perfume_id, dimension, option)
  DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.cast_vote(uuid, text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_vote(uuid, text, text, int) TO authenticated;

-- ── Public read RPCs ───────────────────────────────────────────────────────
CREATE FUNCTION public.get_perfume_review_aggregate(p_perfume_id uuid)
RETURNS TABLE (
  review_count bigint,
  rating_avg numeric,
  rating_histogram jsonb,
  polls jsonb,
  voter_counts jsonb
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    (SELECT count(*) FROM public.reviews WHERE perfume_id = p_perfume_id AND is_hidden = false),
    (SELECT avg(rating) FROM public.reviews WHERE perfume_id = p_perfume_id AND is_hidden = false),
    (SELECT coalesce(jsonb_object_agg(rating, cnt), '{}'::jsonb) FROM (
       SELECT rating, count(*) cnt FROM public.reviews
       WHERE perfume_id = p_perfume_id AND is_hidden = false GROUP BY rating) s),
    (SELECT coalesce(jsonb_object_agg(dimension, opts), '{}'::jsonb) FROM (
       SELECT dimension, jsonb_object_agg(option, jsonb_build_object('yes', yes, 'no', no)) opts FROM (
         SELECT dimension, option,
                count(*) FILTER (WHERE value = 1)  yes,
                count(*) FILTER (WHERE value = -1) no
         FROM public.perfume_votes WHERE perfume_id = p_perfume_id
         GROUP BY dimension, option) o
       GROUP BY dimension) d),
    (SELECT coalesce(jsonb_object_agg(dimension, voters), '{}'::jsonb) FROM (
       SELECT dimension, count(DISTINCT user_id) voters FROM public.perfume_votes
       WHERE perfume_id = p_perfume_id GROUP BY dimension) v);
$$;

GRANT EXECUTE ON FUNCTION public.get_perfume_review_aggregate(uuid) TO anon, authenticated;

CREATE FUNCTION public.get_perfume_reviews(
  p_perfume_id uuid, p_limit int DEFAULT 20, p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  rating smallint,
  review_text text,
  images text[],
  owns_bottle boolean,
  knows_seller boolean,
  display_name text,
  created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT r.id, r.rating, r.review_text, r.images, r.owns_bottle, r.knows_seller,
         CASE WHEN r.is_anonymous THEN 'A Cloud member'
              ELSE coalesce(p.username, 'A Cloud member') END,
         r.created_at
  FROM public.reviews r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.perfume_id = p_perfume_id AND r.is_hidden = false
  ORDER BY r.created_at DESC
  LIMIT least(p_limit, 50) OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_perfume_reviews(uuid, int, int) TO anon, authenticated;

-- Caller's own review + votes for one perfume (hydrates the client island).
CREATE FUNCTION public.get_my_perfume_state(p_perfume_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT jsonb_build_object(
    'review', (SELECT to_jsonb(r) - 'user_id' - 'is_flagged' - 'flag_reason' - 'flagged_at'
               FROM public.reviews r WHERE r.user_id = auth.uid() AND r.perfume_id = p_perfume_id),
    'votes', coalesce((SELECT jsonb_agg(jsonb_build_object('dimension', dimension, 'option', option, 'value', value))
                       FROM public.perfume_votes
                       WHERE user_id = auth.uid() AND perfume_id = p_perfume_id), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_my_perfume_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_perfume_state(uuid) TO authenticated;

-- Report a review (any signed-in user). Sets the flag once; admins decide.
CREATE FUNCTION public.report_review(p_review_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.reviews
     SET is_flagged = true,
         flag_reason = coalesce(flag_reason, left(coalesce(p_reason, 'Reported by a user'), 300)),
         flagged_at = coalesce(flagged_at, now())
   WHERE id = p_review_id AND is_flagged = false;
END;
$$;

REVOKE ALL ON FUNCTION public.report_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_review(uuid, text) TO authenticated;
