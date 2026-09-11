import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  if (isDemoMode) {
    return NextResponse.json({ error: "Demo assets do not have stored images." }, { status: 404 });
  }

  const { assetId } = await params;
  const supabase = await createClient();

  // RLS permits anonymous access only when this asset belongs to the current
  // approved visual revision and the asset itself is approved.
  const { data: asset, error } = await supabase
    .from("visual_assets")
    .select("storage_path")
    .eq("id", assetId)
    .single();

  if (error || !asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Storage RLS re-checks the same approved/current relationship before a
  // short-lived signed URL is created.
  const { data, error: signError } = await supabase.storage
    .from("visual-references")
    .createSignedUrl(asset.storage_path, 60);

  if (signError || !data?.signedUrl) {
    return NextResponse.json({ error: "Image unavailable" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
  });
}
