import { isDemoMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export type DashboardMetrics = {
  current: number;
  drafts: number;
  awaitingApproval: number;
  mismatches: number;
  obsolete: number;
  missingVisuals: number;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  if (isDemoMode) {
    return { current: 1, drafts: 2, awaitingApproval: 1, mismatches: 1, obsolete: 4, missingVisuals: 2 };
  }

  const supabase = await createClient();

  const [
    productsResult,
    draftResult,
    awaitingResult,
    obsoleteResult,
  ] = await Promise.all([
    supabase.from("products").select("current_engineering_revision,current_approved_visual_revision"),
    supabase.from("product_revisions").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("product_revisions").select("id", { count: "exact", head: true }).eq("status", "awaiting_approval"),
    supabase.from("product_revisions").select("id", { count: "exact", head: true }).eq("status", "obsolete"),
  ]);

  const products = productsResult.data ?? [];
  const current = products.filter(
    (p) => p.current_engineering_revision && p.current_engineering_revision === p.current_approved_visual_revision,
  ).length;
  const mismatches = products.filter(
    (p) => p.current_engineering_revision && p.current_approved_visual_revision &&
      p.current_engineering_revision !== p.current_approved_visual_revision,
  ).length;
  const missingVisuals = products.filter((p) => !p.current_approved_visual_revision).length;

  return {
    current,
    drafts: draftResult.count ?? 0,
    awaitingApproval: awaitingResult.count ?? 0,
    mismatches,
    obsolete: obsoleteResult.count ?? 0,
    missingVisuals,
  };
}
