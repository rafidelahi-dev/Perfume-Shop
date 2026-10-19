-- Slice C: quick-join + retention loop.

-- 1. handle_new_user: username collisions (john@gmail.com vs john@yahoo.com)
--    used to violate the unique index and fail signup. Append a short suffix
--    until free. Everything else is unchanged.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  raw_base text;
  cleaned_username text;
  candidate text;
  display_name text;
  avatar text;
  attempts int := 0;
begin
  if new.email is not null then
    raw_base := split_part(new.email, '@', 1);
  else
    raw_base := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  cleaned_username := lower(regexp_replace(raw_base, '[^a-z0-9_]', '', 'g'));

  if length(cleaned_username) < 3 then
    cleaned_username := 'user_' || substr(new.id::text, 1, 6);
  end if;

  candidate := cleaned_username;
  while exists (select 1 from public.profiles where lower(username) = candidate) and attempts < 20 loop
    attempts := attempts + 1;
    candidate := cleaned_username || substr(md5(random()::text || new.id::text), 1, 4);
  end loop;
  cleaned_username := candidate;

  display_name := cleaned_username;

  if new.raw_user_meta_data ? 'full_name' then
    display_name := new.raw_user_meta_data->>'full_name';
  elsif new.raw_user_meta_data ? 'name' then
    display_name := new.raw_user_meta_data->>'name';
  end if;

  if new.raw_user_meta_data ? 'avatar_url' then
    avatar := new.raw_user_meta_data->>'avatar_url';
  elsif new.raw_user_meta_data ? 'picture' then
    avatar := new.raw_user_meta_data->>'picture';
  end if;

  insert into public.profiles (id, username, display_name, avatar_url, email, contact_number, phone_verified)
  values (
    new.id,
    cleaned_username,
    display_name,
    avatar,
    new.email,
    new.phone,
    new.phone_confirmed_at is not null
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

-- 2. Retention loop: what happened on the perfumes the caller reviewed.
--    Counts other people only; never returns user ids.
CREATE FUNCTION public.get_my_review_activity()
RETURNS TABLE (
  perfume_id uuid,
  name text,
  brand text,
  slug text,
  my_rating smallint,
  other_reviews bigint,
  other_voters bigint,
  new_reviews_7d bigint,
  new_votes_7d bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.brand, p.slug, r.rating,
    (SELECT count(*) FROM reviews o
       WHERE o.perfume_id = p.id AND o.user_id <> r.user_id AND NOT o.is_hidden),
    (SELECT count(DISTINCT v.user_id) FROM perfume_votes v
       WHERE v.perfume_id = p.id AND v.user_id <> r.user_id),
    (SELECT count(*) FROM reviews o
       WHERE o.perfume_id = p.id AND o.user_id <> r.user_id AND NOT o.is_hidden
         AND o.created_at > now() - interval '7 days'),
    (SELECT count(DISTINCT v.user_id) FROM perfume_votes v
       WHERE v.perfume_id = p.id AND v.user_id <> r.user_id
         AND v.created_at > now() - interval '7 days')
  FROM reviews r
  JOIN perfumes p ON p.id = r.perfume_id
  WHERE r.user_id = auth.uid() AND NOT r.is_hidden
  ORDER BY 8 DESC, 9 DESC, r.updated_at DESC
  LIMIT 20;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_review_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_review_activity() TO authenticated;

-- 3. Perfumes the caller has not reviewed yet (for the "rate more" nudge).
CREATE FUNCTION public.get_perfumes_to_rate(p_limit int DEFAULT 6)
RETURNS TABLE (id uuid, name text, brand text, slug text, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.brand, p.slug,
         (SELECT count(*) FROM reviews x WHERE x.perfume_id = p.id AND NOT x.is_hidden)
  FROM perfumes p
  WHERE auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.perfume_id = p.id AND r.user_id = auth.uid())
  ORDER BY 5 DESC, p.name
  LIMIT LEAST(GREATEST(p_limit, 1), 12);
$$;
REVOKE EXECUTE ON FUNCTION public.get_perfumes_to_rate(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_perfumes_to_rate(int) TO authenticated;
