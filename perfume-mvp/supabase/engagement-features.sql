-- Engagement features: sold status, reports, alerts, follows, wanted requests.
-- Additive only. Applied to project yanubzbhovuwqbazbqfk.

-- 1. Sold / available status on listings -------------------------------------
alter table public.listings
  add column if not exists status text not null default 'available',
  add column if not exists sold_at timestamptz;

alter table public.listings
  drop constraint if exists listings_status_check;
alter table public.listings
  add constraint listings_status_check check (status in ('available', 'sold'));

-- 2. Reports -----------------------------------------------------------------
create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 300),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);
alter table public.listing_reports enable row level security;
drop policy if exists listing_reports_insert on public.listing_reports;
create policy listing_reports_insert on public.listing_reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
drop policy if exists listing_reports_read_own on public.listing_reports;
create policy listing_reports_read_own on public.listing_reports
  for select to authenticated using (reporter_id = (select auth.uid()));

-- 3. Perfume alerts ("notify me") ---------------------------------------------
create table if not exists public.perfume_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null check (char_length(query) between 2 and 80),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, query)
);
alter table public.perfume_alerts enable row level security;
drop policy if exists perfume_alerts_own on public.perfume_alerts;
create policy perfume_alerts_own on public.perfume_alerts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 4. Follows -------------------------------------------------------------------
create table if not exists public.seller_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (follower_id, seller_id),
  check (follower_id <> seller_id)
);
alter table public.seller_follows enable row level security;
drop policy if exists seller_follows_own on public.seller_follows;
create policy seller_follows_own on public.seller_follows
  for all to authenticated
  using (follower_id = (select auth.uid()))
  with check (follower_id = (select auth.uid()));

-- 5. Wanted requests ("ISO") ---------------------------------------------------
create table if not exists public.wanted_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  perfume_text text not null check (char_length(perfume_text) between 2 and 100),
  type text check (type in ('intact', 'partial', 'decant')),
  max_price numeric check (max_price is null or max_price >= 0),
  note text check (note is null or char_length(note) <= 300),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.wanted_requests enable row level security;
drop policy if exists wanted_requests_read on public.wanted_requests;
create policy wanted_requests_read on public.wanted_requests
  for select to anon, authenticated
  using (is_open = true or user_id = (select auth.uid()));
drop policy if exists wanted_requests_insert on public.wanted_requests;
create policy wanted_requests_insert on public.wanted_requests
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists wanted_requests_update on public.wanted_requests;
create policy wanted_requests_update on public.wanted_requests
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists wanted_requests_delete on public.wanted_requests;
create policy wanted_requests_delete on public.wanted_requests
  for delete to authenticated using (user_id = (select auth.uid()));

-- 6. Follow-up (applied separately): embed support + indexes
alter table public.wanted_requests
  add constraint wanted_requests_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
create index if not exists wanted_requests_open_created_idx on public.wanted_requests (created_at desc) where is_open;
create index if not exists listing_reports_listing_idx on public.listing_reports (listing_id);
create index if not exists perfume_alerts_user_idx on public.perfume_alerts (user_id);
create index if not exists seller_follows_seller_idx on public.seller_follows (seller_id);
