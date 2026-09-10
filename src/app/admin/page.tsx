import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getDashboardMetrics, getDashboardProducts } from "@/lib/data/dashboard";

export default async function AdminDashboard() {
  const user = await requireRole(["quality", "engineering", "document_control", "administrator"]);
  const [metrics, products] = await Promise.all([getDashboardMetrics(), getDashboardProducts()]);

  const cards = [
    ["Current References", metrics.current],
    ["Draft References", metrics.drafts],
    ["Awaiting Approval", metrics.awaitingApproval],
    ["Revision Mismatches", metrics.mismatches],
    ["Obsolete References", metrics.obsolete],
    ["Missing Visual References", metrics.missingVisuals],
  ] as const;
  const canAuthor = user.role === "engineering" || user.role === "administrator";
  const canQuality = user.role === "quality" || user.role === "administrator";

  return (
    <main className="shell stack">
      <div>
        <Link href="/">← Operator Search</Link>
        <h1 style={{ marginTop: 12 }}>Engineering & Quality Dashboard</h1>
        <p className="muted">Signed in role: {user.role.replaceAll("_", " ")}</p>
      </div>

      <div className="grid">
        {cards.map(([label, value]) => (
          <section className="card" key={label}>
            <div className="muted">{label}</div>
            <div className="metric">{value}</div>
          </section>
        ))}
      </div>

      <section className="card">
        <h2>Controlled Actions</h2>
        <div className="action-row">
          {canAuthor ? <Link className="button" href="/admin/products/new">Create Product</Link> : null}
          {canQuality ? <Link className="button secondary" href="/admin/quality">Quality Approval Queue ({metrics.awaitingApproval})</Link> : null}
        </div>
      </section>

      <section className="card">
        <div className="toolbar">
          <div>
            <h2>Products</h2>
            <p className="muted">Open a controlled product record to author or review revisions.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Part Number</th><th>Description</th><th>Eng Rev</th><th>Visual Rev</th><th>State</th><th></th></tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const state = !product.current_approved_visual_revision
                  ? "Missing visual"
                  : product.current_engineering_revision === product.current_approved_visual_revision
                    ? "Current"
                    : "Mismatch";
                return (
                  <tr key={product.id}>
                    <td><strong>{product.part_number}</strong></td>
                    <td>{product.description}</td>
                    <td>{product.current_engineering_revision ?? "—"}</td>
                    <td>{product.current_approved_visual_revision ?? "—"}</td>
                    <td>{state}</td>
                    <td><Link href={`/admin/products/${product.id}`}>Manage</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
