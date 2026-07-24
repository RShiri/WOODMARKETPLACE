-- =============================================================================
-- box_gallery had no uniqueness constraint on image_path, so re-running the
-- gallery-content insert script (an easy mistake, since it's a manual
-- one-off paste into the SQL Editor rather than a tracked migration)
-- silently duplicated rows instead of being a no-op.
-- =============================================================================

alter table box_gallery
  add constraint box_gallery_image_path_unique unique (image_path);
