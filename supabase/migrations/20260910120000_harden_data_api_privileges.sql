-- Least-privilege Data API grants. RLS remains the authorization boundary.

revoke all privileges on table public.profiles from anon, authenticated;
revoke all privileges on table public.product_families from anon, authenticated;
revoke all privileges on table public.products from anon, authenticated;
revoke all privileges on table public.product_revisions from anon, authenticated;
revoke all privileges on table public.visual_assets from anon, authenticated;
revoke all privileges on table public.audit_events from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.product_families to authenticated;
grant select, insert, update on table public.products to authenticated;
grant select, insert, update on table public.product_revisions to authenticated;
grant select, insert, update, delete on table public.visual_assets to authenticated;
grant select on table public.audit_events to authenticated;

update storage.buckets
set public = false,
    file_size_limit = 12582912,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
where id = 'visual-references';
