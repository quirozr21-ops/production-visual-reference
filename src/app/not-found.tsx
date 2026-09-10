import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <section className="card">
        <h1>Product not found</h1>
        <p>Check the part number or return to search.</p>
        <Link className="button" href="/">Return to Search</Link>
      </section>
    </main>
  );
}
