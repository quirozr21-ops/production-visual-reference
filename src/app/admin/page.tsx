import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/data/dashboard";

export default async function AdminDashboard() {
  await requireRole(["quality", "engineering", "document_control", "administrator"]);
  const metrics = await getDashboardMetrics();

  const cards = [
    ["Current References", metrics.current],
    ["Draft References", metrics.drafts],
    ["Awaiting Approval", metrics.awaitingApproval],
    ["Revision Mismatches", metrics.mismatches],
    ["Obsolete References", metrics.obsolete],
    ["Missing Visual References", metrics.missingVisuals],
  ] as const;

  return (
    <main className="shell stack">
      <div>
        <Link href="/">← Operator Search</Link>
        <h1 style={{ marginTop: 12 }}>Engineering & Quality Dashboard</h1>
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
        <div className="grid">
          <Link className="button" href="/admin/products/new">Create Product</Link>
        </div>
      </section>

      <section className="card">
        <h2>Approval Queue</h2>
        <p className="muted">
          The schema and workflow functions are ready. The interactive approval queue is the next implementation slice.
        </p>
      </section>
    </main>
  );
}
