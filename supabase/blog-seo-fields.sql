-- Optional SEO overrides for blog posts. NULL = fall back to title / excerpt.
alter table public.blog_posts
  add column if not exists meta_title text,
  add column if not exists meta_description text;
