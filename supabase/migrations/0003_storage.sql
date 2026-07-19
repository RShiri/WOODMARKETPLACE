-- =============================================================================
-- Woodworking Marketplace — Storage Buckets & Policies
-- Phase 3: Creates the public Supabase Storage buckets used for artist-
-- uploaded imagery, plus the storage.objects RLS policies that gate writes.
--
-- Folder-path convention (REQUIRED for app code):
--   Every uploaded object must live under a top-level folder named after the
--   uploading artist's auth.uid(), i.e. artist_profiles.id / profiles.id:
--     artist-banners : <artist_uuid>/<filename>
--     product-images : <artist_uuid>/<product_id>/<filename>
--   The policies below use storage.foldername(name), which splits the object
--   path into a text[] of segments, and check that segment [1] (the first
--   path component) equals auth.uid()::text. Uploads that do not place the
--   artist's own uid as the first path segment will be rejected by RLS.
--
-- Both buckets are public (public = true) so product photos and shop banners
-- can be viewed by anyone on the storefront without a signed URL; write
-- access (insert/update/delete) is restricted to the owning artist.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Buckets
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('artist-banners', 'artist-banners', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- product-images
-- Public read (storefront product galleries). Writes are restricted to the
-- artist whose uid is the first path segment: <artist_uuid>/<product_id>/<filename>.
-- -----------------------------------------------------------------------------

create policy "product_images_select_all"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

create policy "product_images_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "product_images_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "product_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- artist-banners
-- Public read (storefront banner display). Writes are restricted to the
-- artist whose uid is the first path segment: <artist_uuid>/<filename>.
-- -----------------------------------------------------------------------------

create policy "artist_banners_select_all"
  on storage.objects for select
  to public
  using (bucket_id = 'artist-banners');

create policy "artist_banners_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'artist-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "artist_banners_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'artist-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'artist-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "artist_banners_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'artist-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
