import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getControlledProduct } from "@/lib/data/revisions";
import { isDemoMode } from "@/lib/config";
import { createRevision } from "@/app/admin/revisions/actions";

export default async function NewRevisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["engineering", "administrator"]);
  const [{ productId }, query] = await Promise.all([params, searchParams]);
  const product = await getControlledProduct(productId);
  if (!product) notFound();

  return (
    <main className="shell stack">
      <Link href={`/admin/products/${product.id}`}>← {product.part_number}</Link>
      <section className="card" style={{ maxWidth: 760 }}>
        <div className="eyebrow">NEW VISUAL REVISION</div>
        <h1>{product.part_number}</h1>
        <p className="muted">
          The new visual revision begins as Draft. Production cannot see it until Quality approves it.
        </p>

        {isDemoMode ? <div className="status warning">Demo mode is read-only.</div> : null}
        {query.error ? <div className="status danger">{query.error}</div> : null}

        <form action={createRevision} className="search-form" style={{ marginTop: 18 }}>
          <input type="hidden" name="productId" value={product.id} />
          <label>
            Revision Code
            <input className="input" name="revisionCode" required placeholder="6" />
          </label>
          <label>
            ECN Number
            <input className="input" name="ecnNumber" placeholder="3180001" />
          </label>
          <label>
            Critical Quality Notes
            <textarea className="input textarea" name="criticalQualityNotes" rows={5} placeholder="Describe visual checkpoints and quality-sensitive areas." />
          </label>
          <button className="button" type="submit" disabled={isDemoMode}>Create Draft Revision</button>
        </form>
      </section>
    </main>
  );
}
