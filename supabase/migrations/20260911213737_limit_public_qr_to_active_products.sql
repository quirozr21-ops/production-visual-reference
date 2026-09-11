drop policy if exists "products public approved qr read" on public.products;

create policy "products public approved qr read"
on public.products
for select
to anon
using (
  status = 'active'
  and current_approved_visual_revision is not null
);
