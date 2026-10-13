-- FAQ (rendered + FAQPage JSON-LD), featured fragrances, and internal notes for blog posts.
alter table public.blog_posts
  add column if not exists faq jsonb not null default '[]'::jsonb,
  add column if not exists fragrance_slugs text[] not null default '{}';

-- Internal-only notes live in their own table: blog_posts is publicly readable
-- for published rows, so a column there would leak. RLS on + no policies =
-- service role only.
create table if not exists public.blog_post_internal_notes (
  post_id uuid primary key references public.blog_posts(id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.blog_post_internal_notes enable row level security;
revoke all on public.blog_post_internal_notes from anon, authenticated;
