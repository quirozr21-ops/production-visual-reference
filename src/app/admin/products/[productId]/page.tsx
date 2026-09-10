import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getControlledProduct } from "@/lib/data/revisions";

function statusClass(status: string) {
  if (status === "approved") return "status success compact";
  if (status === "awaiting_approval") return "status warning compact";
  if (status === "rejected") return "status danger compact";
  return "status neutral compact";
}

export default async function ControlledProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const user = await requireRole(["quality", "engineering", "document_control", "administrator"]);
  const { productId } = await params;
  const product = await getControlledProduct(productId);
  if (!product) notFound();

  const canAuthor = user.role === "engineering" || user.role === "administrator";

  return (
    <main className="shell stack">
      <div className="toolbar">
        <Link href="/admin">← Dashboard</Link>
        <Link className="button secondary small" href={`/p/${encodeURIComponent(product.part_number)}`}>
          Operator View
        </Link>
      </div>

      <section className="card">
        <div className="eyebrow">CONTROLLED PRODUCT RECORD</div>
        <h1>{product.part_number}</h1>
        <h2>{product.description}</h2>
        <dl className="meta">
          <dt>Engineering Rev</dt><dd>{product.current_engineering_revision ?? "Not set"}</dd>
          <dt>Approved Visual Rev</dt><dd>{product.current_approved_visual_revision ?? "None"}</dd>
          <dt>Work Instruction</dt><dd>{product.work_instruction_number ?? "—"}</dd>
          <dt>Status</dt><dd>{product.status}</dd>
        </dl>
      </section>

      <section className="card">
        <div className="toolbar">
          <div>
            <h2>Revision Workspace</h2>
            <p className="muted">Engineering authors revisions here. Quality controls approval.</p>
          </div>
          {canAuthor ? (
            <Link className="button" href={`/admin/products/${product.id}/revisions/new`}>
              Create Revision
            </Link>
          ) : null}
        </div>

        {product.revisions.length === 0 ? (
          <p className="muted">No visual-reference revisions have been created yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Revision</th>
                  <th>ECN</th>
                  <th>Status</th>
                  <th>Photos</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {product.revisions.map((revision) => (
                  <tr key={revision.id}>
                    <td><strong>{revision.revision_code}</strong></td>
                    <td>{revision.ecn_number ?? "—"}</td>
                    <td><span className={statusClass(revision.status)}>{revision.status.replaceAll("_", " ")}</span></td>
                    <td>{revision.asset_count}</td>
                    <td>{new Date(revision.created_at).toLocaleDateString()}</td>
                    <td><Link href={`/admin/revisions/${revision.id}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Link href={`/admin/products/${product.id}/history`}>View complete revision history →</Link>
        </div>
      </section>
    </main>
  );
}
