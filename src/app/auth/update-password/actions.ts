"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 12) {
    redirect(`/auth/update-password?error=${encodeURIComponent("Use a password with at least 12 characters.")}`);
  }

  if (password !== confirmPassword) {
    redirect(`/auth/update-password?error=${encodeURIComponent("Passwords do not match.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/update-password?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect("/auth/login?passwordUpdated=1");
}
