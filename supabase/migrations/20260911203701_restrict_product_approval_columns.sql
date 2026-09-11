-- Restrict direct Data API writes to product metadata only.
-- Approval state can only be changed by privileged SECURITY DEFINER workflow functions.

revoke insert, update on table public.products from authenticated;

grant insert (
  part_number,
  description,
  product_family_id,
  current_engineering_revision,
  work_instruction_number,
  created_by
) on table public.products to authenticated;

grant update (
  description,
  product_family_id,
  current_engineering_revision,
  work_instruction_number,
  status
) on table public.products to authenticated;

drop policy if exists "products controlled insert" on public.products;
create policy "products controlled insert"
on public.products
for insert
to authenticated
with check (
  (select public.role_in(array[
    'engineering'::public.app_role,
    'document_control'::public.app_role,
    'administrator'::public.app_role
  ]))
  and created_by = (select auth.uid())
  and current_approved_visual_revision is null
  and approved_by is null
  and approved_at is null
);

drop policy if exists "products controlled update" on public.products;
drop policy if exists "products controlled metadata update" on public.products;
create policy "products controlled metadata update"
on public.products
for update
to authenticated
using (
  (select public.role_in(array[
    'engineering'::public.app_role,
    'document_control'::public.app_role,
    'administrator'::public.app_role
  ]))
)
with check (
  (select public.role_in(array[
    'engineering'::public.app_role,
    'document_control'::public.app_role,
    'administrator'::public.app_role
  ]))
);
