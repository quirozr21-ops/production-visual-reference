import { readFile } from "node:fs/promises";
import { getProductReference } from "@/lib/data/products";
import { findPublicPdf, isPublicPdfKind } from "@/lib/public-pdf-documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partNumber: string; kind: string }> },
) {
  const { partNumber, kind } = await params;
  if (!isPublicPdfKind(kind)) {
    return new Response("Document not found", { status: 404 });
  }

  const product = await getProductReference(partNumber);
  if (
    !product ||
    product.status !== "active" ||
    !product.current_approved_visual_revision
  ) {
    return new Response("Document not found", { status: 404 });
  }

  const number =
    kind === "work-instruction"
      ? product.work_instruction_number
      : product.final_inspection_part_number;

  if (!number) return new Response("Document not found", { status: 404 });

  const file = await findPublicPdf(kind, number);
  if (!file) return new Response("Document not available", { status: 404 });

  try {
    const bytes = await readFile(file);
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return new Response("Document not available", { status: 404 });
    }

    const safeName = number.replace(/[^a-zA-Z0-9_-]/g, "_");
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
    console.error("Unable to read released public PDF.", error);
    return new Response("Document not available", { status: 404 });
  }
}
