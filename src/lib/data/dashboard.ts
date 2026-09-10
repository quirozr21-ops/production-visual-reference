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

export type DashboardProduct = {
  id: string;
  part_number: string;
  description: string;
  current_engineering_revision: string | null;
  current_approved_visual_revision: string | null;
  status: string;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  if (isDemoMode) {
    return { current: 1, drafts: 2, awaitingApproval: 1, mismatches: 1, obsolete: 4, missingVisuals: 2 };
  }

  const supabase = await createClient();

  const [productsResult, draftResult, awaitingResult, obsoleteResult] = await Promise.all([
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

export async function getDashboardProducts(): Promise<DashboardProduct[]> {
  if (isDemoMode) {
    return [
      {
        id: "11111111-1111-1111-1111-111111111111",
        part_number: "0241-75484",
        description: "Quick Connect Assembly",
        current_engineering_revision: "6",
        current_approved_visual_revision: "5",
        status: "active",
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        part_number: "0190-02918-001",
        description: "G8.7 VME Power Box",
        current_engineering_revision: "3",
        current_approved_visual_revision: "2",
        status: "active",
      },
    ];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id,part_number,description,current_engineering_revision,current_approved_visual_revision,status")
    .order("part_number")
    .limit(100);

  return (data ?? []) as DashboardProduct[];
}
