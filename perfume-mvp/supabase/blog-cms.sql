-- Blog CMS Schema Migration
-- Run this in the Supabase SQL editor

-- ─── Enum ─────────────────────────────────────────────────────────────────────
CREATE TYPE blog_post_status AS ENUM ('draft', 'pending_review', 'published', 'rejected');

-- ─── Tables ───────────────────────────────────────────────────────────────────
CREATE TABLE blog_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE blog_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE blog_posts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  title            text NOT NULL,
  content          jsonb NOT NULL DEFAULT '{}',
  excerpt          text NOT NULL DEFAULT '',
  cover_image_url  text,
  status           blog_post_status NOT NULL DEFAULT 'draft',
  author_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rejection_note   text,
  published_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE blog_post_categories (
  post_id     uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE blog_post_tags (
  post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ─── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_blog_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX blog_posts_status_idx       ON blog_posts(status);
CREATE INDEX blog_posts_author_id_idx    ON blog_posts(author_id);
CREATE INDEX blog_posts_published_at_idx ON blog_posts(published_at DESC NULLS LAST);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE blog_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags       ENABLE ROW LEVEL SECURITY;

-- blog_posts
CREATE POLICY "blog_posts_public_read_published"
  ON blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "blog_posts_auth_read_own"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "blog_posts_auth_insert_own"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid() AND status = 'draft');

CREATE POLICY "blog_posts_auth_update_own"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() AND status IN ('draft', 'rejected'))
  WITH CHECK (author_id = auth.uid() AND status IN ('draft', 'pending_review'));

CREATE POLICY "blog_posts_auth_delete_own"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() AND status IN ('draft', 'rejected'));

-- categories / tags: public read; admin write via service role (bypasses RLS)
CREATE POLICY "blog_categories_public_read"      ON blog_categories      FOR SELECT USING (true);
CREATE POLICY "blog_tags_public_read"            ON blog_tags            FOR SELECT USING (true);
CREATE POLICY "blog_post_categories_public_read" ON blog_post_categories FOR SELECT USING (true);
CREATE POLICY "blog_post_tags_public_read"       ON blog_post_tags       FOR SELECT USING (true);

-- ─── Storage Bucket ───────────────────────────────────────────────────────────
-- Create bucket "blog-images" (public) in the Supabase dashboard:
--   Storage → New bucket → Name: blog-images, Public: ON, File size limit: 5MB
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images', 'blog-images', true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "blog_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "blog_images_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "blog_images_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'blog-images');
