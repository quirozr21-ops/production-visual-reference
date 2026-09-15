alter table public.products
  add column if not exists final_inspection_part_number text;

grant select (final_inspection_part_number) on table public.products to authenticated;
grant insert (final_inspection_part_number) on table public.products to authenticated;
grant update (final_inspection_part_number) on table public.products to authenticated;
