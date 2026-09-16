import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import {
  hasServerImageStorage,
  imageContentType,
  readServerImage,
} from "@/lib/server-image-storage";
import { createClient } from "@/lib/supabase/server";

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

  // During the migration period, approved images are served from the company
  // server first. Existing Supabase Storage images remain available as a fallback.
  if (hasServerImageStorage()) {
    try {
      const bytes = await readServerImage(asset.storage_path);
      if (bytes) {
        return new NextResponse(new Uint8Array(bytes), {
          headers: {
            "Content-Type": imageContentType(asset.storage_path),
            "Cache-Control": "public, max-age=30, s-maxage=30",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    } catch (storageError) {
      console.error("Company server image read failed", storageError);
    }
  }

  // Existing cloud images continue to work until they are migrated and verified.
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
