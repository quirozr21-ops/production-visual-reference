export const demoProduct = {
  id: "11111111-1111-1111-1111-111111111111",
  part_number: "0241-75484",
  description: "Quick Connect Assembly",
  product_family: "Quick Connect",
  current_engineering_revision: "5",
  current_approved_visual_revision: "5",
  ecn_number: "3177994",
  work_instruction_number: "0010-DEMO",
  status: "active",
  critical_quality_notes:
    "Production aid only. Verify connector orientation and label placement against released engineering documentation.",
  approved_at: "2026-09-10T08:00:00-07:00",
  assets: [
    { id: "a1", category: "Overall", description: "Overall finished assembly", image_url: null },
    { id: "a2", category: "Front", description: "Front orientation reference", image_url: null },
    { id: "a3", category: "Connector", description: "Connector location and orientation", image_url: null },
    { id: "a4", category: "Label", description: "Approved label location reference", image_url: null },
  ],
};

export const demoMismatchProduct = {
  ...demoProduct,
  id: "22222222-2222-2222-2222-222222222222",
  part_number: "0190-02918-001",
  description: "G8.7 VME Power Box",
  product_family: "Power Box",
  current_engineering_revision: "3",
  current_approved_visual_revision: "2",
  ecn_number: "DEMO-ECN",
  assets: demoProduct.assets.slice(0, 2),
};
