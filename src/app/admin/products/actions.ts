"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
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

  if (!partNumber || !description || !engineeringRevision) {
    redirect("/admin/products/new?error=Part%20number%2C%20description%2C%20and%20engineering%20revision%20are%20required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    part_number: partNumber,
    description,
    current_engineering_revision: engineeringRevision,
    work_instruction_number: workInstruction || null,
    created_by: user.id,
  });

  if (error) {
    redirect(`/admin/products/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/p/${encodeURIComponent(partNumber)}`);
}
