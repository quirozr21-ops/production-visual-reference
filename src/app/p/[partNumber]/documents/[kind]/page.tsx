import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductReference } from "@/lib/data/products";
import { findPublicPdf, isPublicPdfKind } from "@/lib/public-pdf-documents";

export const dynamic = "force-dynamic";

export default async function PublicPdfPreview({
  params,
}: {
  params: Promise<{ partNumber: string; kind: string }>;
}) {
  const { partNumber, kind } = await params;
  if (!isPublicPdfKind(kind)) notFound();

  const product = await getProductReference(partNumber);
  if (
    !product ||
    product.status !== "active" ||
    !product.current_approved_visual_revision
  ) {
    notFound();
  }

  const number =
    kind === "work-instruction"
      ? product.work_instruction_number
      : product.final_inspection_part_number;
  if (!number) notFound();

  const available = Boolean(await findPublicPdf(kind, number));
  const label = kind === "work-instruction"
    ? "Functional Work Instructions Part Number"
    : "Final Inspection";
  const source = `/api/public-documents/${encodeURIComponent(product.part_number)}/${kind}`;

  return (
    <main className="shell stack">
      <section className="card stack">
        <Link className="button secondary" href={`/p/${encodeURIComponent(product.part_number)}`}>
          Back to Visual Reference
        </Link>
        <div>
          <div className="eyebrow">RELEASED DOCUMENT PREVIEW</div>
          <h1>{label}</h1>
          <p className="muted">
            Document {number} · Product {product.part_number}
          </p>
        </div>
        {available ? (
          <>
            <a className="button" href={source} target="_blank" rel="noopener noreferrer">
              Open PDF directly
            </a>
            <iframe
              title={`${label} ${number} PDF preview`}
              src={source}
              style={{
                width: "100%",
                height: "75vh",
                minHeight: "420px",
                border: "1px solid var(--border)",
                borderRadius: "12px",
              }}
            />
            <p className="muted">
              If your phone does not display the embedded PDF, tap Open PDF directly.
            </p>
          </>
        ) : (
          <p className="status warning">
            No released PDF is currently linked to this document number.
          </p>
        )}
        <p className="disclaimer">
          Verify that this is the current released document before use.
        </p>
      </section>
    </main>
  );
}
