import Link from "next/link";
import { notFound } from "next/navigation";
import { ReferenceGallery } from "@/components/reference-gallery";
import { StatusBanner } from "@/components/status-banner";
import { requireUser } from "@/lib/auth";
import { getProductReference } from "@/lib/data/products";
import { getReferenceState } from "@/lib/reference-state";

export default async function ProductReferencePage({
  params,
}: {
  params: Promise<{ partNumber: string }>;
}) {
  const { partNumber } = await params;
  const decoded = decodeURIComponent(partNumber);
  await requireUser(`/p/${encodeURIComponent(decoded)}`);

  const product = await getProductReference(decoded);
  if (!product || product.status !== "active") notFound();

  const state = getReferenceState(
    product.current_engineering_revision,
    product.current_approved_visual_revision,
  );

  return (
    <main className="shell stack">
      <Link href="/">← Search another product</Link>

      <StatusBanner
        state={state}
        engineeringRevision={product.current_engineering_revision}
        approvedVisualRevision={product.current_approved_visual_revision}
      />

      <section className="card">
        <div className="eyebrow">PRODUCTION VISUAL REFERENCE</div>
        <div className="muted">PART NUMBER</div>
        <h1>{product.part_number}</h1>
        <h2>{product.description}</h2>
        <dl className="meta">
          <dt>Engineering Revision</dt>
          <dd>{product.current_engineering_revision ?? "Not set"}</dd>
          <dt>Approved Visual Revision</dt>
          <dd>{product.current_approved_visual_revision ?? "None"}</dd>
        </dl>
      </section>

      {product.critical_quality_notes ? (
        <section className="card">
          <h2>Critical Quality Notes</h2>
          <p>{product.critical_quality_notes}</p>
        </section>
      ) : null}

      <section className="card">
        <h2>Approved Visual References</h2>
        {product.current_approved_visual_revision ? (
          <ReferenceGallery assets={product.assets} />
        ) : (
          <div className="status danger">
            No approved visual reference is available. Follow released engineering documentation.
          </div>
        )}
      </section>

      <section className="disclaimer">
        PRODUCTION AID — Released engineering documentation remains authoritative.
      </section>
    </main>
  );
}
