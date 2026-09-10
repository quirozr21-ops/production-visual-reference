import QRCode from "qrcode";
import { appUrl } from "@/lib/config";
import { buildPermanentProductUrl } from "@/lib/qr";
import { requireUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partNumber: string }> },
) {
  await requireUser();
  const { partNumber } = await params;
  const decoded = decodeURIComponent(partNumber).trim();

  // Permanent product URL only: no revision, credentials, tokens, or image links.
  const target = buildPermanentProductUrl(appUrl, decoded);
  const svg = await QRCode.toString(target, {
    type: "svg",
    margin: 2,
    width: 512,
    errorCorrectionLevel: "M",
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${decoded}-visual-reference-qr.svg"`,
    },
  });
}
