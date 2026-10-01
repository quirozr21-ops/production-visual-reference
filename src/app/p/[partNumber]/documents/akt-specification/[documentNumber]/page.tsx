import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductReference } from "@/lib/data/products";
import { listPublicAktSpecifications } from "@/lib/public-pdf-documents";

export const dynamic = "force-dynamic";

export default async function AktSpecificationPreview({
  params,
}: {
  params: Promise<{ partNumber: string; documentNumber: string }>;
}) {
  const { partNumber, documentNumber } = await params;
  const product = await getProductReference(partNumber);

  if (
    !product ||
    product.status !== "active" ||
    !product.current_approved_visual_revision
  ) {
    notFound();
  }

  const specifications = await listPublicAktSpecifications(product.part_number);
  const specification = specifications.find(
    (candidate) => candidate.documentNumber === documentNumber,
  );
  if (!specification) notFound();

  const source = `/api/public-documents/${encodeURIComponent(product.part_number)}/akt-specification/${encodeURIComponent(specification.documentNumber)}`;

  return (
    <main className="shell stack">
      <section className="card stack">
        <Link
          className="button secondary"
          href={`/p/${encodeURIComponent(product.part_number)}`}
        >
          Back to Visual Reference
        </Link>

        <div>
          <div className="eyebrow">ENGINEERING SPECIFICATION</div>
          <h1>AKT SPECIFICATION</h1>
          <p className="muted">
            Document {specification.documentNumber}
            {specification.title ? ` · ${specification.title}` : ""}
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
          title={`AKT Specification ${specification.documentNumber} PDF preview`}
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
          Verify that this is the current released engineering specification before use.
        </p>
      </section>
    </main>
  );
}
