-- Note catalog (2026-10-26). One row per distinct fragrance note so each note
-- can carry an image shared by every perfume that uses it.
-- perfumes.top_notes / heart_notes / base_notes stay the source of which notes
-- a perfume has (lowercase, trimmed); this table is looked up by name.
-- Images live in the perfume-images bucket, written via the service role.
create table if not exists public.notes (
  name       text primary key check (name = lower(btrim(name)) and name <> ''),
  image_url  text,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;
drop policy if exists "notes public read" on public.notes;
create policy "notes public read" on public.notes for select to public using (true);

-- Keep the catalog in sync whenever a perfume's notes change.
create or replace function public.sync_perfume_notes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notes (name)
  select distinct lower(btrim(n))
  from unnest(coalesce(new.top_notes, '{}') || coalesce(new.heart_notes, '{}') || coalesce(new.base_notes, '{}')) as n
  where btrim(n) <> ''
  on conflict (name) do nothing;
  return new;
end $$;

drop trigger if exists perfumes_sync_notes on public.perfumes;
create trigger perfumes_sync_notes
  after insert or update of top_notes, heart_notes, base_notes on public.perfumes
  for each row execute function public.sync_perfume_notes();

-- Backfill from existing perfumes.
insert into public.notes (name)
select distinct lower(btrim(n))
from public.perfumes p,
     unnest(coalesce(p.top_notes, '{}') || coalesce(p.heart_notes, '{}') || coalesce(p.base_notes, '{}')) as n
where btrim(n) <> ''
on conflict (name) do nothing;
