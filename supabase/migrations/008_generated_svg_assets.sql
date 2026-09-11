alter table public.assets drop constraint if exists assets_format_check;
alter table public.assets add constraint assets_format_check
  check (format in ('png', 'jpg', 'svg'));

update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
where id = 'generated-assets';
