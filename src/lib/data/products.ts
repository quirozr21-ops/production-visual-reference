import { isDemoMode } from "@/lib/config";
import { demoMismatchProduct, demoProduct } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

export type ProductReference = {
  id: string;
  part_number: string;
  description: string;
  product_family: string | null;
  current_engineering_revision: string | null;
  current_approved_visual_revision: string | null;
  ecn_number: string | null;
  work_instruction_number: string | null;
  status: string;
  critical_quality_notes: string | null;
  approved_at: string | null;
  assets: Array<{
    id: string;
    category: string;
    description: string | null;
    image_url: string | null;
  }>;
};

export async function getProductReference(partNumber: string): Promise<ProductReference | null> {
  if (isDemoMode) {
    if (partNumber.toUpperCase() === demoProduct.part_number) return demoProduct;
    if (partNumber.toUpperCase() === demoMismatchProduct.part_number) return demoMismatchProduct;
    return null;
  }

  const supabase = await createClient();
  const normalized = partNumber.trim();

  // This loader is also used by the public QR route. Request only fields that are
  // intentionally exposed in the Production view.
  const { data: product, error } = await supabase
    .from("products")
    .select(`
      id,
      part_number,
      description,
      status,
      current_engineering_revision,
      current_approved_visual_revision
    `)
    .ilike("part_number", normalized)
    .single();

  if (error || !product) return null;

  let criticalNotes: string | null = null;
  let approvedAt: string | null = null;
  let assets: ProductReference["assets"] = [];

  if (product.current_approved_visual_revision) {
    const { data: revision } = await supabase
      .from("product_revisions")
      .select("id, critical_quality_notes, approved_at")
      .eq("product_id", product.id)
      .eq("revision_code", product.current_approved_visual_revision)
      .eq("status", "approved")
      .single();

    if (revision) {
      criticalNotes = revision.critical_quality_notes;
      approvedAt = revision.approved_at;

      const { data: rows } = await supabase
        .from("visual_assets")
        .select("id, category, description")
        .eq("revision_id", revision.id)
        .eq("approval_status", "approved")
        .order("sort_order");

      assets = (rows ?? []).map((asset) => ({
        ...asset,
        image_url: `/api/reference-images/${asset.id}`,
      }));
    }
  }

  return {
    id: product.id,
    part_number: product.part_number,
    description: product.description,
    product_family: null,
    current_engineering_revision: product.current_engineering_revision,
    current_approved_visual_revision: product.current_approved_visual_revision,
    ecn_number: null,
    work_instruction_number: null,
    status: product.status,
    critical_quality_notes: criticalNotes,
    approved_at: approvedAt,
    assets,
  };
}
