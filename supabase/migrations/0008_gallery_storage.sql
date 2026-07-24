-- =============================================================================
-- Public storage bucket for box_gallery images. Read is public (marketing
-- photos, meant to be seen by anyone); writes are admin/service-role only —
-- there's no in-app upload UI yet, gallery content is managed directly via
-- the Supabase dashboard or SQL, consistent with this schema's RLS-first
-- design (no policy = no access unless the service-role client is used).
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('gallery-images', 'gallery-images', true)
on conflict (id) do nothing;

drop policy if exists "gallery_images_public_read" on storage.objects;
create policy "gallery_images_public_read"
  on storage.objects for select
  using (bucket_id = 'gallery-images');
