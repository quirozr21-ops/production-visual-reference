import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductReference } from "@/lib/data/products";
import { listPublicAktWiringDiagrams } from "@/lib/public-pdf-documents";

export const dynamic = "force-dynamic";

export default async function AktWiringDiagramPreview({
  params,
}: {
  params: Promise<{ partNumber: string; documentNumber: string }>;
}) {
  const { partNumber, documentNumber } = await params;
  const decodedDocumentNumber = decodeURIComponent(documentNumber);
  const product = await getProductReference(partNumber);

  if (
    !product ||
    product.status !== "active" ||
    !product.current_approved_visual_revision
  ) {
    notFound();
  }

  const diagrams = await listPublicAktWiringDiagrams(product.part_number);
  const diagram = diagrams.find(
    (candidate) => candidate.documentNumber === decodedDocumentNumber,
  );
  if (!diagram) notFound();

  const source = `/api/public-documents/${encodeURIComponent(product.part_number)}/akt-wiring-diagram/${encodeURIComponent(diagram.documentNumber)}`;

  return (
    <main className="shell stack">
      <section className="card stack">
        <Link
          className="button secondary"
          href={`/p/${encodeURIComponent(product.part_number)}`}
        >
          Back to Production References
        </Link>

        <div>
          <div className="eyebrow">ENGINEERING WIRING DOCUMENTATION</div>
          <h1>AKT Wiring Diagram Part Number</h1>
          <p className="muted">
            Document {diagram.documentNumber}
            {diagram.title ? ` · ${diagram.title}` : ""}
            {" · "}Product {product.part_number}
          </p>
        </div>

        <a
          className="button"
          href={source}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open PDF directly
        </a>

        <iframe
          title={`AKT Wiring Diagram ${diagram.documentNumber} PDF preview`}
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

        <p className="disclaimer">
          Verify that this is the current released wiring diagram before use.
        </p>
      </section>
    </main>
  );
}
