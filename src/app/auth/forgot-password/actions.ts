"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect(`/auth/forgot-password?error=${encodeURIComponent("Enter your email address.")}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`,
  });

  if (error) {
    redirect(`/auth/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/forgot-password?sent=1");
}
