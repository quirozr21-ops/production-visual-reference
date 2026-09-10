import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/reference-state";

export type CurrentUser = {
  id: string;
  email?: string;
  role: AppRole;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isDemoMode) {
    return {
      id: "demo-admin",
      email: "demo@local",
      role: "administrator",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const userId = data.claims.sub;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile?.role) return null;

  return {
    id: userId,
    email: typeof data.claims.email === "string" ? data.claims.email : undefined,
    role: profile.role as AppRole,
  };
}

export async function requireUser(nextPath?: string) {
  const user = await getCurrentUser();
  if (!user) {
    const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/auth/login${suffix}`);
  }
  return user;
}

export async function requireRole(roles: AppRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
