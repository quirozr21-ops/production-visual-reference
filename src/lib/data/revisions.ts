import { isDemoMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export type RevisionSummary = {
  id: string;
  product_id: string;
  revision_code: string;
  ecn_number: string | null;
  status: "draft" | "awaiting_approval" | "approved" | "rejected" | "obsolete";
  critical_quality_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  asset_count: number;
};

export type ControlledProduct = {
  id: string;
  part_number: string;
  description: string;
  current_engineering_revision: string | null;
  current_approved_visual_revision: string | null;
  work_instruction_number: string | null;
  status: string;
  revisions: RevisionSummary[];
};

export type RevisionDetail = RevisionSummary & {
  product: {
    id: string;
    part_number: string;
    description: string;
    current_engineering_revision: string | null;
    current_approved_visual_revision: string | null;
  };
  assets: Array<{
    id: string;
    category: string;
    description: string | null;
    sort_order: number;
    approval_status: string;
    uploaded_at: string;
    image_url: string;
  }>;
};

const demoRevisions: RevisionSummary[] = [
  {
    id: "demo-rev-5",
    product_id: "11111111-1111-1111-1111-111111111111",
    revision_code: "5",
    ecn_number: "3177994",
    status: "approved",
    critical_quality_notes: "Verify connector orientation and label placement.",
    submitted_at: "2026-09-09T16:00:00Z",
    approved_at: "2026-09-10T15:00:00Z",
    rejected_at: null,
    rejection_reason: null,
    created_at: "2026-09-09T14:00:00Z",
    asset_count: 4,
  },
  {
    id: "demo-rev-6",
    product_id: "11111111-1111-1111-1111-111111111111",
    revision_code: "6",
    ecn_number: "3180001",
    status: "awaiting_approval",
    critical_quality_notes: "Confirm revised connector bracket orientation.",
    submitted_at: "2026-09-10T16:00:00Z",
    approved_at: null,
    rejected_at: null,
    rejection_reason: null,
    created_at: "2026-09-10T15:30:00Z",
    asset_count: 3,
  },
  {
    id: "demo-rev-4",
    product_id: "11111111-1111-1111-1111-111111111111",
    revision_code: "4",
    ecn_number: "3175005",
    status: "obsolete",
    critical_quality_notes: null,
    submitted_at: "2026-08-01T16:00:00Z",
    approved_at: "2026-08-02T16:00:00Z",
    rejected_at: null,
    rejection_reason: null,
    created_at: "2026-08-01T15:00:00Z",
    asset_count: 2,
  },
];

export async function getControlledProduct(productId: string): Promise<ControlledProduct | null> {
  if (isDemoMode) {
    if (productId !== "11111111-1111-1111-1111-111111111111") return null;
    return {
      id: productId,
      part_number: "0241-75484",
      description: "Quick Connect Assembly",
      current_engineering_revision: "6",
      current_approved_visual_revision: "5",
      work_instruction_number: "0010-DEMO",
      status: "active",
      revisions: demoRevisions,
    };
  }

  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("id,part_number,description,current_engineering_revision,current_approved_visual_revision,work_instruction_number,status")
    .eq("id", productId)
    .single();

  if (error || !product) return null;

  const { data: rows } = await supabase
    .from("product_revisions")
    .select("id,product_id,revision_code,ecn_number,status,critical_quality_notes,submitted_at,approved_at,rejected_at,rejection_reason,created_at,visual_assets(count)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  const revisions: RevisionSummary[] = (rows ?? []).map((row) => {
    const countRelation = row.visual_assets as unknown as Array<{ count: number }> | { count: number } | null;
    const assetCount = Array.isArray(countRelation)
      ? countRelation[0]?.count ?? 0
      : countRelation?.count ?? 0;

    return {
      id: row.id,
      product_id: row.product_id,
      revision_code: row.revision_code,
      ecn_number: row.ecn_number,
      status: row.status,
      critical_quality_notes: row.critical_quality_notes,
      submitted_at: row.submitted_at,
      approved_at: row.approved_at,
      rejected_at: row.rejected_at,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      asset_count: assetCount,
    };
  });

  return { ...product, revisions };
}

export async function getRevisionDetail(revisionId: string): Promise<RevisionDetail | null> {
  if (isDemoMode) {
    const revision = demoRevisions.find((item) => item.id === revisionId);
    if (!revision) return null;
    return {
      ...revision,
      product: {
        id: revision.product_id,
        part_number: "0241-75484",
        description: "Quick Connect Assembly",
        current_engineering_revision: "6",
        current_approved_visual_revision: "5",
      },
      assets: Array.from({ length: revision.asset_count }, (_, index) => ({
        id: `${revision.id}-asset-${index + 1}`,
        category: ["Overall", "Front", "Connector", "Label"][index % 4],
        description: `Demo reference image ${index + 1}`,
        sort_order: index,
        approval_status: revision.status === "approved" ? "approved" : "draft",
        uploaded_at: revision.created_at,
        image_url: "",
      })),
    };
  }

  const supabase = await createClient();
  const { data: revision, error } = await supabase
    .from("product_revisions")
    .select("id,product_id,revision_code,ecn_number,status,critical_quality_notes,submitted_at,approved_at,rejected_at,rejection_reason,created_at")
    .eq("id", revisionId)
    .single();

  if (error || !revision) return null;

  const [{ data: product }, { data: assets }] = await Promise.all([
    supabase
      .from("products")
      .select("id,part_number,description,current_engineering_revision,current_approved_visual_revision")
      .eq("id", revision.product_id)
      .single(),
    supabase
      .from("visual_assets")
      .select("id,category,description,sort_order,approval_status,uploaded_at")
      .eq("revision_id", revision.id)
      .order("sort_order")
      .order("uploaded_at"),
  ]);

  if (!product) return null;

  return {
    ...revision,
    asset_count: assets?.length ?? 0,
    product,
    assets: (assets ?? []).map((asset) => ({
      ...asset,
      image_url: `/api/reference-images/${asset.id}`,
    })),
  } as RevisionDetail;
}

export async function getApprovalQueue() {
  if (isDemoMode) {
    return [
      {
        id: "demo-rev-6",
        revision_code: "6",
        ecn_number: "3180001",
        submitted_at: "2026-09-10T16:00:00Z",
        critical_quality_notes: "Confirm revised connector bracket orientation.",
        product_id: "11111111-1111-1111-1111-111111111111",
        product: { part_number: "0241-75484", description: "Quick Connect Assembly" },
        asset_count: 3,
      },
    ];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("product_revisions")
    .select("id,product_id,revision_code,ecn_number,submitted_at,critical_quality_notes,products(part_number,description),visual_assets(count)")
    .eq("status", "awaiting_approval")
    .order("submitted_at", { ascending: true });

  return (data ?? []).map((row) => {
    const relation = row.products as unknown as { part_number: string; description: string } | Array<{ part_number: string; description: string }> | null;
    const product = Array.isArray(relation) ? relation[0] : relation;
    const countRelation = row.visual_assets as unknown as Array<{ count: number }> | { count: number } | null;
    const assetCount = Array.isArray(countRelation)
      ? countRelation[0]?.count ?? 0
      : countRelation?.count ?? 0;

    return {
      id: row.id,
      product_id: row.product_id,
      revision_code: row.revision_code,
      ecn_number: row.ecn_number,
      submitted_at: row.submitted_at,
      critical_quality_notes: row.critical_quality_notes,
      product: product ?? { part_number: "Unknown", description: "Unknown product" },
      asset_count: assetCount,
    };
  });
}
