export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
