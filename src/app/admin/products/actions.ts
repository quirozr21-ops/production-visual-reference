"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import {
  MAX_PUBLIC_PDF_UPLOAD_BYTES,
  publishPublicAktSpecification,
  publishPublicRevisionControlNotice,
} from "@/lib/public-pdf-documents";
import { createClient } from "@/lib/supabase/server";

export async function createProduct(formData: FormData) {
  const user = await requireRole(["engineering", "document_control", "administrator"]);

  if (isDemoMode) {
    redirect("/admin/products/new?error=Disable%20demo%20mode%20and%20configure%20Supabase%20to%20create%20controlled%20records.");
  }

  const partNumber = String(formData.get("partNumber") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const engineeringRevision = String(formData.get("engineeringRevision") ?? "").trim();
  const workInstruction = String(formData.get("workInstruction") ?? "").trim();
  const finalInspectionPartNumber = String(formData.get("finalInspectionPartNumber") ?? "").trim();
  const aktDocumentNumber = String(formData.get("aktDocumentNumber") ?? "").trim();
  const aktTitle = String(formData.get("aktTitle") ?? "").trim();
  const aktFile = formData.get("aktSpecificationFile");
  const hasAktFile = aktFile instanceof File && aktFile.size > 0;
  const revisionNoticeNumber = String(formData.get("revisionNoticeNumber") ?? "").trim();
  const revisionNoticeTitle = String(formData.get("revisionNoticeTitle") ?? "").trim();
  const revisionNoticeFile = formData.get("revisionNoticeFile");
  const hasRevisionNoticeFile =
    revisionNoticeFile instanceof File && revisionNoticeFile.size > 0;

  if (!partNumber || !description || !engineeringRevision) {
    redirect("/admin/products/new?error=Part%20number%2C%20description%2C%20and%20engineering%20revision%20are%20required.");
  }

  if (hasAktFile && !aktDocumentNumber) {
    redirect("/admin/products/new?error=Enter%20the%20AKT%20Specification%20Document%20Number%20for%20the%20selected%20PDF.");
  }

  if (!hasAktFile && (aktDocumentNumber || aktTitle)) {
    redirect("/admin/products/new?error=Choose%20an%20AKT%20Specification%20PDF%20or%20clear%20the%20AKT%20fields.");
  }

  if (hasRevisionNoticeFile && !revisionNoticeNumber) {
    redirect("/admin/products/new?error=Enter%20the%20Revision%20Control%20Notice%20Number%20for%20the%20selected%20PDF.");
  }

  if (!hasRevisionNoticeFile && (revisionNoticeNumber || revisionNoticeTitle)) {
    redirect("/admin/products/new?error=Choose%20a%20Revision%20Control%20Notice%20PDF%20or%20clear%20the%20Revision%20Control%20Notice%20fields.");
  }

  let aktBytes: Uint8Array | null = null;
  if (hasAktFile) {
    const normalizedType = aktFile.type.trim().toLowerCase();
    const allowedMime =
      !normalizedType ||
      normalizedType === "application/pdf" ||
      normalizedType === "application/octet-stream";

    if (!allowedMime || !aktFile.name.toLowerCase().endsWith(".pdf")) {
      redirect("/admin/products/new?error=AKT%20Specifications%20must%20be%20PDF%20files.");
    }

    if (aktFile.size > MAX_PUBLIC_PDF_UPLOAD_BYTES) {
      redirect("/admin/products/new?error=AKT%20Specification%20PDFs%20must%20be%2012%20MB%20or%20smaller.");
    }

    aktBytes = new Uint8Array(await aktFile.arrayBuffer());
    if (Buffer.from(aktBytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
      redirect("/admin/products/new?error=The%20selected%20AKT%20Specification%20is%20not%20a%20valid%20PDF.");
    }
  }

  let revisionNoticeBytes: Uint8Array | null = null;
  if (hasRevisionNoticeFile) {
    const normalizedType = revisionNoticeFile.type.trim().toLowerCase();
    const allowedMime =
      !normalizedType ||
      normalizedType === "application/pdf" ||
      normalizedType === "application/octet-stream";

    if (!allowedMime || !revisionNoticeFile.name.toLowerCase().endsWith(".pdf")) {
      redirect("/admin/products/new?error=Revision%20Control%20Notices%20must%20be%20PDF%20files.");
    }

    if (revisionNoticeFile.size > MAX_PUBLIC_PDF_UPLOAD_BYTES) {
      redirect("/admin/products/new?error=Revision%20Control%20Notice%20PDFs%20must%20be%2012%20MB%20or%20smaller.");
    }

    revisionNoticeBytes = new Uint8Array(await revisionNoticeFile.arrayBuffer());
    if (
      Buffer.from(revisionNoticeBytes.subarray(0, 5)).toString("ascii") !== "%PDF-"
    ) {
      redirect("/admin/products/new?error=The%20selected%20Revision%20Control%20Notice%20is%20not%20a%20valid%20PDF.");
    }
  }

  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from("products")
    .insert({
      part_number: partNumber,
      description,
      current_engineering_revision: engineeringRevision,
      work_instruction_number: workInstruction || null,
      final_inspection_part_number: finalInspectionPartNumber || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !product) {
    redirect(`/admin/products/new?error=${encodeURIComponent(error?.message ?? "Unable to create product.")}`);
  }

  if (hasAktFile && aktBytes) {
    try {
      await publishPublicAktSpecification({
        partNumber,
        documentNumber: aktDocumentNumber,
        title: aktTitle,
        originalFileName: aktFile.name,
        bytes: aktBytes,
      });
    } catch (uploadError) {
      console.error("AKT specification upload failed after product creation.", uploadError);
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Could not save the AKT specification to SERVER04.";
      redirect(
        `/admin/products/${encodeURIComponent(product.id)}?error=${encodeURIComponent(
          `Product created, but the AKT Specification was not uploaded: ${message}`,
        )}`,
      );
    }
  }

  if (hasRevisionNoticeFile && revisionNoticeBytes) {
    try {
      await publishPublicRevisionControlNotice({
        partNumber,
        documentNumber: revisionNoticeNumber,
        title: revisionNoticeTitle,
        originalFileName: revisionNoticeFile.name,
        bytes: revisionNoticeBytes,
      });
    } catch (uploadError) {
      console.error(
        "Revision Control Notice upload failed after product creation.",
        uploadError,
      );
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Could not save the Revision Control Notice to SERVER04.";
      redirect(
        `/admin/products/${encodeURIComponent(product.id)}?error=${encodeURIComponent(
          `Product created, but the Eagle Tech Revision Control Notice was not uploaded: ${message}`,
        )}`,
      );
    }
  }

  redirect(`/p/${encodeURIComponent(partNumber)}`);
}


export async function updateProductMetadata(formData: FormData) {
  await requireRole(["engineering", "document_control", "administrator"]);

  if (isDemoMode) {
    redirect("/admin?error=Disable%20demo%20mode%20to%20edit%20controlled%20product%20records.");
  }

  const productId = String(formData.get("productId") ?? "").trim();
  const partNumber = String(formData.get("partNumber") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const engineeringRevision = String(formData.get("engineeringRevision") ?? "").trim();
  const workInstruction = String(formData.get("workInstruction") ?? "").trim();
  const finalInspectionPartNumber = String(formData.get("finalInspectionPartNumber") ?? "").trim();

  if (!productId || !partNumber || !description || !engineeringRevision) {
    redirect(
      `/admin/products/${encodeURIComponent(productId)}?error=${encodeURIComponent(
        "Part number, description, and engineering revision are required.",
      )}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      part_number: partNumber,
      description,
      current_engineering_revision: engineeringRevision,
      work_instruction_number: workInstruction || null,
      final_inspection_part_number: finalInspectionPartNumber || null,
    })
    .eq("id", productId);

  if (error) {
    redirect(
      `/admin/products/${encodeURIComponent(productId)}?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/admin/products/${encodeURIComponent(productId)}?updated=1`);
}
