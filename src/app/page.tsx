import Link from "next/link";
import { ProductSearch } from "@/components/product-search";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";

export default async function Home() {
  await requireUser("/");

  return (
    <main className="shell stack">
      <section className="card">
        <h1>Find a Product</h1>
        <p className="muted">
          Scan the permanent QR code or enter a part number. The system determines the current approved visual revision automatically.
        </p>
        <ProductSearch />
      </section>

      {isDemoMode ? (
        <section className="card">
          <h2>Demo products</h2>
          <div className="grid">
            <Link className="button secondary" href="/p/0241-75484">
              0241-75484 — Current
            </Link>
            <Link className="button secondary" href="/p/0190-02918-001">
              0190-02918-001 — Mismatch demo
            </Link>
          </div>
        </section>
      ) : null}

      <section className="disclaimer">
        Production visual references are aids only. Released drawings, BOMs, work instructions, inspection documentation, and ECNs remain the controlled engineering sources unless company procedures explicitly state otherwise.
      </section>
    </main>
  );
}
