import { readFile } from "node:fs/promises";
import { getProductReference } from "@/lib/data/products";
import { findPublicRevisionControlNoticePdf } from "@/lib/public-pdf-documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ partNumber: string; documentNumber: string }>;
  },
) {
  const { partNumber, documentNumber } = await params;
  const product = await getProductReference(partNumber);

  if (
    !product ||
    product.status !== "active" ||
    !product.current_approved_visual_revision
  ) {
    return new Response("Document not found", { status: 404 });
  }

  const file = await findPublicRevisionControlNoticePdf(
    product.part_number,
    documentNumber,
  );
  if (!file) return new Response("Document not available", { status: 404 });

  try {
    const bytes = await readFile(file);
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return new Response("Document not available", { status: 404 });
    }

    const safeName = documentNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (error) {
    console.error("Unable to read released Revision Control Notice.", error);
    return new Response("Document not available", { status: 404 });
  }
}
