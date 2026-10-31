-- Seller Pass: tiers, founding number, tier freeze, verified-at-signup, get_seller_pass RPC.
-- Spec: docs/superpowers/specs/2026-10-31-seller-pass-design.md

-- 1. Tier thresholds (editable without a deploy). Highest min_members <= active member count applies.
create table if not exists public.tier_config (
  min_members  int primary key,
  silver_min   int not null,
  gold_min     int not null,
  platinum_min int not null
);
alter table public.tier_config enable row level security;
drop policy if exists tier_config_read on public.tier_config;
create policy tier_config_read on public.tier_config for select to anon, authenticated using (true);

insert into public.tier_config values
  (0,   20,  35,  50),
  (150, 50,  75,  100),
  (200, 100, 125, 150),
  (201, 100, 150, 200)
on conflict (min_members) do nothing;

-- 2. Profile columns. Client writes are blocked by the guard trigger below.
alter table public.profiles
  add column if not exists founding_number int unique,
  add column if not exists tier_floor text check (tier_floor in ('silver','gold','platinum')),
  add column if not exists tier_frozen boolean not null default false;

-- 3. Pure tier rule. Rating bars are fixed: silver 4.2, gold 4.4, platinum 4.5.
-- Count is an entry bar; a held (floor) tier is kept while the average clears its rating bar,
-- otherwise it falls to the best lower tier whose bar the average still clears (count waived).
create or replace function public.seller_tier_for(p_count int, p_avg numeric, p_members int, p_floor text)
returns text
language plpgsql stable
set search_path = public
as $$
declare
  c record;
  earned int := 0;
  held int := 0;
  r int;
  bars numeric[] := array[4.2, 4.4, 4.5];
begin
  if p_avg is null then return null; end if;
  select * into c from tier_config where min_members <= p_members order by min_members desc limit 1;
  if p_count >= c.silver_min   and p_avg >= bars[1] then earned := 1; end if;
  if p_count >= c.gold_min     and p_avg >= bars[2] then earned := 2; end if;
  if p_count >= c.platinum_min and p_avg >= bars[3] then earned := 3; end if;
  r := case p_floor when 'silver' then 1 when 'gold' then 2 when 'platinum' then 3 else 0 end;
  while r > 0 loop
    if p_avg >= bars[r] then held := r; exit; end if;
    r := r - 1;
  end loop;
  return (array[null, 'silver', 'gold', 'platinum'])[greatest(earned, held) + 1];
end $$;

-- 4. Keep tier_floor current whenever a seller's reviews change (insert, edit, hide, delete).
create or replace function public.refresh_seller_tier(p_seller uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_count int;
  v_avg numeric;
  v_members int;
  v_floor text;
begin
  select count(*), avg(rating) into v_count, v_avg
    from seller_reviews where seller_id = p_seller and not is_hidden;
  select count(*) into v_members from profiles where status = 'active';
  select tier_floor into v_floor from profiles where id = p_seller;
  update profiles set tier_floor = seller_tier_for(v_count, v_avg, v_members, v_floor)
   where id = p_seller;
end $$;
revoke execute on function public.refresh_seller_tier(uuid) from public, anon, authenticated;

create or replace function public.seller_reviews_refresh_tier()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then perform refresh_seller_tier(old.seller_id); end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.seller_id <> old.seller_id) then
    perform refresh_seller_tier(new.seller_id);
  end if;
  return null;
end $$;
drop trigger if exists seller_reviews_refresh_tier_trg on public.seller_reviews;
create trigger seller_reviews_refresh_tier_trg
  after insert or update or delete on public.seller_reviews
  for each row execute function public.seller_reviews_refresh_tier();

-- 5. Founding number: signup order, first 100 only, assigned once. Overrides anything the client sends.
create or replace function public.profiles_assign_founding()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare n int;
begin
  perform pg_advisory_xact_lock(hashtext('profiles_founding'));
  select coalesce(max(founding_number), 0) + 1 into n from profiles;
  new.founding_number := case when n <= 100 then n else null end;
  new.tier_floor := null;
  new.tier_frozen := false;
  return new;
end $$;
drop trigger if exists trg_profiles_founding on public.profiles;
create trigger trg_profiles_founding
  before insert on public.profiles
  for each row execute function public.profiles_assign_founding();

-- Backfill existing profiles by signup order.
update public.profiles p set founding_number = r.rn
from (select id, row_number() over (order by created_at, id) rn from public.profiles) r
where p.id = r.id and r.rn <= 100 and p.founding_number is null;

-- 6. Guard: client roles can't touch the new columns (extends profiles-role-lockdown.sql).
create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_phone text;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role is distinct from 'user' then
      raise exception 'role can only be set by an administrator' using errcode = '42501';
    end if;
    if coalesce(new.phone_verified, false) then
      raise exception 'phone_verified can only be set by the server' using errcode = '42501';
    end if;
  else
    if new.role is distinct from old.role then
      raise exception 'role can only be changed by an administrator' using errcode = '42501';
    end if;
    if new.phone_verified is distinct from old.phone_verified then
      raise exception 'phone_verified can only be changed by the server' using errcode = '42501';
    end if;
    if new.founding_number is distinct from old.founding_number
       or new.tier_floor is distinct from old.tier_floor
       or new.tier_frozen is distinct from old.tier_frozen then
      raise exception 'tier fields can only be changed by the server' using errcode = '42501';
    end if;
    -- A phone-verified number is the signup number and stays locked.
    if old.phone_verified and new.contact_number is distinct from old.contact_number then
      raise exception 'verified contact number cannot be changed' using errcode = '42501';
    end if;
  end if;

  if new.contact_number is not null
     and (tg_op = 'INSERT' or new.contact_number is distinct from old.contact_number) then
    v_phone := regexp_replace(new.contact_number, '\s+', '', 'g');
    if exists (
      select 1 from public.profiles a
      where a.role = 'admin'
        and a.id <> new.id
        and regexp_replace(coalesce(a.contact_number, ''), '\s+', '', 'g') = v_phone
    ) then
      raise exception 'this contact number is already in use' using errcode = '23505';
    end if;
  end if;

  return new;
end;
$$;

-- 7. Verified at signup: a confirmed phone makes the profile verified and locks contact_number to it.
create or replace function public.sync_phone_verified()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.phone_confirmed_at is not null and coalesce(new.phone, '') <> '' then
    update profiles set phone_verified = true, contact_number = new.phone
     where id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_sync_phone_verified on auth.users;
create trigger trg_sync_phone_verified
  after insert or update of phone_confirmed_at on auth.users
  for each row execute function public.sync_phone_verified();

-- Backfill from phones Supabase already confirmed.
update public.profiles p set phone_verified = true, contact_number = u.phone
from auth.users u
where u.id = p.id and u.phone_confirmed_at is not null and coalesce(u.phone, '') <> '';

-- 8. One source of truth for the profile page and the share card.
create or replace function public.get_seller_pass(p_username text)
returns table (
  seller_id uuid, username text, display_name text, avatar_url text, bio text,
  rating_count bigint, rating_avg numeric, tier text, is_early boolean,
  founding_number int, verified boolean, listing_count bigint, member_since int
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  p profiles%rowtype;
  v_count int;
  v_avg numeric;
  v_members int;
  v_tier text;
  v_base text;
begin
  select * into p from profiles where lower(profiles.username) = lower(p_username) and status = 'active';
  if not found then return; end if;
  select count(*), avg(rating) into v_count, v_avg
    from seller_reviews sr where sr.seller_id = p.id and not sr.is_hidden;
  select count(*) into v_members from profiles where status = 'active';
  v_tier := seller_tier_for(v_count, v_avg, v_members, p.tier_floor);
  v_base := seller_tier_for(v_count, v_avg, v_members, null);
  if p.tier_frozen then v_tier := null; end if;
  return query select
    p.id, p.username, p.display_name, p.avatar_url, p.bio,
    v_count::bigint, round(v_avg, 2), v_tier,
    (v_tier is not null and v_tier is distinct from v_base),
    p.founding_number, coalesce(p.phone_verified, false),
    (select count(*) from listings l where l.user_id = p.id and not l.is_hidden),
    extract(year from p.created_at)::int;
end $$;
grant execute on function public.get_seller_pass(text) to anon, authenticated;

-- Trigger-only functions must not be callable as RPC.
revoke execute on function public.profiles_assign_founding(), public.seller_reviews_refresh_tier(), public.sync_phone_verified() from public, anon, authenticated;
