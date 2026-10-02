-- Allow approved metadata editors to correct a product part number.
-- RLS still limits product updates to engineering, document_control, and administrator roles.
grant update (part_number)
  on table public.products to authenticated;
