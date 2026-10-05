-- Admin perfume catalog images (2026-10-05).
-- Public-read bucket. Writes happen only through /api/admin/perfumes/images
-- using the service role, so no insert/update/delete policies for clients.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('perfume-images', 'perfume-images', true, 4194304, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 4194304, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "perfume-images public read" on storage.objects;
create policy "perfume-images public read" on storage.objects
  for select to public using (bucket_id = 'perfume-images');
