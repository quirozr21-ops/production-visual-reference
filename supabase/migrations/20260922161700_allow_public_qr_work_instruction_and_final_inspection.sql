-- Allow the public QR view to display only the two additional approved product fields.
grant select (work_instruction_number, final_inspection_part_number)
  on table public.products to anon;
