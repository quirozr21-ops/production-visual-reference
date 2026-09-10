"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import {
  isAllowedImageType,
  isPhotoCategory,
  MAX_REFERENCE_IMAGE_BYTES,
  safeFileName,
} from "@/lib/visual-reference";

function redirectError(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

export async function createRevision(formData: FormData) {
  const user = await requireRole(["engineering", "administrator"]);
  const productId = String(formData.get("productId") ?? "").trim();
  const revisionCode = String(formData.get("revisionCode") ?? "").trim();
  const ecnNumber = String(formData.get("ecnNumber") ?? "").trim();
  const notes = String(formData.get("criticalQualityNotes") ?? "").trim();
  const returnPath = `/admin/products/${encodeURIComponent(productId)}/revisions/new`;

  if (isDemoMode) redirectError(returnPath, "Disable demo mode and configure Supabase to create controlled revisions.");
  if (!productId || !revisionCode) redirectError(returnPath, "Product and revision code are required.");

  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("id").eq("id", productId).single();
  if (!product) redirectError(returnPath, "Product not found or not accessible.");

  const { data: revision, error } = await supabase
    .from("product_revisions")
    .insert({
      product_id: productId,
      revision_code: revisionCode,
      ecn_number: ecnNumber || null,
      critical_quality_notes: notes || null,
      created_by: user.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !revision) redirectError(returnPath, error?.message ?? "Unable to create revision.");
  redirect(`/admin/revisions/${revision.id}`);
}

export async function updateRevisionMetadata(formData: FormData) {
  await requireRole(["engineering", "administrator"]);
  const revisionId = String(formData.get("revisionId") ?? "").trim();
  const ecnNumber = String(formData.get("ecnNumber") ?? "").trim();
  const notes = String(formData.get("criticalQualityNotes") ?? "").trim();
  const path = `/admin/revisions/${encodeURIComponent(revisionId)}`;

  if (isDemoMode) redirectError(path, "Demo mode is read-only.");
  if (!revisionId) redirectError("/admin", "Revision is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_revisions")
    .update({
      ecn_number: ecnNumber || null,
      critical_quality_notes: notes || null,
    })
    .eq("id", revisionId);

  if (error) redirectError(path, error.message);
  revalidatePath(path);
  redirect(`${path}?saved=1`);
}

export async function uploadVisualAsset(formData: FormData) {
  const user = await requireRole(["engineering", "administrator"]);
  const revisionId = String(formData.get("revisionId") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrderRaw = String(formData.get("sortOrder") ?? "0").trim();
  const file = formData.get("file");
  const path = `/admin/revisions/${encodeURIComponent(revisionId)}`;

  if (isDemoMode) redirectError(path, "Demo mode is read-only.");
  if (!revisionId || !isPhotoCategory(category)) redirectError(path, "A valid revision and photo category are required.");
  if (!(file instanceof File) || file.size === 0) redirectError(path, "Choose a product reference image to upload.");
  if (!isAllowedImageType(file.type)) redirectError(path, "Use JPEG, PNG, WebP, HEIC, or HEIF images only.");
  if (file.size > MAX_REFERENCE_IMAGE_BYTES) redirectError(path, "Reference images must be 12 MB or smaller.");

  const sortOrder = Number.parseInt(sortOrderRaw, 10);
  const supabase = await createClient();
  const { data: revision } = await supabase
    .from("product_revisions")
    .select("id,product_id,status")
    .eq("id", revisionId)
    .single();

  if (!revision || !["draft", "rejected"].includes(revision.status)) {
    redirectError(path, "Only Draft or Rejected revisions can receive new images.");
  }

  const storagePath = `${revision.product_id}/${revision.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { data: asset, error: metadataError } = await supabase
    .from("visual_assets")
    .insert({
      product_id: revision.product_id,
      revision_id: revision.id,
      storage_path: storagePath,
      category,
      description: description || null,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      approval_status: "draft",
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (metadataError || !asset) redirectError(path, metadataError?.message ?? "Could not create image record.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("visual-references")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    await supabase.from("visual_assets").delete().eq("id", asset.id);
    redirectError(path, uploadError.message);
  }

  revalidatePath(path);
  redirect(`${path}?uploaded=1`);
}

export async function deleteVisualAsset(formData: FormData) {
  await requireRole(["engineering", "administrator"]);
  const revisionId = String(formData.get("revisionId") ?? "").trim();
  const assetId = String(formData.get("assetId") ?? "").trim();
  const path = `/admin/revisions/${encodeURIComponent(revisionId)}`;

  if (isDemoMode) redirectError(path, "Demo mode is read-only.");
  if (!revisionId || !assetId) redirectError(path, "Revision and image are required.");

  const supabase = await createClient();
  const { data: asset } = await supabase
    .from("visual_assets")
    .select("id,storage_path,product_revisions!inner(status)")
    .eq("id", assetId)
    .eq("revision_id", revisionId)
    .single();

  if (!asset) redirectError(path, "Image not found or not editable.");
  const relation = asset.product_revisions as unknown as { status: string } | Array<{ status: string }>;
  const status = Array.isArray(relation) ? relation[0]?.status : relation?.status;
  if (!status || !["draft", "rejected"].includes(status)) redirectError(path, "Only Draft or Rejected revision images can be removed.");

  const { error: storageError } = await supabase.storage.from("visual-references").remove([asset.storage_path]);
  if (storageError) redirectError(path, storageError.message);

  const { error: metadataError } = await supabase.from("visual_assets").delete().eq("id", assetId);
  if (metadataError) redirectError(path, metadataError.message);

  revalidatePath(path);
  redirect(path);
}

export async function submitRevisionForQuality(formData: FormData) {
  await requireRole(["engineering", "administrator"]);
  const revisionId = String(formData.get("revisionId") ?? "").trim();
  const path = `/admin/revisions/${encodeURIComponent(revisionId)}`;

  if (isDemoMode) redirectError(path, "Demo mode is read-only.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_revision_for_quality", { target_revision: revisionId });
  if (error) redirectError(path, error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/quality");
  revalidatePath(path);
  redirect(`${path}?submitted=1`);
}

export async function approveVisualRevision(formData: FormData) {
  await requireRole(["quality", "administrator"]);
  const revisionId = String(formData.get("revisionId") ?? "").trim();
  const path = `/admin/revisions/${encodeURIComponent(revisionId)}`;

  if (isDemoMode) redirectError(path, "Demo mode is read-only.");
  const supabase = await createClient();
  const { data: revision } = await supabase
    .from("product_revisions")
    .select("product_id")
    .eq("id", revisionId)
    .single();
  if (!revision) redirectError("/admin/quality", "Revision not found.");

  const { error } = await supabase.rpc("approve_visual_revision", { target_revision: revisionId });
  if (error) redirectError(path, error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/quality");
  revalidatePath(path);
  revalidatePath(`/admin/products/${revision.product_id}`);
  redirect(`${path}?approved=1`);
}

export async function rejectVisualRevision(formData: FormData) {
  await requireRole(["quality", "administrator"]);
  const revisionId = String(formData.get("revisionId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const path = `/admin/revisions/${encodeURIComponent(revisionId)}`;

  if (isDemoMode) redirectError(path, "Demo mode is read-only.");
  if (reason.length < 3) redirectError(path, "Provide a rejection reason of at least 3 characters.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_visual_revision", {
    target_revision: revisionId,
    reason,
  });
  if (error) redirectError(path, error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/quality");
  revalidatePath(path);
  redirect(`${path}?rejected=1`);
}
