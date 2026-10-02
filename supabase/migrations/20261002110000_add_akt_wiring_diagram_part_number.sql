alter table public.products
  add column if not exists akt_wiring_diagram_part_number text;

grant select (akt_wiring_diagram_part_number)
  on table public.products to authenticated;

grant insert (akt_wiring_diagram_part_number)
  on table public.products to authenticated;

grant update (akt_wiring_diagram_part_number)
  on table public.products to authenticated;

grant select (akt_wiring_diagram_part_number)
  on table public.products to anon;
