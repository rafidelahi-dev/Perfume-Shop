-- Slice B: seller ratings (per seller, not per listing).
-- One rating per (seller, reviewer); stars plus optional short comment.
-- Public reads go through RPCs that never return reviewer_id.

CREATE TABLE public.seller_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      text CHECK (comment IS NULL OR char_length(comment) <= 500),
  is_flagged   boolean NOT NULL DEFAULT false,
  flag_reason  text,
  flagged_at   timestamptz,
  is_hidden    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, reviewer_id),
  CHECK (seller_id <> reviewer_id)
);

CREATE INDEX seller_reviews_seller_idx ON public.seller_reviews (seller_id) WHERE NOT is_hidden;

ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY seller_reviews_select_own ON public.seller_reviews
  FOR SELECT TO authenticated USING (reviewer_id = auth.uid());
CREATE POLICY seller_reviews_insert_own ON public.seller_reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid() AND seller_id <> auth.uid()
              AND NOT is_hidden AND NOT is_flagged);
CREATE POLICY seller_reviews_update_own ON public.seller_reviews
  FOR UPDATE TO authenticated USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY seller_reviews_delete_own ON public.seller_reviews
  FOR DELETE TO authenticated USING (reviewer_id = auth.uid());

-- Users may only touch rating/comment; moderation columns stay admin-only.
REVOKE UPDATE ON public.seller_reviews FROM authenticated, anon;
GRANT UPDATE (rating, comment, updated_at) ON public.seller_reviews TO authenticated;

CREATE TRIGGER seller_reviews_set_updated_at
  BEFORE UPDATE ON public.seller_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10 new seller ratings per reviewer per hour.
CREATE FUNCTION public.seller_reviews_rate_limit() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM public.seller_reviews
      WHERE reviewer_id = NEW.reviewer_id AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Too many seller ratings. Try again later.';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER seller_reviews_rate_limit_trg
  BEFORE INSERT ON public.seller_reviews
  FOR EACH ROW EXECUTE FUNCTION public.seller_reviews_rate_limit();

-- Public: average + count (hidden excluded).
CREATE FUNCTION public.get_seller_rating(p_seller_id uuid)
RETURNS TABLE (rating_count bigint, rating_avg numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*), round(avg(rating)::numeric, 2)
  FROM seller_reviews
  WHERE seller_id = p_seller_id AND NOT is_hidden;
$$;
GRANT EXECUTE ON FUNCTION public.get_seller_rating(uuid) TO anon, authenticated;

-- Public: list without reviewer_id.
CREATE FUNCTION public.get_seller_reviews(
  p_seller_id uuid, p_limit int DEFAULT 20, p_offset int DEFAULT 0
)
RETURNS TABLE (id uuid, rating smallint, comment text, display_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sr.id, sr.rating, sr.comment,
         COALESCE(p.username, 'A Cloud member'), sr.created_at
  FROM seller_reviews sr
  LEFT JOIN profiles p ON p.id = sr.reviewer_id
  WHERE sr.seller_id = p_seller_id AND NOT sr.is_hidden
  ORDER BY sr.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50) OFFSET GREATEST(p_offset, 0);
$$;
GRANT EXECUTE ON FUNCTION public.get_seller_reviews(uuid, int, int) TO anon, authenticated;

-- Bulk ratings for listing cards (one round trip).
CREATE FUNCTION public.get_seller_ratings(p_seller_ids uuid[])
RETURNS TABLE (seller_id uuid, rating_count bigint, rating_avg numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT seller_id, count(*), round(avg(rating)::numeric, 2)
  FROM seller_reviews
  WHERE seller_id = ANY(p_seller_ids) AND NOT is_hidden
  GROUP BY seller_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_seller_ratings(uuid[]) TO anon, authenticated;

-- Report a seller review (sets the flag once).
CREATE FUNCTION public.report_seller_review(p_review_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
  UPDATE seller_reviews
     SET is_flagged = true, flag_reason = left(p_reason, 300), flagged_at = now()
   WHERE id = p_review_id AND NOT is_flagged;
END $$;
REVOKE EXECUTE ON FUNCTION public.report_seller_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_seller_review(uuid, text) TO authenticated;
