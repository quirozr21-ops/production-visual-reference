import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getControlledProduct } from "@/lib/data/revisions";

export default async function RevisionHistoryPage({ params }: { params: Promise<{ productId: string }> }) {
  await requireRole(["quality", "engineering", "document_control", "administrator"]);
  const { productId } = await params;
  const product = await getControlledProduct(productId);
  if (!product) notFound();

  return (
    <main className="shell stack">
      <Link href={`/admin/products/${product.id}`}>← Product workspace</Link>
      <section className="card">
        <div className="eyebrow">HISTORICAL CONTROL RECORD</div>
        <h1>{product.part_number}</h1>
        <h2>Visual Revision History</h2>
        <p className="muted">
          Historical revisions are retained for traceability. Production operators do not use this screen to determine current status.
        </p>
      </section>

      <section className="card">
        <div className="timeline">
          {product.revisions.map((revision) => (
            <article className="timeline-item" key={revision.id}>
              <div>
                <strong>Rev {revision.revision_code}</strong>
                <div className="muted">{revision.ecn_number ? `ECN ${revision.ecn_number}` : "No ECN recorded"}</div>
              </div>
              <div>
                <strong>{revision.status.replaceAll("_", " ")}</strong>
                <div className="muted">{revision.asset_count} photo{revision.asset_count === 1 ? "" : "s"}</div>
              </div>
              <div>
                <div>Created {new Date(revision.created_at).toLocaleString()}</div>
                {revision.approved_at ? <div className="muted">Approved {new Date(revision.approved_at).toLocaleString()}</div> : null}
                {revision.rejected_at ? <div className="muted">Rejected {new Date(revision.rejected_at).toLocaleString()}</div> : null}
              </div>
              <Link className="button secondary small" href={`/admin/revisions/${revision.id}`}>View Revision</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
