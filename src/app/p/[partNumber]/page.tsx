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
  if (!product) notFound();

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
        <div className="muted">PART NUMBER</div>
        <h1>{product.part_number}</h1>
        <h2>{product.description}</h2>
        <dl className="meta">
          <dt>Engineering Rev</dt><dd>{product.current_engineering_revision ?? "Not set"}</dd>
          <dt>Approved Visual Rev</dt><dd>{product.current_approved_visual_revision ?? "None"}</dd>
          <dt>Product Family</dt><dd>{product.product_family ?? "—"}</dd>
          <dt>ECN</dt><dd>{product.ecn_number ?? "—"}</dd>
          <dt>Work Instruction</dt><dd>{product.work_instruction_number ?? "—"}</dd>
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
        <ReferenceGallery assets={product.assets} />
      </section>

      <section className="card">
        <h2>QR Label</h2>
        <p className="muted">This permanent QR resolves the current approved revision when scanned.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/qr/${encodeURIComponent(product.part_number)}`}
          alt={`QR code for ${product.part_number}`}
          style={{ width: 220, maxWidth: "100%" }}
        />
      </section>

      <section className="disclaimer">
        PRODUCTION AID — Verify all requirements against released engineering documentation.
      </section>
    </main>
  );
}
