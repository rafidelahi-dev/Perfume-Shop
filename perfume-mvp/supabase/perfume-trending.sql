-- "Trending" flames (0-5) for the fragrance page.
-- Activity in the last 30 days = demand requests + 2 x reviews + distinct voters.
-- Flames are relative to the busiest perfume, but the scale never drops below
-- 10 activity points, so a single click on a quiet catalog can't light 5 flames.
-- demand_requests has no public read policy, hence SECURITY DEFINER.

CREATE FUNCTION public.get_perfume_trend(p_perfume_id uuid)
RETURNS smallint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH activity AS (
    SELECT perfume_id, count(*) AS pts
      FROM demand_requests WHERE created_at > now() - interval '30 days'
      GROUP BY perfume_id
    UNION ALL
    SELECT perfume_id, 2 * count(*)
      FROM reviews WHERE NOT is_hidden AND created_at > now() - interval '30 days'
      GROUP BY perfume_id
    UNION ALL
    SELECT perfume_id, count(DISTINCT user_id)
      FROM perfume_votes WHERE updated_at > now() - interval '30 days'
      GROUP BY perfume_id
  ),
  scores AS (SELECT perfume_id, sum(pts) AS score FROM activity GROUP BY perfume_id),
  mine AS (SELECT coalesce((SELECT score FROM scores WHERE perfume_id = p_perfume_id), 0) AS score),
  top AS (SELECT greatest(10, coalesce(max(score), 0)) AS score FROM scores)
  SELECT CASE WHEN mine.score = 0 THEN 0
              ELSE greatest(1, ceil(5 * mine.score / top.score))::smallint END
  FROM mine, top;
$$;

GRANT EXECUTE ON FUNCTION public.get_perfume_trend(uuid) TO anon, authenticated;
