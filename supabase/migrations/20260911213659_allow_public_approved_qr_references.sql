-- Allow anyone with a product QR/link to read only the current approved visual reference.
-- Drafts, rejected revisions, authoring metadata, and admin workflows remain authenticated-only.

grant select (id, part_number, description, status, current_engineering_revision, current_approved_visual_revision)
  on table public.products to anon;

grant select (id, product_id, revision_code, status, critical_quality_notes, approved_at)
  on table public.product_revisions to anon;

grant select (id, revision_id, category, description, sort_order, approval_status, storage_path)
  on table public.visual_assets to anon;

create policy "products public approved qr read"
on public.products
for select
to anon
using (current_approved_visual_revision is not null);

create policy "revisions public current approved read"
on public.product_revisions
for select
to anon
using (
  status = 'approved'::public.revision_status
  and exists (
    select 1
    from public.products p
    where p.id = product_revisions.product_id
      and p.current_approved_visual_revision = product_revisions.revision_code
  )
);

create policy "visual assets public current approved read"
on public.visual_assets
for select
to anon
using (
  approval_status = 'approved'::public.image_approval_status
  and exists (
    select 1
    from public.product_revisions r
    join public.products p on p.id = r.product_id
    where r.id = visual_assets.revision_id
      and r.status = 'approved'::public.revision_status
      and p.current_approved_visual_revision = r.revision_code
  )
);

create policy "public approved visual reference storage read"
on storage.objects
for select
to anon
using (
  bucket_id = 'visual-references'
  and exists (
    select 1
    from public.visual_assets a
    join public.product_revisions r on r.id = a.revision_id
    join public.products p on p.id = r.product_id
    where a.storage_path = objects.name
      and a.approval_status = 'approved'::public.image_approval_status
      and r.status = 'approved'::public.revision_status
      and p.current_approved_visual_revision = r.revision_code
  )
);
