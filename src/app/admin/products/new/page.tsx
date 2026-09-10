import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { createProduct } from "../actions";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["engineering", "document_control", "administrator"]);
  const params = await searchParams;

  return (
    <main className="shell stack">
      <Link href="/admin">← Dashboard</Link>
      <section className="card" style={{ maxWidth: 720 }}>
        <h1>Create Product Record</h1>
        <p className="muted">
          Create the permanent part-number record. The engineering revision is tracked separately from the approved visual revision.
        </p>

        {isDemoMode ? (
          <div className="status warning">
            Demo mode is active. Configure Supabase and disable demo mode before creating controlled records.
          </div>
        ) : null}

        {params.error ? <div className="status danger">{params.error}</div> : null}

        <form action={createProduct} className="search-form" style={{ marginTop: 18 }}>
          <label>
            Part Number
            <input className="input" name="partNumber" required placeholder="0241-75484" />
          </label>
          <label>
            Description
            <input className="input" name="description" required placeholder="Quick Connect Assembly" />
          </label>
          <label>
            Current Engineering Revision
            <input className="input" name="engineeringRevision" required placeholder="5" />
          </label>
          <label>
            Work Instruction Number
            <input className="input" name="workInstruction" placeholder="0010-xxxxx" />
          </label>
          <button className="button" type="submit" disabled={isDemoMode}>
            Create Product
          </button>
        </form>
      </section>
    </main>
  );
}
